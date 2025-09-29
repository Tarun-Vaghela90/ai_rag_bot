import express from "express";
import mongoose from "mongoose";
// import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

// dotenv.config({path:'../.env'});
const app = express();
app.use(express.json());

// MongoDB Connection
await mongoose.connect(process.env.MONGO_URI);

// Schema
const docSchema = new mongoose.Schema({
  content: String,
  embedding: [Number],
});
const Doc = mongoose.model("Doc", docSchema);

// Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Generate text with Gemini
async function callGemini(prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text?.trim();
}

// Create embedding
async function createEmbedding(text) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
  });
  return response.embeddings[0].values;
}

// Cosine similarity
function cosineSim(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
}

// API: Add document
app.post("/add-doc", async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Content is required" });

  const embedding = await createEmbedding(content);
  const doc = new Doc({ content, embedding });
  await doc.save();

  res.json({ message: "Document saved" });
});

// API: Ask chatbot
app.post("/chat", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });

  const queryEmbedding = await createEmbedding(query);
  const docs = await Doc.find();

  let topDocs = [];
  let contextText = "";

  if (docs.length) {
    // First try with high threshold (0.7)
    topDocs = docs
      .map((d) => ({
        content: d.content,
        score: cosineSim(queryEmbedding, d.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter((d) => d.score > 0.7);

    // If nothing matched, relax to 0.4
    if (topDocs.length === 0) {
      topDocs = docs
        .map((d) => ({
          content: d.content,
          score: cosineSim(queryEmbedding, d.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .filter((d) => d.score > 0.4);
    }

    contextText = topDocs.map((d, i) => `Doc${i + 1}: ${d.content}`).join("\n\n");
  }

  let prompt;

 if (topDocs.length > 0) {
  // RAG mode with context + translation allowed
  prompt = `You are a helpful multilingual assistant.  
Use the context provided below to answer the user's question.  

- If the user asks for translation, you may translate the context or the answer into the requested language.  
- If the user asks for summarization or explanation, do it based on the context.  
- Always ground answers in the context.  
- If the context does not contain the answer, say "I don't know".  

Context:
${contextText}

Question: ${query}`;
} else {
  // Free assistant mode
  prompt = `You are a friendly multilingual AI assistant.  
You can translate, summarize, or chat naturally in the language the user prefers.  

User: ${query}`;
}


  const answer = await callGemini(prompt);

  res.json({
    answer: answer || "I don’t know",
    context: topDocs.length ? topDocs.map((d) => d.content) : null,
  });
});

// Start server
app.listen(process.env.PORT, () =>
  console.log(`🚀 RAG Chatbot running on http://localhost:${REDIS_USERNAME}`)
);
