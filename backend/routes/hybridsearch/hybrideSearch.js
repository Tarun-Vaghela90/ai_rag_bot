// routes/chatbot.js
import express from "express";
import Product from "../../models/product.js";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

// ---------------------- Gemini Client ----------------------
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ---------------------- Helper Functions ----------------------

// Call Gemini for text generation
async function callGemini(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text?.trim();
  } catch (err) {
    console.error("Gemini call error:", err);
    return null;
  }
}

// Create embeddings
async function createEmbedding(text) {
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001", // multilingual-capable
      contents: [text],
      outputDimensionality: 3072,
    });
    return response.embeddings[0].values;
  } catch (err) {
    console.error("Embedding error:", err);
    return null;
  }
}

// Translate query to English (if not already)
async function translateToEnglish(text) {
  try {
    const prompt = `Translate the following text to English, but only if it's not already in English. 
Return only the translated text without explanation.
Text: "${text}"`;

    const response = await callGemini(prompt);
    return response || text;
  } catch (err) {
    console.error("Translation error:", err);
    return text;
  }
}

// ---------------------- Chat Route ----------------------
router.post("/chat", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    // ✅ Greetings
    const greetings = ["hi", "hello", "hey", "good morning", "good evening"];
    if (greetings.includes(query.toLowerCase())) {
      return res.json({
        answer: "Hello! How can I help you today?",
        context: null,
      });
    }

    // ✅ Translate query (multilingual support)
    const translatedQuery = await translateToEnglish(query);
    const lowerQ = translatedQuery.toLowerCase();

    // ✅ Price detection
    const priceMatch = lowerQ.match(/(?:under|below|less than)\s*(\d+)/i);
    if (priceMatch) {
      const priceLimit = parseInt(priceMatch[1], 10);

      const products = await Product.find({ price: { $lte: priceLimit } })
        .sort({ price: 1 })
        .limit(5)
        .select("title price description");

      return res.json({
        answer: products.length
          ? products.map((p) => `${p.title} (Price: ${p.price})`).join(", ")
          : `No products found under ${priceLimit}`,
        context: products,
      });
    }

    // ✅ Semantic Search
    const queryVector = await createEmbedding(translatedQuery);
    if (!queryVector)
      return res.status(500).json({ error: "Failed to create embedding" });

    const semanticResults = await Product.aggregate([
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
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          price: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    // ✅ Keyword Search
    const keywordResults = await Product.find(
      { $text: { $search: translatedQuery } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(5)
      .select("title price description");

    // ✅ Merge Hybrid Results
    const hybridResults = [...semanticResults, ...keywordResults].slice(0, 5);

    // ✅ Build context
    const contextText = hybridResults
      .map(
        (d, i) => `Doc${i + 1}:
Title: ${d.title || "N/A"}
Description: ${d.description || "N/A"}
Price: ${d.price || "N/A"}`
      )
      .join("\n\n");

    // ✅ Prompt for Gemini
    const prompt = hybridResults.length
      ? `You are a helpful assistant.
Use the context provided below to answer the user's question.
- Give only a direct answer without extra sentences.
- Format: "Product Name (Price: XXX)".
- If no answer is found, say "I don't know".

Context:
${contextText}

Question: ${translatedQuery}`
      : `You are a friendly AI assistant. Answer naturally.
User: ${translatedQuery}`;

    // ✅ Call Gemini
    const answer = await callGemini(prompt);

    res.json({
      answer: answer || "I don't know",
      context: hybridResults.map((d) => ({
        title: d.title,
        description: d.description,
        price: d.price,
      })),
    });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

export default router;
