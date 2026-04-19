require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Project = require('./models/Project');
const Bid = require('./models/Bid');
const Notification = require('./models/Notification');
const Achievement = require('./models/Achievement');
const Profile = require('./models/Profile');
const {
    PortfolioItem, WorkExperience, Certification, Review, CollaborationInvite,
    ProjectCollaborator, Friendship, Message, Milestone, File,
    ConsultantReport, ReportVersion, ReportAccessGrant, ReportAccessLog, AdminAnnouncement,
    SkillAnalytic, Dispute, ContentModeration, ConsultancyBooking
} = require('./models/Extras');


const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key_change_me';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        try {
            // Check for and drop problematic username index if it exists
            const collections = await mongoose.connection.db.listCollections({ name: 'users' }).toArray();
            if (collections.length > 0) {
                const indexes = await mongoose.connection.db.collection('users').indexes();
                if (indexes.some(idx => idx.name === 'username_1')) {
                    await mongoose.connection.db.collection('users').dropIndex('username_1');
                    console.log('Dropped problematic username_1 index');
                }
            }
        } catch (err) {
            console.log('Note: Error checking/dropping indexes (this is usually fine):', err.message);
        }
    })
    .catch(err => console.error('Could not connect to MongoDB:', err));

// Auth Routes

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
    console.log('Signup Attempt:', { email: req.body.email, role: req.body.role, fullName: req.body.fullName });
    try {
        const { email, password, fullName, role } = req.body;

        if (!email || !password || !fullName || !role) {
            console.log('Missing fields:', { email: !!email, password: !!password, fullName: !!fullName, role: !!role });
            return res.status(400).json({ error: { message: 'All fields are required' } });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            console.log('User already exists:', email);
            return res.status(400).json({ error: { message: 'User already exists' } });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        user = new User({
            email,
            password: hashedPassword,
            fullName,
            role
        });

        await user.save();
        console.log('User saved successfully:', email);

        // Create JWT
        console.log('Generating JWT with secret length:', JWT_SECRET.length);
        let token;
        try {
            token = jwt.sign(
                { userId: user._id, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            console.log('JWT generated successfully');
        } catch (jwtErr) {
            console.error('JWT Signing Error:', jwtErr);
            throw new Error('Failed to generate token');
        }

        const responseData = {
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            },
            token
        };
        console.log('Sending success response');
        res.json(responseData);
    } catch (err) {
        console.error('Signup Error Detailed:', err);
        res.status(500).json({ error: { message: 'Server error', detail: err.message } });
    }
});

// Sign In
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: { message: 'Invalid credentials' } });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: { message: 'Invalid credentials' } });
        }

        // Create JWT
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            },
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// Get User (Verify Token)
app.get('/api/auth/user', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: { message: 'No token, authorization denied' } });

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) return res.status(404).json({ error: { message: 'User not found' } });

        res.json({ 
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (err) {
        res.status(401).json({ error: { message: 'Token is not valid' } });
    }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }

        // Generate token
        const resetToken = require('crypto').randomBytes(20).toString('hex');
        
        // Save to user with 1 hour expiration
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
        await user.save();

        console.log(`Reset token for ${email}: ${resetToken}`);
        // Return token directly for this exercise (or email it ideally)
        res.json({ message: 'Reset token generated successfully', resetToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { message: 'Server error generating token' } });
    }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) {
            return res.status(400).json({ error: { message: 'Token and new password required' } });
        }

        const user = await User.findOne({ 
            resetToken,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: { message: 'Invalid or expired token' } });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // Clear token
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { message: 'Server error resetting password' } });
    }
});

// --- Project Routes ---
// Auth middleware helper
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: { message: 'No token, authorization denied' } });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, role }
        next();
    } catch (err) {
        res.status(401).json({ error: { message: 'Token is not valid' } });
    }
};

// Create Project
app.post('/api/projects', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'client') return res.status(403).json({ error: { message: 'Only clients can post projects' } });
        
        const project = new Project({
            ...req.body,
            client_id: req.user.userId
        });
        await project.save();
        res.status(201).json(project);
    } catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({ error: { message: 'Server error creating project' } });
    }
});

// Get Projects
app.get('/api/projects', authMiddleware, async (req, res) => {
    try {
        let query = {};
        if (req.query.client_id) {
            query.client_id = req.query.client_id;
        } else if (req.user.role === 'freelancer') {
            query.status = 'open'; // Freelancers see open projects
        }
        
        // Populate client details
        const projects = await Project.find(query).sort({ created_at: -1 }).populate('client_id', 'fullName email');
        
        // Get real bid counts for all projects
        const projectIds = projects.map(p => p._id);
        const bidCounts = await Bid.aggregate([
            { $match: { project_id: { $in: projectIds } } },
            { $group: { _id: '$project_id', count: { $sum: 1 } } }
        ]);
        const bidCountMap = {};
        bidCounts.forEach(bc => { bidCountMap[bc._id.toString()] = bc.count; });
        
        // Format for frontend
        const formattedProjects = projects.map(p => {
            const doc = p.toObject();
            if (doc.client_id) {
                doc.profiles = { full_name: doc.client_id.fullName };
                doc.client_id = doc.client_id._id.toString();
            }
            // Real bid count
            doc.bids = [{ count: bidCountMap[doc._id.toString()] || 0 }];
            doc.id = doc._id.toString();
            return doc;
        });

        res.json(formattedProjects);
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: { message: 'Server error fetching projects' } });
    }
});


// Update Project
app.put('/api/projects/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'client') return res.status(403).json({ error: { message: 'Only clients can edit projects' } });
        
        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, client_id: req.user.userId },
            req.body,
            { new: true }
        );
        if (!project) return res.status(404).json({ error: { message: 'Project not found or unauthorized' } });
        res.json(project);
    } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ error: { message: 'Server error updating project' } });
    }
});

// Delete Project
app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'client') return res.status(403).json({ error: { message: 'Only clients can delete projects' } });
        
        const project = await Project.findOneAndDelete({ _id: req.params.id, client_id: req.user.userId });
        if (!project) return res.status(404).json({ error: { message: 'Project not found or unauthorized' } });
        res.json({ message: 'Project deleted' });
    } catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ error: { message: 'Server error deleting project' } });
    }
});

// --- Achievement Routes ---

