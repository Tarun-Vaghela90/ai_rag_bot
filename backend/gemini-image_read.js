import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI,Type } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});
const base64ImageFile = fs.readFileSync("./demo.jpg", {
  encoding: "base64",
});

const contents = [
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64ImageFile,
    },
  },
  { text: "Generate a product with title, price, and description." }, // promt to send
];

const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          price: { type: Type.NUMBER },
          description: {
            type: Type.STRING,
            maxLength: 200, // ✅ limit to ~200 characters
          },
        },
        propertyOrdering: ["title", "price", "description"],
      },
    },
  });
console.log(response.text);
const  product = response.text
console.log(product)
console.log(typeof product)