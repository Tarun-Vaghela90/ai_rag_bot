import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet'
import aichatRoutes from './routes/aichatRoutes.js';
import productRoutes from './routes/productRoutes.js'
import searchRoute from './routes/search/searchRoute.js'
import morgan from 'morgan';
import mongoose from 'mongoose';
import ragChatbotRoute from './routes/Rag/Ragchatbot.js'
import PromptRoutes from './routes/prompt/Prompt.js'

dotenv.config({ debug: false });
const app = express();
const port = process.env.PORT;

app.use(morgan('dev'))
app.set("trust proxy", 1);
app.use(cors({
  origin:process.env.ORIGIN_URL,
    methods: ["GET", "POST", "PUT", "DELETE"], // allowed methods
    credentials: true,
}));
app.use(helmet())
app.use(express.json());

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1); // Exit app if DB fails
  }
}

connectDB();
app.use('/chatbot', aichatRoutes);
app.use('/product', productRoutes);
app.use('/search',searchRoute)
app.use('/rag',ragChatbotRoute)
app.use('/prompt',PromptRoutes)






app.listen(process.env.PORT, () =>
  console.log(`Server running at http://localhost:${process.env.PORT}`)
);
