import mongoose from "mongoose";

const botchatSchema = new mongoose.Schema({

    userId: { type: String, required: true },
    messages: [
        {
            role: { type: String, enum: ["user", "bot"], required: true },
            content: { type: [String], required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    context: {
        industry: { type: String, default: null },
        interest: { type: String, default: null },
        preferences: { type: Object, default: {} }
    }

})


const botchat = mongoose.model("botChat",botchatSchema);
export default botchat;