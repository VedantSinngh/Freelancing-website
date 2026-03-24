const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    budget: {
        type: Number,
        required: true
    },
    deadline: {
        type: Date
    },
    skills_required: {
        type: [String],
        default: []
    },
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'completed', 'cancelled'],
        default: 'open'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Project', ProjectSchema);
