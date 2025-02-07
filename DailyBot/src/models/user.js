import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    tgId: {
        type: Number,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    isBot:{
        type: Boolean,
        required: true
    },
   
    promptTokens:{
        type: Number,
        required: false
    },
    completionTokens:{
        type: Number,
        required: false
    }
},{timestamps: true});

export default mongoose.model("User", userSchema);