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

        res.json({ user });
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
        
        // Format for frontend
        const formattedProjects = projects.map(p => {
            const doc = p.toObject();
            if (doc.client_id) {
                // frontend expects project.profiles.full_name
                doc.profiles = { full_name: doc.client_id.fullName };
                // Keep client_id as string to match schema format initially expected
                doc.client_id = doc.client_id._id.toString();
            }
            // For dashboard bids count stub
            doc.bids = [{ count: 0 }];
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

// Get Achievements for a user
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

// Delete Achievement
app.delete('/api/achievements/:id', authMiddleware, async (req, res) => {
    try {
        const achievement = await Achievement.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
