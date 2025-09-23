import mongoose from 'mongoose'

const collectionSchema = new mongoose.Schema({
    name: {
        type: String,
        require: true
    }

},
    { timestamps: true }
)


const collection = mongoose.model('collection', collectionSchema)

export default collection;