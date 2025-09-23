import express from "express";
import Product from "../../models/product.js";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();
const ai = new GoogleGenAI({});

// ✅ Embedding function usable inside routes
const queryEmbedding = async (text) => {
  try {
    console.log("Embedding function called");
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: [text],   // ✅ must be an array
      outputDimensionality: 3072,
    });

    // Gemini always returns an array of embeddings
    const embedding = response.embeddings[0].values;
    console.log("Embedding vector length:", embedding.length);
    return embedding;
  } catch (error) {
    console.error("Embedding error:", error);
    return null;
  }
};


// Search route with optional embeddings
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: "Query required" });

    // 1. Generate embedding for the query
    const embeddingRes = await queryEmbedding(q);
    // const queryVector = embeddingRes[0].values; // Gemini returns [{ values: [...] }]

    // 2. Vector search using Atlas $vectorSearch
   const results = await Product.aggregate([
       {
         $vectorSearch: {
           index: "vector_index", // 👈 must match your Atlas index name
           path: "embedding",
           queryVector:embeddingRes ,
           numCandidates: 50,
           limit: 3,
         },
       },
       {
         $project: {
           title: 1,
           description: 1,
           price:1,
           score: { $meta: "vectorSearchScore" },
         },
       },
     ]);

    res.json({ query: q, data:results });
  } catch (error) {
    console.error("Vector search error:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});




export default router;
