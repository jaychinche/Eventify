const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true }, // User's username
    password: { type: String, required: true }, // User's password
    lastLogin: { type: Date }, // Last login timestamp
    email:{type:String},
    userType: { 
        type: String, 
        enum: ['admin', 'student'], 
        required: true 
    },
});

module.exports = mongoose.model('User', userSchema);