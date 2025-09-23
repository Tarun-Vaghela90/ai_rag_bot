import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, // ✅ correct
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  embedding: {
    type: [Number], // array of floats
    default: [],    // will be filled with AI embeddings
  },
  
},
{timestamps:true}
);

// ✅ Compile schema into a model
const Product = mongoose.model("Product", productSchema);


export default Product;
