// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS Configuration (YOUR EXISTING CODE - KEEP AS IS)
// Allow configuring the frontend origin via `FRONTEND_URL` environment variable.
// When deploying, set FRONTEND_URL to your frontend's domain (e.g. https://my-app.onrender.com).
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ✅ Multer for image upload (YOUR EXISTING CODE - KEEP AS IS)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ✅ MongoDB Connection (YOUR EXISTING CODE - KEEP AS IS)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.log('MongoDB Error:', err.message);
    console.log('Using Demo Mode (data resets on restart)');
  });

// ✅ Schemas (YOUR EXISTING CODE - KEEP AS IS)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}, { timestamps: true });

const PinSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  image: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Pin = mongoose.model('Pin', PinSchema);

// ✅ Demo Mode Fallback (YOUR EXISTING CODE - KEEP AS IS)
let demoPins = [];

// ✅ JWT Middleware (YOUR EXISTING CODE - KEEP AS IS)
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

// ========================
// ✅ NEW UPLOAD ROUTES ADD HERE
// ========================

// Upload image to uploads/ folder
app.post('/api/upload/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      message: 'File uploaded successfully to uploads/ folder',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all uploaded files from uploads/ folder
app.get('/api/upload/files', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir);
    const fileList = files.map(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime,
        url: `/uploads/${file}`
      };
    });
    
    res.json({ files: fileList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test route to check uploads folder contents
app.get('/api/uploads-list', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir);
    res.json({ 
      message: `Found ${files.length} files in uploads folder`,
      files: files 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// ✅ YOUR EXISTING ROUTES (KEEP ALL AS IS)
// ========================

// === TEST ROUTE ===
app.get('/api/test', (req, res) => res.json({ msg: 'API Working!' }));

// === AUTH ROUTES ===
// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    user = new User({ username, email, password: hashed });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username, email } });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email } });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// === PIN ROUTES ===

// GET ALL PINS – SEARCH + PAGINATION (Used by /explore)
app.get('/api/pins', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(search.trim(), 'i');

    let pins = [];
    let total = 0;
    let hasMore = false;

    if (mongoose.connection.readyState === 1) {
      const query = search
        ? { $or: [{ title: searchRegex }, { description: searchRegex }] }
        : {};

      pins = await Pin.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit) + 1)
        .populate('userId', 'username');

      total = await Pin.countDocuments(query);
      hasMore = pins.length > parseInt(limit);
      if (hasMore) pins = pins.slice(0, parseInt(limit));
    } else {
      const filtered = demoPins.filter(p =>
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
      );

      pins = filtered
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(skip, skip + parseInt(limit));

      total = filtered.length;
      hasMore = skip + pins.length < total;
    }

    res.json({ pins, total, hasMore });
  } catch (err) {
    console.error('GET /api/pins error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Pin (with authentication)
app.post('/api/pins', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'Image file is required' });
    }

    const pinData = {
      title: req.body.title,
      description: req.body.description || '',
      image: `/uploads/${req.file.filename}`,
      userId: req.user.id // Use authenticated user's ID
    };

    if (mongoose.connection.readyState === 1) {
      const newPin = new Pin(pinData);
      await newPin.save();
      const populated = await Pin.findById(newPin._id).populate('userId', 'username');
      res.status(201).json(populated);
    } else {
      // Demo mode fallback
      const demoPin = { ...pinData, _id: Date.now().toString(), createdAt: new Date(), userId: { _id: req.user.id, username: 'demo_user' } };
      demoPins.push(demoPin);
      res.status(201).json(demoPin);
    }
  } catch (err) {
    console.error('Pin creation error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// Get User Pins (Profile)
app.get('/api/pins/user/:userId', async (req, res) => {
  try {
    console.log(`🔄 Fetching pins for user: ${req.params.userId}`);
    
    if (mongoose.connection.readyState === 1) {
      const pins = await Pin.find({ userId: req.params.userId })
        .sort({ createdAt: -1 })
        .populate('userId', 'username');
      
      console.log(`✅ Found ${pins.length} pins`);
      res.json(pins);
    } else {
      // Demo mode - return all demo pins (or filter if you have user info)
      const pins = demoPins;
      console.log(`✅ Demo mode: Found ${pins.length} pins`);
      res.json(pins);
    }
  } catch (err) {
    console.error('❌ Error in /api/pins/user/:userId:', err.message);
    res.status(500).json({ 
      msg: 'Failed to load user pins',
      error: err.message 
    });
  }
});

// Update Pin (with authentication)
app.put('/api/pins/:id', authenticate, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let pin = await Pin.findById(req.params.id);
      if (!pin) return res.status(404).json({ msg: 'Pin not found' });
      if (pin.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

      pin = await Pin.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(pin);
    } else {
      const index = demoPins.findIndex(p => p._id === req.params.id);
      if (index === -1) return res.status(404).json({ msg: 'Not found' });
      // Add auth check for demo mode if needed
      demoPins[index] = { ...demoPins[index], ...req.body };
      res.json(demoPins[index]);
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});
// Delete Pin (with authentication)
app.delete('/api/pins/:id', authenticate, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const pin = await Pin.findById(req.params.id);
      if (!pin) return res.status(404).json({ msg: 'Pin not found' });
      if (pin.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

      await Pin.findByIdAndDelete(req.params.id);
      res.json({ msg: 'Deleted' });
    } else {
      demoPins = demoPins.filter(p => p._id !== req.params.id);
      res.json({ msg: 'Deleted' });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Add this with your other routes in server.js

// Get user's pin history
// Get recent pins for history
app.get('/api/history', async (req, res) => {
  try {
    let historyPins = [];

    if (mongoose.connection.readyState === 1) {
      // Get recent pins from MongoDB
      historyPins = await Pin.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('userId', 'username')
        .select('title description image userId createdAt');
    } else {
      // Get from demo pins
      historyPins = demoPins
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20)
        .map(pin => ({
          ...pin,
          username: 'demo_user' // Add username for demo
        }));
    }

    res.json(historyPins);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ message: 'Error loading history' });
  }
});

// ✅ Create uploads folder (YOUR EXISTING CODE - KEEP AS IS)
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ✅ Start Server (YOUR EXISTING CODE - KEEP AS IS)
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Test: http://localhost:${PORT}/api/test`);
});