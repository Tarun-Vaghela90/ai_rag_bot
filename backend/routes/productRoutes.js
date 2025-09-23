import express from 'express'
import dotenv from 'dotenv';
import * as fs from "node:fs";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";
import Product from '../models/product.js';
const ai = new GoogleGenAI({});

dotenv.config();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/temp"); // folder where files will be saved
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },
});

const upload = multer({ storage });

// Create Router instance
const router = express.Router();

const queryEmbedding = async (texts) => {
  try {
    const combinedText = texts.join(" ");
    console.log("Embedding function called");

    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: combinedText,
      outputDimensionality: 3072, // smaller dimension for storage efficiency
    });

    // Some SDKs return { embeddings: [{ values: [...] }] }
    const embedding = response.embeddings
      ? response.embeddings[0].values
      : response.responses[0].embedding.values;

    console.log("✅ Got embedding with dimension:", embedding.length);
    return embedding;
  } catch (error) {
    console.error("Embedding error:", error);
    return null;
  }
};

router.post("/", async (req, res) => {
  try {
    const { title, description, price } = req.body;

    if (!title || !description || !price) {
      return res.status(400).json({ message: "All Fields Are Required" });
    }

    // 🔹 Generate embedding for title + description
    const embedding = await queryEmbedding([title, description]);
    if (!embedding) {
      return res.status(500).json({ message: "Failed to generate embedding" });
    }

    // 🔹 Save product with embedding
    const product = new Product({
      title,
      description,
      price: parseInt(price, 10),
      embedding, // store embedding
    });

    const savedProduct = await product.save();

    res.status(201).json({
      message: "✅ Product created successfully",
      product: savedProduct,
    });
  } catch (error) {
    console.error("❌ Error saving product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.post('/aisuggest', upload.single("image"), async (req, res) => {
    const base64ImageFile = fs.readFileSync(req.file.path, {
        encoding: "base64",
    });

    const contents = [
        {
            inlineData: {
                mimeType: "image/jpeg",
                data: base64ImageFile,
            },
        },
        { text: "Generate a product with title, price, and description. country=INDIA" }, // promt to send
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
    const data = JSON.parse(response.text)
    console.log(response)
    fs.unlink(req.file.path, (err) => {
        if (err) {
            console.error("❌ Failed to delete temp file:", err);
        } else {
            console.log("✅ Temp file deleted:", req.file.path);
        }
    });

    res.json({ data: data })



}
)

router.get('/', async (req, res) => {
    try {
        const data = await Product.find().select("-embedding");



        res.status(200).json({ length: data.length, data: data })
    } catch (error) {
        console.log(error.message)
    }
})





export default router