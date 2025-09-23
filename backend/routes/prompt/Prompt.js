import express from 'express'
const router = express.Router()
import { GoogleGenAI } from "@google/genai";
import { performance } from 'perf_hooks'
const ai = new GoogleGenAI({});

async function GeminiCall({ systemInstruction, temperature = 1, userPrompt }) {
    const start = performance.now();

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: temperature
        }
    });

    const latency = (performance.now() - start).toFixed(2); // in ms
    console.log("Latency:", latency, "ms");
    console.log(response.text);

    const usage = response.usageMetadata;

    // Gemini pricing (Paid Tier)
    const PRICE_PER_MILLION_INPUT = 0.30;  // $ per 1M input tokens
    const PRICE_PER_MILLION_OUTPUT = 2.50; // $ per 1M output + thinking tokens

    // Calculate estimated cost
    const inputCost = (usage.promptTokenCount / 1_000_000) * PRICE_PER_MILLION_INPUT;
    const outputCost = ((usage.candidatesTokenCount + usage.thoughtsTokenCount) / 1_000_000) * PRICE_PER_MILLION_OUTPUT;
    const estimatedCost = inputCost + outputCost;

    return {
        model: response.modelVersion,
        latency,
        gemini: response.text,
        input_tokens: usage.promptTokenCount,
        output_tokens: usage.candidatesTokenCount,
        thoughts_tokens: usage.thoughtsTokenCount,
        total_tokens: usage.totalTokenCount,
        estimated_cost_usd: estimatedCost.toFixed(6)
    };
}


router.post('/', async (req, res) => {
    const { title, systemprompt, userPrompt } = req.body;

    if (!userPrompt) {
        res.status(401).json({ messsage: "All Feild Are Required" })
    }

    const gemini = await GeminiCall({
        systemInstruction: systemprompt || "act as A Robot, you speak like robot",
        userPrompt,
    });


    res.json({
        model:gemini.model,
        gemini: gemini.gemini,
        latency: gemini.latency,
        token: gemini.token,
        input_tokens: gemini.input_tokens,
        ouput_tokens: gemini.output_tokens,
        thoughts_tokens:gemini.thoughts_tokens,
        total_tokens:gemini.total_tokens,
        estimated_cost_usd:gemini.estimated_cost_usd
    })


})


export default router