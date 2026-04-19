const mongoose = require('mongoose');

const PortfolioItemSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    tech_stack: { type: [String], default: [] },
    image_url: { type: String },
    project_url: { type: String },
    github_url: { type: String },
    created_at: { type: Date, default: Date.now }
});

const WorkExperienceSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    job_title: { type: String, required: true },
    company: { type: String, required: true },
    start_date: { type: String },
    end_date: { type: String },
    is_current: { type: Boolean, default: false },
    description: { type: String },
    created_at: { type: Date, default: Date.now }
});

const CertificationSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    issuer: { type: String, required: true },
    issue_date: { type: String },
    expiry_date: { type: String },
    credential_url: { type: String },
    created_at: { type: Date, default: Date.now }
});

const ReviewSchema = new mongoose.Schema({
    reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    created_at: { type: Date, default: Date.now }
});

const CollaborationInviteSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_email: { type: String, required: true, lowercase: true },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    message: { type: String, default: null },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    created_at: { type: Date, default: Date.now }
});

const ProjectCollaboratorSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'member' },
    created_at: { type: Date, default: Date.now }
});

// Prevent duplicate collaborator entries
ProjectCollaboratorSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

const FriendshipSchema = new mongoose.Schema({
    user_id_1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user_id_2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const MilestoneSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    description: { type: String },
    completed: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
});

const FileSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    uploader_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file_name: { type: String, required: true },
    file_url: { type: String, required: true },
    file_size: { type: Number },
    created_at: { type: Date, default: Date.now }
});

const ConsultantReportSchema = new mongoose.Schema({
    uploader_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    format: { type: String, required: true },
    file_url: { type: String, required: true },
    file_size: { type: Number, default: 0 },
    current_version: { type: Number, default: 1 },
    access_count: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const ReportVersionSchema = new mongoose.Schema({
    report_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultantReport', required: true },
    version: { type: Number, required: true },
    file_url: { type: String, required: true },
    file_size: { type: Number, default: 0 },
    change_notes: { type: String, default: 'Initial version' },
    uploaded_at: { type: Date, default: Date.now }
});

const ReportAccessGrantSchema = new mongoose.Schema({
    report_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultantReport', required: true },
    granted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    granted_to_email: { type: String, required: true, lowercase: true },
    expires_at: { type: Date, default: null },
    granted_at: { type: Date, default: Date.now }
});

const ReportAccessLogSchema = new mongoose.Schema({
    report_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultantReport', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    user_email: { type: String },
    action: { type: String, enum: ['view', 'download'], required: true },
    accessed_at: { type: Date, default: Date.now }
});

const AdminAnnouncementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'maintenance'], default: 'info' },
    is_pinned: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    target_roles: { type: [String], default: [] },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now }
});

// Skill Analytics per user per skill
const SkillAnalyticSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skill: { type: String, required: true },
    proficiency_level: { type: Number, default: 1, min: 1, max: 5 },
    projects_completed: { type: Number, default: 0 },
    total_earnings: { type: Number, default: 0 },
    avg_rating: { type: Number, default: null },
    updated_at: { type: Date, default: Date.now }
});
SkillAnalyticSchema.index({ user_id: 1, skill: 1 }, { unique: true });

// Disputes raised by users
const DisputeSchema = new mongoose.Schema({
    raised_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    against_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    dispute_type: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'investigating', 'resolved', 'closed'], default: 'open' },
    resolution_notes: { type: String, default: '' },
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now }
});

// Content moderation reports
const ContentModerationSchema = new mongoose.Schema({
    content_type: { type: String, required: true },
    content_id: { type: String, required: true },
    reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'reviewed'], default: 'pending' },
    action_taken: { type: String, default: null },
    moderator_notes: { type: String, default: '' },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now }
});

// Consultancy Bookings (client books a consultant for a session)
const ConsultancyBookingSchema = new mongoose.Schema({
    consultant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    session_date: { type: Date, required: true },
    duration_minutes: { type: Number, default: 60 },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'pending'], default: 'scheduled' },
    report_url: { type: String, default: null },
    created_at: { type: Date, default: Date.now }
});

module.exports = {
    PortfolioItem: mongoose.model('PortfolioItem', PortfolioItemSchema),
    WorkExperience: mongoose.model('WorkExperience', WorkExperienceSchema),
    Certification: mongoose.model('Certification', CertificationSchema),
    Review: mongoose.model('Review', ReviewSchema),
    CollaborationInvite: mongoose.model('CollaborationInvite', CollaborationInviteSchema),
    ProjectCollaborator: mongoose.model('ProjectCollaborator', ProjectCollaboratorSchema),
    Friendship: mongoose.model('Friendship', FriendshipSchema),
    Message: mongoose.model('Message', MessageSchema),
    Milestone: mongoose.model('Milestone', MilestoneSchema),
    File: mongoose.model('File', FileSchema),
    ConsultantReport: mongoose.model('ConsultantReport', ConsultantReportSchema),
    ReportVersion: mongoose.model('ReportVersion', ReportVersionSchema),
    ReportAccessGrant: mongoose.model('ReportAccessGrant', ReportAccessGrantSchema),
    ReportAccessLog: mongoose.model('ReportAccessLog', ReportAccessLogSchema),
    AdminAnnouncement: mongoose.model('AdminAnnouncement', AdminAnnouncementSchema),
    SkillAnalytic: mongoose.model('SkillAnalytic', SkillAnalyticSchema),
    Dispute: mongoose.model('Dispute', DisputeSchema),
    ContentModeration: mongoose.model('ContentModeration', ContentModerationSchema),
    ConsultancyBooking: mongoose.model('ConsultancyBooking', ConsultancyBookingSchema),
};


