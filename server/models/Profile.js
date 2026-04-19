const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    full_name: { type: String, default: null },
    bio: { type: String, default: null },
    skills: { type: [String], default: [] },
    location: { type: String, default: null },
    hourly_rate: { type: Number, default: null },
    phone: { type: String, default: null },
    company: { type: String, default: null },
    website: { type: String, default: null },
    position: { type: String, default: null },
    linkedin: { type: String, default: null },
    github: { type: String, default: null },
    avatar_url: { type: String, default: null },
    trust_level: { type: String, enum: ['active', 'verified', 'flagged', 'suspended'], default: 'active' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Profile', ProfileSchema);