// Get ALL achievements (for admin)
app.get('/api/achievements', authMiddleware, async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { user_id: req.user.userId };
        const achievements = await Achievement.find(query).sort({ created_at: -1 });
        res.json(achievements.map(a => ({
            id: a._id.toString(),
            user_id: a.user_id.toString(),
            title: a.title,
            description: a.description,
            icon: a.icon,
            created_at: a.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error fetching achievements' } });
    }
});

// Get Achievements for a specific user
app.get('/api/achievements/:userId', authMiddleware, async (req, res) => {
    try {
        const achievements = await Achievement.find({ user_id: req.params.userId }).sort({ created_at: -1 });
        res.json(achievements.map(a => ({
            id: a._id.toString(),
            user_id: a.user_id.toString(),
            title: a.title,
            description: a.description,
            icon: a.icon,
            created_at: a.created_at
        })));
    } catch (err) {
        console.error('Error fetching achievements:', err);
        res.status(500).json({ error: { message: 'Server error fetching achievements' } });
    }
});

// Create Achievement
app.post('/api/achievements', authMiddleware, async (req, res) => {
    try {
        const achievement = new Achievement({
            user_id: req.user.userId,
            title: req.body.title,
            description: req.body.description,
            icon: req.body.icon || 'Award'
        });
        await achievement.save();
        res.status(201).json({
            id: achievement._id.toString(),
            user_id: achievement.user_id.toString(),
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            created_at: achievement.created_at
        });
    } catch (err) {
        console.error('Error creating achievement:', err);
        res.status(500).json({ error: { message: 'Server error creating achievement' } });
    }
});

// Delete Achievement (admin can delete any, users can only delete their own)
app.delete('/api/achievements/:id', authMiddleware, async (req, res) => {
    try {
        const query = req.user.role === 'admin'
            ? { _id: req.params.id }
            : { _id: req.params.id, user_id: req.user.userId };
        const achievement = await Achievement.findOneAndDelete(query);
        if (!achievement) return res.status(404).json({ error: { message: 'Achievement not found or unauthorized' } });
        res.json({ message: 'Achievement deleted' });
    } catch (err) {
        console.error('Error deleting achievement:', err);
        res.status(500).json({ error: { message: 'Server error deleting achievement' } });
    }
});


// --- Bid Routes ---

// Create Bid
app.post('/api/bids', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'freelancer') return res.status(403).json({ error: { message: 'Only freelancers can place bids' } });
        
        const bid = new Bid({
            ...req.body,
            freelancer_id: req.user.userId
        });
        await bid.save();

        // Notify client
        try {
            const project = await Project.findById(bid.project_id);
            if (project) {
                const freelancer = await User.findById(req.user.userId);
                const notification = new Notification({
                    user_id: project.client_id,
                    type: 'bid',
                    title: 'New Bid Received',
                    body: `${freelancer?.fullName || 'A freelancer'} has bid $${bid.amount} on your project "${project.title}"`,
                    link: `/client-dashboard`
                });
                await notification.save();
            }
        } catch (nErr) {
            console.error('Failed to send bid notification:', nErr);
        }

        res.status(201).json(bid);
    } catch (err) {
        console.error('Error creating bid:', err);
        res.status(500).json({ error: { message: 'Server error creating bid' } });
    }
});

// Get My Bids (as Freelancer)
app.get('/api/bids/my', authMiddleware, async (req, res) => {
    try {
        const bids = await Bid.find({ freelancer_id: req.user.userId })
            .populate('project_id', 'title status budget client_id')
            .sort({ created_at: -1 });
        
        // Format for frontend
        const formattedBids = bids.map(b => {
            const doc = b.toObject();
            if (doc.project_id) {
                doc.projects = { 
                    title: doc.project_id.title,
                    status: doc.project_id.status,
                    budget: doc.project_id.budget
                };
                doc.project_id = doc.project_id._id.toString();
            }
            return {
                ...doc,
                id: doc._id.toString()
            };
        });

        res.json(formattedBids);
    } catch (err) {
        console.error('Error fetching my bids:', err);
        res.status(500).json({ error: { message: 'Server error fetching bids' } });
    }
});

// Get Bids for Project (as Client)
app.get('/api/projects/:projectId/bids', authMiddleware, async (req, res) => {
    try {
        const bids = await Bid.find({ project_id: req.params.projectId })
            .populate('freelancer_id', 'fullName email')
            .sort({ created_at: -1 });
        
        const formattedBids = bids.map(b => {
            const doc = b.toObject();
            if (doc.freelancer_id) {
                // frontend expects bid.profiles.full_name
                doc.profiles = { 
                    full_name: doc.freelancer_id.fullName,
                    email: doc.freelancer_id.email
                };
                doc.freelancer_id = doc.freelancer_id._id.toString();
            }
            return {
                ...doc,
                id: doc._id.toString()
            };
        });

        res.json(formattedBids);
    } catch (err) {
        console.error('Error fetching project bids:', err);
        res.status(500).json({ error: { message: 'Server error fetching project bids' } });
    }
});

// Update Bid Status
app.put('/api/bids/:id', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const bid = await Bid.findById(req.params.id);
        if (!bid) return res.status(404).json({ error: { message: 'Bid not found' } });

        // Update bid
        bid.status = status;
        bid.updated_at = Date.now();
        await bid.save();

        // If accepted, update project status and reject others
        if (status === 'accepted') {
            const project = await Project.findByIdAndUpdate(bid.project_id, { status: 'in_progress' });
            await Bid.updateMany(
                { project_id: bid.project_id, _id: { $ne: bid._id } },
                { status: 'rejected' }
            );

            // Notify freelancer
            try {
                const notification = new Notification({
                    user_id: bid.freelancer_id,
                    type: 'bid',
                    title: 'Bid Accepted!',
                    body: `Your bid on "${project?.title || 'a project'}" has been accepted.`,
                    link: `/freelancer-dashboard`
                });
                await notification.save();
            } catch (nErr) {
                console.error('Failed to send acceptance notification:', nErr);
            }
        } else if (status === 'rejected') {
            // Notify freelancer of rejection? (Optional, but good UX)
            try {
                const project = await Project.findById(bid.project_id);
                const notification = new Notification({
                    user_id: bid.freelancer_id,
                    type: 'bid',
                    title: 'Bid Update',
                    body: `Your bid on "${project?.title || 'a project'}" was not selected.`,
                    link: `/freelancer-dashboard`
                });
                await notification.save();
            } catch (nErr) { /* silent */ }
        }

        res.json(bid);
    } catch (err) {
        console.error('Error updating bid:', err);
        res.status(500).json({ error: { message: 'Server error updating bid' } });
    }
});

