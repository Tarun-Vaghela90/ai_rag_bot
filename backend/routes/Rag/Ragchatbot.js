import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import BotChat from "../../models/botchat.js";
import Doc from "../../models/Doc.js"
import redis from "../../cache.js";
import { callGemini, createEmbedding } from "../../services/GeminiServices.js";
const router = express.Router();
import crypto from "crypto";




router.post("/add-doc", async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Content is required" });

  const embedding = await createEmbedding(content);
  const doc = new Doc({ content, embedding });
  await doc.save();

  res.json({ message: "Document saved" });
});



// ---------------- Redis Helper ----------------
const redisStore = async (embeddingKey, embeddings) => {
  try {
    // Convert embeddings array to a string
    const value = JSON.stringify(embeddings);

    // ioredis syntax for expiration
    await redis.set(embeddingKey, value, "EX", 86400); // 1 day

    console.log("Embedding stored in Redis ✅");
  } catch (err) {
    console.warn("Redis store failed:", err);
  }
};

// ---------------- RAG Chat Route ----------------
router.post("/chat", async (req, res) => {
  try {
    const { query, userId } = req.body;
    if (!query || !userId) {
      return res.status(400).json({ error: "Query or userId is missing" });
    }

    const lowerQ = query.toLowerCase();
    const greetings = ["hi", "hello", "hey", "uu", "good evening" , "good morning"];
  const greetingRegex = /^(hi|hello|hey|uu|good morning|good evening)[.!?]?$/i;

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

    // Fetch or create user chat history
    let botchat = await BotChat.findOne({ userId }) || new BotChat({ userId, messages: [] });
    botchat.messages.push({ role: "user", content: query });

    // ---------------- Query Embedding & Redis Cache ----------------
    const hash = crypto.createHash("md5").update(query).digest("hex");
    const embeddingKey = `embedding:${hash}`;

    let queryVector;
    let cachedEmbedding;

    try {
      cachedEmbedding = await redis.get(embeddingKey);
      if (cachedEmbedding) {
        try {
          queryVector = JSON.parse(cachedEmbedding);
        console.log("redis  embeddings  used")
        } catch (err) {
          console.warn("Failed to parse cached embedding, regenerating...");
          queryVector = await createEmbedding(query);
        }
      } else {
        queryVector = await createEmbedding(query);
      }
    } catch (err) {
      console.warn("Redis unavailable, generating embedding directly:", err);
      queryVector = await createEmbedding(query);
    }

    if (!queryVector) {
      return res.status(500).json({ error: "Failed to create embedding" });
    }

    // Only store if cache miss
    if (!cachedEmbedding) await redisStore(embeddingKey, queryVector);

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
      {
        $project: { _id: 1, content: 1, score: { $meta: "vectorSearchScore" } },
      },
    ]);

    // Filter out sensitive documents
    const topDocs = topDocsRaw.filter(
      (doc) => !/(secret|password|internal|ignore|instruction|reveal|prompt)/i.test(doc.content)
    );

    // ---------------- Build Context & History ----------------
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

    // Store bot response
    botchat.messages.push({ role: "bot", content: geminiResponse });
    await botchat.save();

    // ---------------- Send Response ----------------
    res.json({
      answer: geminiResponse,
      future_actions: futureActions,
      context: topDocs.map((d) => ({ content: d.content, score: d.score })),
    });
  } catch (err) {
    console.error("RAG chat error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});




export default router;
