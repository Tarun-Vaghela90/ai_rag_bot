
import mongoose from "mongoose";

const docSchema = new mongoose.Schema({
  content: String,
  embedding: [Number],
});
const Doc = mongoose.model("Doc", docSchema);

export default Doc