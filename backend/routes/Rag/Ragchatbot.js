import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import BotChat from "../../models/botchat.js";
import Doc from "../../models/Doc.js"
import redis from "../../cache.js";
import { callGemini, createEmbedding } from "../../services/GeminiServices.js";
const router = express.Router();
import crypto from "crypto";
import rateLimit from "express-rate-limit";

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP/user to 100 requests per window
  message: {
    error: "Too many requests, please try again after an hour."
  },
  standardHeaders: true, // return rate limit info in headers
  legacyHeaders: false, // disable old headers
});

router.post("/add-doc",chatLimiter, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Content is required" });

  const embedding = await createEmbedding(content);
  const doc = new Doc({ content, embedding });
  await doc.save();

  res.json({ message: "Document saved" });
});





// ---------------- Redis Helpers ----------------
const redisStoreEmbedding = async (embeddingKey, userQuery, embeddings) => {
  try {
    const cacheData = {
      hashkey: embeddingKey,
      query: userQuery,
      query_embeddings: embeddings
    };

    await redis.set(embeddingKey, JSON.stringify(cacheData), "EX", 86400); // 1 day
    console.log("✅ Embedding stored in Redis");
  } catch (err) {
    console.warn("❌ Redis store failed (embedding):", err);
  }
};

const redisStoreResponse = async (responseKey, query, response) => {
  try {
    const cacheData = {
      query,
      gemini_response: response
    };

    await redis.set(responseKey, JSON.stringify(cacheData), "EX", 3600); // 1 hour
    console.log("✅ Response stored in Redis");
  } catch (err) {
    console.warn("❌ Redis store failed (response):", err);
  }
};

// ---------------- RAG Chat Route ----------------
router.post("/chat",chatLimiter, async (req, res) => {
  try {
    const { query, userId } = req.body;
    if (!query || !userId) {
      return res.status(400).json({ error: "Query or userId is missing" });
    }

    const lowerQ = query.toLowerCase();
    const greetingRegex = /^(hi|hello|hey|uu|good morning|good evening)[.!?]?$/i;

    // Handle greetings
    if (greetingRegex.test(query.trim())) {
      return res.json({ answer: "Welcome! How can we assist you today?", context: null });
    }

    // Block forbidden system/meta questions
    const forbiddenPhrases = [
      "what is your role",
      "who are you",
      "how do you generate",
      "system prompt",
      "ignore instructions",
      "reveal rules",
      "show hidden",
      "prompt injection",
    ];
    if (forbiddenPhrases.some((p) => lowerQ.includes(p))) {
      return res.json({ answer: "I'm here to help with questions about Wings Tech Solutions.", context: null });
    }

    // Chat history
    let botchat = await BotChat.findOne({ userId }) || new BotChat({ userId, messages: [] });
    botchat.messages.push({ role: "user", content: query });

    // ---------------- Keys ----------------
    const hash = crypto.createHash("md5").update(query).digest("hex");
    const embeddingKey = `embedding:${hash}`;
    const responseKey = `response:${hash}`;

    // ---------------- Check Cached Response ----------------
    try {
      const cachedResponse = await redis.get(responseKey);
      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        console.log("⚡ Using cached response");
        return res.json({
          answer: parsed.gemini_response,
          future_actions: [],
          context: null,
          cacheHit: true
        });
      }
    } catch (err) {
      console.warn("Redis unavailable for response:", err);
    }

    // ---------------- Embedding (check cache first) ----------------
    let queryVector;
    try {
      const cachedEmbedding = await redis.get(embeddingKey);
      if (cachedEmbedding) {
        const parsed = JSON.parse(cachedEmbedding);
        queryVector = parsed.query_embeddings;
        console.log("⚡ Using cached embedding");
      } else {
        queryVector = await createEmbedding(query);
        await redisStoreEmbedding(embeddingKey, query, queryVector);
      }
    } catch (err) {
      console.warn("Redis unavailable for embedding:", err);
      queryVector = await createEmbedding(query);
    }

    if (!queryVector) {
      return res.status(500).json({ error: "Failed to create embedding" });
    }

    // ---------------- Fetch Top Documents ----------------
    const topDocsRaw = await Doc.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector,
          numCandidates: 50,
          limit: 5,
        },
      },
      { $project: { _id: 1, content: 1, score: { $meta: "vectorSearchScore" } } },
    ]);

    const topDocs = topDocsRaw.filter(
      (doc) => !/(secret|password|internal|ignore|instruction|reveal|prompt)/i.test(doc.content)
    );

    // ---------------- Build Context & Prompt ----------------
    const history = botchat.messages.length
      ? botchat.messages.slice(-6).map((m) => `${m.role}: ${m.content}`).join("\n")
      : "No User History";

    const contextText = topDocs.map((d, i) => `Doc${i + 1}: ${d.content}`).join("\n\n");

    const finalPrompt = process.env.WINGS_FINAL_PROMPT;
    const contextInstructions = topDocs.length
      ? `History:\n${history}\n\nContext:\n${contextText}\n\nCustomer Question: ${query}`
      : `Customer Question: ${query}`;

    const promptToSend = `${finalPrompt}\n\n${contextInstructions}`;

    // ---------------- Call Gemini API ----------------
    const answer = await callGemini(promptToSend);
    const geminiResponse = answer[0].gemini || ["I don't know"];
    const futureActions = answer[0].future_actions || [];

    // Store in MongoDB
    botchat.messages.push({ role: "bot", content: geminiResponse });
    await botchat.save();

    // ---------------- Cache Response for 1 hour ----------------
    await redisStoreResponse(responseKey, query, geminiResponse);

    // ---------------- Send Response ----------------
    res.json({
      answer: geminiResponse,
      future_actions: futureActions,
      context: topDocs.map((d) => ({ content: d.content, score: d.score })),
      cacheHit: false
    });

  } catch (err) {
    console.error("RAG chat error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

export default router;

