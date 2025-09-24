
// Generate text using Gemini
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function callGemini(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              gemini: {
                type: Type.ARRAY,
                items:{
                  type:Type.STRING
                }
              },
              future_actions: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
            },
            propertyOrdering: ["gemini", "future_actions"], // ✅ correctly inside object schema
          },
        },
      },
    });
    const resDoc = JSON.parse(response.text)
    // console.log(resDoc)
    return resDoc;
  } catch (err) {
    console.error("Gemini call error:", err);
    return null;
  }
}

// Create embedding vector
async function createEmbedding(text) {
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: [text],
      outputDimensionality: 3072,
    });
    return response.embeddings[0].values;
  } catch (err) {
    console.error("Embedding error:", err);
    return null;
  }
}




export  {callGemini, createEmbedding}