// --- Notification Routes ---

// Create Notification (Internal/Public)
app.post('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const notification = new Notification(req.body);
        await notification.save();
        res.status(201).json(notification);
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error creating notification' } });
    }
});

// Get My Notifications
app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ user_id: req.user.userId })
            .sort({ created_at: -1 })
            .limit(30);
        
        res.json(notifications.map(n => ({
            ...n.toObject(),
            id: n._id.toString()
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error fetching notifications' } });
    }
});

// Mark Read
app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.userId },
            { is_read: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error marking notification as read' } });
    }
});

// Mark All Read
app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { user_id: req.user.userId, is_read: false },
            { is_read: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error marking all notifications as read' } });
    }
});

// Delete Notification
app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error deleting notification' } });
    }
});
// --- Profile Routes ---

// Get Profile
app.get('/api/profile/:userId', authMiddleware, async (req, res) => {
    try {
        let profile = await Profile.findOne({ user_id: req.params.userId });
        if (!profile) {
            // Auto-create profile from user data
            const user = await User.findById(req.params.userId).select('-password');
            if (!user) return res.status(404).json({ error: { message: 'User not found' } });
            profile = await Profile.create({ user_id: req.params.userId, full_name: user.fullName });
        }
        res.json({ ...profile.toObject(), id: profile._id.toString(), user_id: profile.user_id.toString() });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: { message: 'Server error fetching profile' } });
    }
});

// Update Profile
app.put('/api/profile', authMiddleware, async (req, res) => {
    try {
        const profile = await Profile.findOneAndUpdate(
            { user_id: req.user.userId },
            { ...req.body, updated_at: Date.now() },
            { new: true, upsert: true }
        );
        res.json({ ...profile.toObject(), id: profile._id.toString() });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: { message: 'Server error updating profile' } });
    }
});

// --- Portfolio Routes ---

