const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'client', 'freelancer', 'consultant'],
        default: 'client'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetToken: {
        type: String
    },
    resetTokenExpiry: {
        type: Date
    }
});

module.exports = mongoose.model('User', UserSchema);
