import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema({
    note:{
        type:String,
        require:true
    },
    collection:{
        type:mongoose.Schema.ObjectId,
        ref:"collection"
    }
},
{timestamps:true}
)

const note = mongoose.model('note',noteSchema)
export default note