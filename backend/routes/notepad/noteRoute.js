import express from 'express'
import Note from '../../models/note'
const router = express.Router();



router.get('/', async (req, res) => {
try {
    
    const data = await Note.find();

    res.status(200).json({message:"Data Fetched" , data:data})
} catch (error) {
    console.log(error.message)
    res.status(500).json({messsage:error.message})
}

})
router.post('/add')
router.put('/')
router.delete('/')
