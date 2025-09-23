import mongoose from "mongoose";

const promptSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true, // ✅ correct
    },
    system: {
        type: String,
        required: true,
    },
    user: {
        type: String,
        required: true,
    },
    output: {
        type: String,
        required: true,
    },
    latensy: {
        type: Number,
        require: true``
    },
    input_token: {
        type: Number,
        required: true
    },
    output_token: {
        type: Number,
        required: true
    },
    total_tokens: {
        type: Number,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    temperature: {
        type: String,
        required: true
    },
    cost: {
        type: Number,
        require: true
    }



},
    { timestamps: true }
);

// ✅ Compile schema into a model
const Product = mongoose.model("Prompt", promptSchema);


export default Product;
