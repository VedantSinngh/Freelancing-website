const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    icon: { type: String, default: 'Award' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Achievement', achievementSchema);
