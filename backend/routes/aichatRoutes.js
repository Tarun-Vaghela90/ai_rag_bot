import express from 'express'
import dotenv from 'dotenv';

dotenv.config();

// Remove incorrect import

import { GoogleGenAI,Type } from "@google/genai";


// Init client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});
// Create Router instance
const Router = express.Router();

// Create a chat session

const chat =  ai.chats.create({
    model: "gemini-2.5-flash",
    history: [
      {
        role: "user",
        parts: [{ text: "Hello" }],
      },
      {
        role: "model",
        parts: [{ text: "Great to meet you. What would you like to know?" }],
      },
    ],
  });

Router.post('/send', async (req, res) => {
  const { message } = req.body;

  try {
    // In @google/genai → you must pass { role, parts }
    const result = await chat.sendMessage({
      // history:["i am developer"],
      message,
     
    });

    // Extract text
    const reply = result.text;

    console.log(result);
    res.json({ gemini: reply });
  } catch (err) {
    console.error("Gemini error:", err);
    res.status(500).json({ message: err.message });
  }
});




export default Router