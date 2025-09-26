
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
                items: { type: Type.STRING }
              },
              future_actions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
            },
            propertyOrdering: ["gemini", "future_actions"],
          },
        },
      },
    });

    // ✅ If SDK gives structured output
    // if (response.output) {
    //   console.log("output",response.output)
    //   return response.output;
    // }
    
    // ✅ Fallback if text is returned
    if (response.text) {
      //   console.log("output",response.)
      return JSON.parse(response.text);
    }

    throw new Error("No valid Gemini response format found");

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