app.get('/api/portfolio/:userId', authMiddleware, async (req, res) => {
    try {
        const items = await PortfolioItem.find({ user_id: req.params.userId }).sort({ created_at: -1 });
        res.json(items.map(i => ({ ...i.toObject(), id: i._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/portfolio', authMiddleware, async (req, res) => {
    try {
        const item = await PortfolioItem.create({ ...req.body, user_id: req.user.userId });
        res.status(201).json({ ...item.toObject(), id: item._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.put('/api/portfolio/:id', authMiddleware, async (req, res) => {
    try {
        const item = await PortfolioItem.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.userId },
            req.body, { new: true }
        );
        if (!item) return res.status(404).json({ error: { message: 'Not found' } });
        res.json({ ...item.toObject(), id: item._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.delete('/api/portfolio/:id', authMiddleware, async (req, res) => {
    try {
        await PortfolioItem.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Work Experience Routes ---

app.get('/api/work-experience/:userId', authMiddleware, async (req, res) => {
    try {
        const items = await WorkExperience.find({ user_id: req.params.userId }).sort({ start_date: -1 });
        res.json(items.map(i => ({ ...i.toObject(), id: i._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/work-experience', authMiddleware, async (req, res) => {
    try {
        const item = await WorkExperience.create({ ...req.body, user_id: req.user.userId });
        res.status(201).json({ ...item.toObject(), id: item._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.delete('/api/work-experience/:id', authMiddleware, async (req, res) => {
    try {
        await WorkExperience.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Certification Routes ---

app.get('/api/certifications/:userId', authMiddleware, async (req, res) => {
    try {
        const items = await Certification.find({ user_id: req.params.userId }).sort({ issue_date: -1 });
        res.json(items.map(i => ({ ...i.toObject(), id: i._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/certifications', authMiddleware, async (req, res) => {
    try {
        const item = await Certification.create({ ...req.body, user_id: req.user.userId });
        res.status(201).json({ ...item.toObject(), id: item._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.delete('/api/certifications/:id', authMiddleware, async (req, res) => {
    try {
        await Certification.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Review Routes ---

app.get('/api/reviews/:userId', authMiddleware, async (req, res) => {
    try {
        const reviews = await Review.find({ reviewee_id: req.params.userId })
            .populate('reviewer_id', 'fullName')
            .sort({ created_at: -1 });
        res.json(reviews.map(r => ({
            ...r.toObject(),
            id: r._id.toString(),
            reviewer_name: r.reviewer_id?.fullName || 'Anonymous',
            reviewer_avatar: null
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/reviews', authMiddleware, async (req, res) => {
    try {
        const review = await Review.create({
            reviewer_id: req.user.userId,
            reviewee_id: req.body.reviewee_id,
            rating: req.body.rating,
            comment: req.body.comment
        });
        res.status(201).json({ ...review.toObject(), id: review._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Collaboration Invite Routes ---

app.get('/api/collaboration-invites', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: { message: 'User not found' } });

        const invites = await CollaborationInvite.find({ receiver_email: user.email })
            .populate('project_id', 'title')
            .populate('sender_id', 'fullName')
            .sort({ created_at: -1 });

        res.json(invites.map(inv => ({
            ...inv.toObject(),
            id: inv._id.toString(),
            project_title: inv.project_id?.title || 'Unknown Project',
            sender_name: inv.sender_id?.fullName || 'Unknown User',
            project_id: inv.project_id?._id?.toString() || inv.project_id?.toString(),
            sender_id: inv.sender_id?._id?.toString() || inv.sender_id?.toString()
        })));
    } catch (err) {
        console.error('Error fetching invites:', err);
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/collaboration-invites', authMiddleware, async (req, res) => {
    try {
        const invite = await CollaborationInvite.create({
            project_id: req.body.project_id,
            sender_id: req.user.userId,
            receiver_email: req.body.receiver_email.toLowerCase(),
            message: req.body.message
        });
        res.status(201).json({ ...invite.toObject(), id: invite._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.put('/api/collaboration-invites/:id', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const invite = await CollaborationInvite.findById(req.params.id);
        if (!invite) return res.status(404).json({ error: { message: 'Invite not found' } });

        invite.status = status;
        invite.receiver_id = req.user.userId;
        await invite.save();

        if (status === 'accepted') {
            // Add as collaborator (ignore duplicate)
            try {
                await ProjectCollaborator.create({
                    project_id: invite.project_id,
                    user_id: req.user.userId,
                    invited_by: invite.sender_id,
                    role: 'member'
                });
            } catch (e) {
                if (e.code !== 11000) throw e; // ignore duplicate
            }

            // Add friendship if not exists
            const existingFriendship = await Friendship.findOne({
                $or: [
                    { user_id_1: req.user.userId, user_id_2: invite.sender_id },
                    { user_id_1: invite.sender_id, user_id_2: req.user.userId }
                ]
            });
            if (!existingFriendship) {
                await Friendship.create({ user_id_1: req.user.userId, user_id_2: invite.sender_id });
            }
        }

        res.json({ ...invite.toObject(), id: invite._id.toString() });
    } catch (err) {
        console.error('Error updating invite:', err);
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Collaborative Projects (as collaborator) ---

app.get('/api/collaborative-projects', authMiddleware, async (req, res) => {
    try {
        const collaborations = await ProjectCollaborator.find({ user_id: req.user.userId });
        const projectIds = collaborations.map(c => c.project_id);
        if (projectIds.length === 0) return res.json([]);

        const projects = await Project.find({ _id: { $in: projectIds } })
            .populate('client_id', 'fullName')
            .sort({ created_at: -1 });

        res.json(projects.map(p => ({
            ...p.toObject(),
            id: p._id.toString()
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Friendship Routes ---

app.get('/api/friends/:userId', authMiddleware, async (req, res) => {
    try {
        const friendships = await Friendship.find({
            $or: [{ user_id_1: req.params.userId }, { user_id_2: req.params.userId }]
        });
        const friendIds = friendships.map(f =>
            f.user_id_1.toString() === req.params.userId ? f.user_id_2 : f.user_id_1
        );
        if (friendIds.length === 0) return res.json([]);

        const profiles = await Profile.find({ user_id: { $in: friendIds } });
        const users = await User.find({ _id: { $in: friendIds } }).select('fullName');

        res.json(profiles.map(p => {
            const u = users.find(u => u._id.toString() === p.user_id.toString());
            return {
                id: p.user_id.toString(),
                full_name: p.full_name || u?.fullName || 'User',
                avatar_url: p.avatar_url,
                position: p.position,
                company: p.company
            };
        }));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Admin: Get all users ---
app.get('/api/admin/users', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users.map(u => ({ ...u.toObject(), id: u._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Project Workspace Routes ---

app.get('/api/projects/:projectId/messages', authMiddleware, async (req, res) => {
    try {
        const messages = await Message.find({ project_id: req.params.projectId })
            .populate('sender_id', 'fullName')
            .sort({ created_at: 1 });
        res.json(messages.map(m => ({
            ...m.toObject(),
            id: m._id.toString(),
            sender_name: m.sender_id?.fullName || 'Unknown'
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/projects/:projectId/messages', authMiddleware, async (req, res) => {
    try {
        const message = new Message({
            project_id: req.params.projectId,
            sender_id: req.user.userId,
            content: req.body.content
        });
        await message.save();
        res.json({ ...message.toObject(), id: message._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/projects/:projectId/milestones', authMiddleware, async (req, res) => {
    try {
        const milestones = await Milestone.find({ project_id: req.params.projectId })
            .sort({ created_at: 1 });
        res.json(milestones.map(m => ({ ...m.toObject(), id: m._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/projects/:projectId/milestones', authMiddleware, async (req, res) => {
    try {
        const milestone = new Milestone({
            project_id: req.params.projectId,
            title: req.body.title,
            description: req.body.description
        });
        await milestone.save();
        res.json({ ...milestone.toObject(), id: milestone._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.patch('/api/milestones/:id', authMiddleware, async (req, res) => {
    try {
        const milestone = await Milestone.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json({ ...milestone.toObject(), id: milestone._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/projects/:projectId/files', authMiddleware, async (req, res) => {
    try {
        const files = await File.find({ project_id: req.params.projectId })
            .sort({ created_at: -1 });
        res.json(files.map(f => ({ ...f.toObject(), id: f._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/projects/:projectId/files', authMiddleware, async (req, res) => {
    try {
        const file = new File({
            project_id: req.params.projectId,
            uploader_id: req.user.userId,
            file_name: req.body.file_name,
            file_url: req.body.file_url,
            file_size: req.body.file_size
        });
        await file.save();
        res.json({ ...file.toObject(), id: file._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/projects/:projectId/collaborators', authMiddleware, async (req, res) => {
    try {
        const collaborators = await ProjectCollaborator.find({ project_id: req.params.projectId })
            .populate('user_id', 'fullName');
        
        const populated = await Promise.all(collaborators.map(async (c) => {
            const profile = await Profile.findOne({ user_id: c.user_id._id });
            return {
                ...c.toObject(),
                id: c._id.toString(),
                full_name: profile?.full_name || c.user_id.fullName || 'Unknown',
                avatar_url: profile?.avatar_url
            };
        }));
        res.json(populated);
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.delete('/api/projects/:projectId/collaborators', authMiddleware, async (req, res) => {
    try {
        await ProjectCollaborator.findOneAndDelete({ 
            project_id: req.params.projectId, 
            user_id: req.user.userId 
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Consultant Vault Routes ---

app.get('/api/vault/reports', authMiddleware, async (req, res) => {
    try {
        // Find reports owned by user OR shared with user's email
        const user = await User.findById(req.user.userId);
        const grants = await ReportAccessGrant.find({ granted_to_email: user.email.toLowerCase() });
        const sharedReportIds = grants.map(g => g.report_id);

        const reports = await ConsultantReport.find({
            $or: [
                { uploader_id: req.user.userId },
                { _id: { $in: sharedReportIds } }
            ]
        }).sort({ updated_at: -1 });

        // Add version info
        const populatedReports = await Promise.all(reports.map(async (r) => {
            const versions = await ReportVersion.find({ report_id: r._id }).sort({ version: -1 });
            return {
                ...r.toObject(),
                id: r._id.toString(),
                versions: versions.map(v => ({ ...v.toObject(), id: v._id.toString() }))
            };
        }));

        res.json(populatedReports);
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/vault/reports', authMiddleware, async (req, res) => {
    try {
        const report = new ConsultantReport({
            uploader_id: req.user.userId,
            title: req.body.title,
            description: req.body.description,
            format: req.body.format,
            file_url: req.body.file_url,
            file_size: req.body.file_size
        });
        await report.save();

        const version = new ReportVersion({
            report_id: report._id,
            version: 1,
            file_url: req.body.file_url,
            file_size: req.body.file_size,
            change_notes: req.body.change_notes || 'Initial version'
        });
        await version.save();

        res.json({ ...report.toObject(), id: report._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/vault/reports/:id/grants', authMiddleware, async (req, res) => {
    try {
        const grants = await ReportAccessGrant.find({ report_id: req.params.id });
        res.json(grants.map(g => ({ ...g.toObject(), id: g._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/vault/reports/:id/grants', authMiddleware, async (req, res) => {
    try {
        const grant = new ReportAccessGrant({
            report_id: req.params.id,
            granted_by: req.user.userId,
            granted_to_email: req.body.granted_to_email,
            expires_at: req.body.expires_at || null
        });
        await grant.save();
        res.json({ ...grant.toObject(), id: grant._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.delete('/api/vault/grants/:id', authMiddleware, async (req, res) => {
    try {
        await ReportAccessGrant.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/vault/audit-log', authMiddleware, async (req, res) => {
    try {
        const logs = await ReportAccessLog.find()
            .sort({ accessed_at: -1 })
            .limit(50);
        res.json(logs.map(l => ({ ...l.toObject(), id: l._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/vault/reports/:id/log', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const log = new ReportAccessLog({
            report_id: req.params.id,
            user_id: req.user.userId,
            user_email: user.email,
            action: req.body.action
        });
        await log.save();

        if (req.body.action === 'download' || req.body.action === 'view') {
            await ConsultantReport.findByIdAndUpdate(req.params.id, { $inc: { access_count: 1 } });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Admin Announcements ---

app.get('/api/announcements', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const announcements = await AdminAnnouncement.find({
            $or: [
                { target_role: 'all' },
                { target_role: user.role }
            ]
        }).sort({ created_at: -1 });
        res.json(announcements.map(a => ({ ...a.toObject(), id: a._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/admin/announcements', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const announcement = new AdminAnnouncement({
            ...req.body,
            created_by: req.user.userId
        });
        await announcement.save();
        res.json({ ...announcement.toObject(), id: announcement._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});


// --- Admin Announcements Extended ---

app.patch('/api/admin/announcements/:id/pin', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const a = await AdminAnnouncement.findByIdAndUpdate(
            req.params.id,
            { is_pinned: req.body.is_pinned },
            { new: true }
        );
        if (!a) return res.status(404).json({ error: { message: 'Not found' } });
        res.json({ ...a.toObject(), id: a._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.delete('/api/admin/announcements/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        await AdminAnnouncement.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// Get ALL announcements (for admin view - no role filter)
app.get('/api/admin/announcements', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const announcements = await AdminAnnouncement.find().sort({ is_pinned: -1, created_at: -1 });
        res.json(announcements.map(a => ({ ...a.toObject(), id: a._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Admin Stats ---
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const [totalUsers, totalProjects, allBids] = await Promise.all([
            User.countDocuments(),
            require('./models/Project').countDocuments(),
            require('./models/Bid').find({}, 'amount')
        ]);
        const totalRevenue = allBids.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
        res.json({ totalUsers, totalProjects, totalBids: allBids.length, totalRevenue });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Admin Analytics ---
app.get('/api/admin/analytics', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });

        // Users by role
        const usersRaw = await User.find({}, 'role createdAt');
        const roleCounts = {};
        const usersByMonth = {};
        usersRaw.forEach(u => {
            roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
            const month = new Date(u.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            usersByMonth[month] = (usersByMonth[month] || 0) + 1;
        });
        const usersByRole = Object.entries(roleCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1), value
        }));
        const userGrowth = Object.entries(usersByMonth).map(([month, users]) => ({ month, users })).slice(-6);

        // Projects by status
        const ProjectModel = require('./models/Project');
        const projectsRaw = await ProjectModel.find({}, 'status skills_required');
        const statusCounts = {};
        const skillCounts = {};
        projectsRaw.forEach(p => {
            statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
            (p.skills_required || []).forEach(sk => { skillCounts[sk] = (skillCounts[sk] || 0) + 1; });
        });
        const projectsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
            name: name.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), value
        }));
        const topSkills = Object.entries(skillCounts).map(([skill, count]) => ({ skill, count }))
            .sort((a, b) => b.count - a.count).slice(0, 10);

        res.json({ usersByRole, projectsByStatus, topSkills, userGrowth, consultancyBookings: [] });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Admin: Update User Role ---
app.put('/api/admin/users/:id/role', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ error: { message: 'User not found' } });
        res.json({ ...user.toObject(), id: user._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Admin: Update User Trust Level ---
app.patch('/api/admin/users/:id/trust', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const profile = await Profile.findOneAndUpdate(
            { user_id: req.params.id },
            { trust_level: req.body.trust_level },
            { new: true, upsert: true }
        );
        res.json({ ...profile.toObject(), id: profile._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Admin: Full user list with profiles/trust ---
app.get('/api/admin/users/full', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        const profiles = await Profile.find();
        const profileMap = {};
        profiles.forEach(p => { profileMap[p.user_id.toString()] = p; });
        res.json(users.map(u => {
            const p = profileMap[u._id.toString()];
            return {
                id: u._id.toString(),
                user_id: u._id.toString(),
                full_name: p?.full_name || u.fullName,
                email: u.email,
                role: u.role,
                trust_level: p?.trust_level || 'active',
                created_at: u.createdAt || u._id.getTimestamp()
            };
        }));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Skill Analytics Routes ---

app.get('/api/skill-analytics', authMiddleware, async (req, res) => {
    try {
        const skills = await SkillAnalytic.find({ user_id: req.user.userId }).sort({ skill: 1 });
        res.json(skills.map(s => ({ ...s.toObject(), id: s._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/skill-analytics', authMiddleware, async (req, res) => {
    try {
        const { skill, proficiency_level } = req.body;
        const doc = await SkillAnalytic.findOneAndUpdate(
            { user_id: req.user.userId, skill },
            { $set: { proficiency_level: proficiency_level || 1, updated_at: Date.now() } },
            { upsert: true, new: true }
        );
        res.json({ ...doc.toObject(), id: doc._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// AI: analyze skills - compute from DB data
app.post('/api/skill-analytics/analyze', authMiddleware, async (req, res) => {
    try {
        const skillDocs = await SkillAnalytic.find({ user_id: req.user.userId });
        if (skillDocs.length === 0) {
            return res.json({ skills: [], summary: null, insights: null });
        }
        const skills = skillDocs.map(s => s.toObject());
        const sorted = [...skills].sort((a, b) => (b.proficiency_level * 2 + b.projects_completed) - (a.proficiency_level * 2 + a.projects_completed));
        const strongestSkills = sorted.slice(0, 3).map(s => ({
            skill: s.skill,
            reason: `Level ${s.proficiency_level}/5 with ${s.projects_completed} project(s) completed`
        }));
        const improvementAreas = sorted.slice(-2).map(s => ({
            skill: s.skill,
            suggestion: `Practice more ${s.skill} projects to advance from level ${s.proficiency_level}`
        }));
        const insights = {
            strongestSkills,
            improvementAreas,
            recommendations: [
                { title: 'Expand your portfolio', description: 'Add portfolio projects showcasing your top skills to attract clients.', priority: 'high' },
                { title: 'Get certified', description: 'Certifications in your strongest skills increase bid success rates.', priority: 'medium' },
                { title: 'Explore new markets', description: 'Your experience qualifies you for premium freelance markets.', priority: 'low' }
            ],
            marketTrends: [
                'AI/ML skills are in high demand across industries',
                'Remote collaboration tools expertise is increasingly valued',
                'Full-stack development continues to command premium rates',
                'Cloud architecture skills unlock enterprise contracts'
            ]
        };
        const summary = {
            totalSkills: skills.length,
            totalProjects: skills.reduce((s, sk) => s + sk.projects_completed, 0),
            averageProficiency: +(skills.reduce((s, sk) => s + sk.proficiency_level, 0) / skills.length).toFixed(1)
        };
        res.json({ skills, insights, summary });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- AI Job Recommendations ---
app.post('/api/ai/job-recommendations', authMiddleware, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user_id: req.user.userId });
        const userSkills = profile?.skills || [];
        const ProjectModel = require('./models/Project');
        const openProjects = await ProjectModel.find({ status: 'open' })
            .populate('client_id', 'fullName')
            .sort({ created_at: -1 })
            .limit(20);

        if (openProjects.length === 0) {
            return res.json({ recommendations: [] });
        }

        // Score each project based on skill overlap
        const recommendations = openProjects.map(p => {
            const projectSkills = p.skills_required || [];
            const matchingSkills = projectSkills.filter(sk => userSkills.some(us =>
                us.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(us.toLowerCase())
            ));
            const score = projectSkills.length > 0
                ? Math.round((matchingSkills.length / projectSkills.length) * 100)
                : Math.floor(Math.random() * 40) + 30;
            const reasons = matchingSkills.length > 0
                ? `Your ${matchingSkills.slice(0, 2).join(', ')} skills match this project's requirements`
                : 'This project aligns with your experience level and earning potential';
            return {
                project_id: p._id.toString(),
                score: Math.max(score, 20),
                reason: reasons,
                project: {
                    id: p._id.toString(),
                    title: p.title,
                    description: p.description,
                    budget: p.budget,
                    skills_required: p.skills_required || [],
                    deadline: p.deadline
                }
            };
        }).sort((a, b) => b.score - a.score).slice(0, 5);

        res.json({ recommendations });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Disputes Routes ---

app.get('/api/disputes', authMiddleware, async (req, res) => {
    try {
        let query = req.user.role === 'admin' ? {} : { raised_by: req.user.userId };
        const disputes = await Dispute.find(query).sort({ created_at: -1 });
        res.json(disputes.map(d => ({ ...d.toObject(), id: d._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/disputes', authMiddleware, async (req, res) => {
    try {
        const dispute = await Dispute.create({ ...req.body, raised_by: req.user.userId });
        res.status(201).json({ ...dispute.toObject(), id: dispute._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.put('/api/disputes/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const update = {
            status: req.body.status,
            resolution_notes: req.body.resolution_notes || '',
            resolved_by: req.user.userId,
            resolved_at: new Date()
        };
        const dispute = await Dispute.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!dispute) return res.status(404).json({ error: { message: 'Dispute not found' } });
        res.json({ ...dispute.toObject(), id: dispute._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Content Moderation Routes ---

app.get('/api/content-moderation', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const items = await ContentModeration.find().sort({ created_at: -1 });
        res.json(items.map(i => ({ ...i.toObject(), id: i._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/content-moderation', authMiddleware, async (req, res) => {
    try {
        const item = await ContentModeration.create({ ...req.body, reported_by: req.user.userId });
        res.status(201).json({ ...item.toObject(), id: item._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.put('/api/content-moderation/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });
        const update = {
            status: 'reviewed',
            action_taken: req.body.action_taken,
            moderator_notes: req.body.moderator_notes || '',
            reviewed_by: req.user.userId,
            reviewed_at: new Date()
        };
        const item = await ContentModeration.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!item) return res.status(404).json({ error: { message: 'Item not found' } });
        res.json({ ...item.toObject(), id: item._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});


// --- Consultancy Booking Routes ---

// Get bookings (for the current user as consultant or client)
app.get('/api/consultancy-bookings', authMiddleware, async (req, res) => {
    try {
        const query = req.user.role === 'consultant'
            ? { consultant_id: req.user.userId }
            : { client_id: req.user.userId };
        const bookings = await ConsultancyBooking.find(query)
            .sort({ session_date: 1 })
            .populate('client_id', 'fullName email')
            .populate('consultant_id', 'fullName email');
        res.json(bookings.map(b => ({
            ...b.toObject(),
            id: b._id.toString(),
            profiles: { full_name: b.client_id?.fullName || 'Client' }
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error fetching bookings' } });
    }
});

// Create a booking (client books a consultant)
app.post('/api/consultancy-bookings', authMiddleware, async (req, res) => {
    try {
        const booking = new ConsultancyBooking({
            consultant_id: req.body.consultant_id,
            client_id: req.user.userId,
            session_date: new Date(req.body.session_date),
            duration_minutes: req.body.duration_minutes || 60,
            notes: req.body.notes || ''
        });
        await booking.save();

        // Notify consultant
        try {
            const notification = new Notification({
                user_id: req.body.consultant_id,
                type: 'booking',
                title: 'New Consultation Booking',
                message: `A client has booked a session with you for ${new Date(req.body.session_date).toLocaleString()}`
            });
            await notification.save();
        } catch { /* non-critical */ }

        res.status(201).json({ ...booking.toObject(), id: booking._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error creating booking' } });
    }
});

// Update booking status
app.patch('/api/consultancy-bookings/:id', authMiddleware, async (req, res) => {
    try {
        const booking = await ConsultancyBooking.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status, report_url: req.body.report_url },
            { new: true }
        );
        if (!booking) return res.status(404).json({ error: { message: 'Booking not found' } });
        res.json({ ...booking.toObject(), id: booking._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error updating booking' } });
    }
});

// Get all consultants (for clients to browse and book)
app.get('/api/consultants', authMiddleware, async (req, res) => {
    try {
        const consultants = await User.find({ role: 'consultant' }, 'fullName email _id');
        const profiles = await Profile.find({ user_id: { $in: consultants.map(u => u._id) } });
        const profileMap = {};
        profiles.forEach(p => { profileMap[p.user_id.toString()] = p; });

        res.json(consultants.map(u => ({
            id: u._id.toString(),
            user_id: u._id.toString(),
            fullName: u.fullName,
            email: u.email,
            bio: profileMap[u._id.toString()]?.bio || null,
            position: profileMap[u._id.toString()]?.position || 'Consultant',
            skills: profileMap[u._id.toString()]?.skills || [],
            hourly_rate: profileMap[u._id.toString()]?.hourly_rate || null
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error fetching consultants' } });
    }
});

// --- Skill Analytics Routes ---
app.get('/api/skill-analytics', authMiddleware, async (req, res) => {
    try {
        const analytics = await SkillAnalytic.find({ user_id: req.user.userId });
        res.json(analytics.map(a => ({ ...a.toObject(), id: a._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Collaboration Routes ---
app.get('/api/collaboration-invites', authMiddleware, async (req, res) => {
    try {
        // If we have User.email we can find invites sent to this email
        const user = await User.findById(req.user.userId);
        const invites = await CollaborationInvite.find({ 
            $or: [
                { receiver_id: req.user.userId },
                { receiver_email: user.email }
            ]
        }).populate('project_id', 'title').populate('sender_id', 'fullName');
        
        res.json(invites.map(i => ({
            ...i.toObject(),
            id: i._id.toString(),
            project_title: i.project_id?.title || 'Unknown Project',
            sender_name: i.sender_id?.fullName || 'Someone'
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.put('/api/collaboration-invites/:id', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const invite = await CollaborationInvite.findById(req.params.id);
        if (!invite) return res.status(404).json({ error: { message: 'Invite not found' } });
        
        invite.status = status;
        await invite.save();

        if (status === 'accepted') {
            // Add as collaborator
            await ProjectCollaborator.findOneAndUpdate(
                { project_id: invite.project_id, user_id: req.user.userId },
                { role: 'member', invited_by: invite.sender_id },
                { upsert: true }
            );
            
            // Add friendship/connection
            await Friendship.findOneAndUpdate(
                { 
                    $or: [
                        { user_id_1: invite.sender_id, user_id_2: req.user.userId },
                        { user_id_1: req.user.userId, user_id_2: invite.sender_id }
                    ]
                },
                { user_id_1: invite.sender_id, user_id_2: req.user.userId },
                { upsert: true }
            );
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/collaborative-projects', authMiddleware, async (req, res) => {
    try {
        const collaborations = await ProjectCollaborator.find({ user_id: req.user.userId }).populate('project_id');
        res.json(collaborations.map(c => ({
            ...c.project_id.toObject(),
            id: c.project_id._id.toString()
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- AI Routes ---
app.get('/api/ai/job-recommendations', authMiddleware, async (req, res) => {
    try {
        // Mock AI recommendations based on user skills
        const profile = await Profile.findOne({ user_id: req.user.userId });
        const userSkills = profile?.skills || [];
        
        // Find projects that match user skills
        const projects = await Project.find({
            $or: [
                { skills_required: { $in: userSkills } },
                { category: { $in: userSkills } }
            ],
            status: 'open'
        }).limit(5);

        res.json(projects.map(p => ({
            ...p.toObject(),
            id: p._id.toString(),
            match_score: 85 + Math.floor(Math.random() * 15),
            match_reason: 'Matches your core skills'
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Profile Detail Routes (fixing 404/undefined issues) ---

app.get('/api/profile/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId === 'undefined' ? req.user.userId : req.params.userId;
        const profile = await Profile.findOne({ user_id: userId }).populate('user_id', 'fullName email role');
        if (!profile) return res.status(404).json({ error: { message: 'Profile not found' } });
        res.json({ ...profile.toObject(), id: profile._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/portfolio/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId === 'undefined' ? req.user.userId : req.params.userId;
        const items = await PortfolioItem.find({ user_id: userId });
        res.json(items.map(i => ({ 
            ...i.toObject(), 
            id: i._id.toString(),
            live_url: i.project_url // Map project_url to live_url for frontend
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/work-experience/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId === 'undefined' ? req.user.userId : req.params.userId;
        const items = await WorkExperience.find({ user_id: userId });
        res.json(items.map(i => ({ ...i.toObject(), id: i._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/certifications/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId === 'undefined' ? req.user.userId : req.params.userId;
        const items = await Certification.find({ user_id: userId });
        res.json(items.map(i => ({ ...i.toObject(), id: i._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/reviews/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId === 'undefined' ? req.user.userId : req.params.userId;
        const items = await Review.find({ reviewee_id: userId }).populate('reviewer_id', 'fullName avatar_url');
        res.json(items.map(i => ({ 
            ...i.toObject(), 
            id: i._id.toString(),
            reviewer_name: i.reviewer_id?.fullName || 'Anonymous',
            reviewer_avatar: i.reviewer_id?.avatar_url,
            // Keep profiles for backward compatibility in Profile.tsx interface if needed
            profiles: { 
                full_name: i.reviewer_id?.fullName || 'Anonymous',
                avatar_url: i.reviewer_id?.avatar_url
            }
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/friends/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId === 'undefined' ? req.user.userId : req.params.userId;
        const friends = await Friendship.find({
            $or: [{ user_id_1: userId }, { user_id_2: userId }]
        }).populate('user_id_1', 'fullName email role').populate('user_id_2', 'fullName email role');
        
        res.json(friends.map(f => {
            const friend = f.user_id_1._id.toString() === userId ? f.user_id_2 : f.user_id_1;
            return {
                ...friend.toObject(),
                id: friend._id.toString()
            };
        }));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- User Profile & Detail Write Routes ---

app.put('/api/profile', authMiddleware, async (req, res) => {
    try {
        const { full_name, bio, skills, location, hourly_rate, phone, company, website, position, linkedin, github, avatar_url } = req.body;
        
        // Update Profile
        const profile = await Profile.findOneAndUpdate(
            { user_id: req.user.userId },
            { 
                $set: { 
                    full_name, bio, skills, location, hourly_rate, phone, 
                    company, website, position, linkedin, github, avatar_url,
                    updated_at: Date.now()
                } 
            },
            { new: true, upsert: true }
        );

        // Also update the User's fullName for consistency across the app
        if (full_name) {
            await User.findByIdAndUpdate(req.user.userId, { fullName: full_name });
        }

        res.json({ ...profile.toObject(), id: profile._id.toString() });
    } catch (err) {
        console.error('Profile Update Error:', err);
        res.status(500).json({ error: { message: 'Server error updating profile' } });
    }
});

app.post('/api/portfolio', authMiddleware, async (req, res) => {
    try {
        const data = { ...req.body, user_id: req.user.userId };
        if (data.live_url) data.project_url = data.live_url; // Map frontend live_url to backend project_url
        const item = await PortfolioItem.create(data);
        res.status(201).json({ ...item.toObject(), id: item._id.toString(), live_url: item.project_url });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.put('/api/portfolio/:id', authMiddleware, async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.live_url) data.project_url = data.live_url;
        const item = await PortfolioItem.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.userId },
            { $set: data },
            { new: true }
        );
        if (!item) return res.status(404).json({ error: { message: 'Item not found' } });
        res.json({ ...item.toObject(), id: item._id.toString(), live_url: item.project_url });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.delete('/api/portfolio/:id', authMiddleware, async (req, res) => {
    try {
        await PortfolioItem.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/work-experience', authMiddleware, async (req, res) => {
    try {
        const item = await WorkExperience.create({ ...req.body, user_id: req.user.userId });
        res.status(201).json({ ...item.toObject(), id: item._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/certifications', authMiddleware, async (req, res) => {
    try {
        const item = await Certification.create({ ...req.body, user_id: req.user.userId });
        res.status(201).json({ ...item.toObject(), id: item._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/reviews', authMiddleware, async (req, res) => {
    try {
        const review = await Review.create({ 
            ...req.body, 
            reviewer_id: req.user.userId 
        });
        
        // Update user rating average (optional but good)
        const reviews = await Review.find({ reviewee_id: req.body.reviewee_id });
        const avg = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;
        
        await Profile.findOneAndUpdate(
            { user_id: req.body.reviewee_id },
            { avg_rating: avg }
        );

        res.status(201).json({ ...review.toObject(), id: review._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error creating review' } });
    }
});

// --- Bidding Routes ---

app.get('/api/bids', authMiddleware, async (req, res) => {
    try {
        const bids = await Bid.find({ freelancer_id: req.user.userId }).populate('project_id');
        res.json(bids.map(b => ({
            ...b.toObject(),
            id: b._id.toString(),
            project: b.project_id
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/projects/:projectId/bids', authMiddleware, async (req, res) => {
    try {
        const bid = await Bid.create({
            ...req.body,
            project_id: req.params.projectId,
            freelancer_id: req.user.userId,
            status: 'pending'
        });
        
        // Notify client
        const project = await Project.findById(req.params.projectId);
        if (project) {
            await Notification.create({
                user_id: project.client_id,
                type: 'bid',
                title: 'New Bid Received',
                message: `You received a new bid for project: ${project.title}`
            });
        }

        res.status(201).json({ ...bid.toObject(), id: bid._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.get('/api/projects/:projectId/bids', authMiddleware, async (req, res) => {
    try {
        const bids = await Bid.find({ project_id: req.params.projectId }).populate('freelancer_id', 'fullName email');
        res.json(bids.map(b => ({
            ...b.toObject(),
            id: b._id.toString(),
            profiles: { full_name: b.freelancer_id?.fullName || 'Freelancer' }
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.put('/api/bids/:id', authMiddleware, async (req, res) => {
    try {
        const bid = await Bid.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!bid) return res.status(404).json({ error: { message: 'Bid not found' } });
        
        // If accepted, mark project as in_progress? 
        if (req.body.status === 'accepted') {
            await Project.findByIdAndUpdate(bid.project_id, { status: 'in_progress' });
            
            // Notify freelancer
            await Notification.create({
                user_id: bid.freelancer_id,
                type: 'bid_accepted',
                title: 'Bid Accepted!',
                message: `Your bid has been accepted. You can now start working on the project.`
            });
        }

        res.json({ ...bid.toObject(), id: bid._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Notification Routes ---

app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ user_id: req.user.userId }).sort({ created_at: -1 });
        res.json(notifications.map(n => ({
            ...n.toObject(),
            id: n._id.toString()
        })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { is_read: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany({ user_id: req.user.userId }, { is_read: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

// --- Achievement Routes ---

app.get('/api/achievements/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId === 'undefined' ? req.user.userId : req.params.userId;
        const items = await Achievement.find({ user_id: userId });
        res.json(items.map(i => ({ ...i.toObject(), id: i._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.post('/api/achievements', authMiddleware, async (req, res) => {
    try {
        const item = await Achievement.create({ ...req.body, user_id: req.user.userId });
        res.status(201).json({ ...item.toObject(), id: item._id.toString() });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.delete('/api/achievements/:id', authMiddleware, async (req, res) => {
    try {
        await Achievement.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
