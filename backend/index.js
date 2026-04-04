// Load environment variables FIRST before anything else
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware setup - MUST come before routes
app.use(cors({
  origin: "*",
  methods: "GET,POST,PATCH,DELETE,PUT",
  allowedHeaders: "Content-Type, Authorization"
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Importing routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const mrvRoutes = require('./routes/mrvRoutes');
const mintRoutes = require('./routes/mintRoutes');
const mlRoutes = require('./routes/MLRoutes');

// Routes middleware - mount routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/mrv', mrvRoutes);
app.use('/api/admin', mintRoutes);
app.use('/api/ml', mlRoutes);

// Ensure uploads directory exists and serve it statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Root route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Veriflow API Server is running', status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Connecting to database
const connectDB = async () => {
  const primaryUrl = process.env.MONGO_URL;
  const fallbackUrl = process.env.MONGO_URL_FALLBACK || 'mongodb://localhost:27017/veriflow';

  const mongoOptions = {
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 60000,
  };

  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URL:', primaryUrl ? 'Set' : 'NOT SET');

    await mongoose.connect(primaryUrl, mongoOptions);
    console.log('✓ Connected to MongoDB database successfully (primary)');
  } catch (primaryErr) {
    console.error('✗ Primary MongoDB connection failed:', primaryErr.message);

    try {
      console.log('Attempting fallback MongoDB connection...');
      await mongoose.connect(fallbackUrl, mongoOptions);
      console.log('✓ Connected to MongoDB database successfully (fallback/local)');
    } catch (fallbackErr) {
      console.error('✗ Fallback MongoDB connection failed:', fallbackErr.message);
      console.error('Full fallback error:', fallbackErr);
      process.exit(1);
    }
  }
};

// Starting the server
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, HOST, () => {
    const hostLabel = HOST || 'localhost';
    console.log(`✓ Server is running on port ${PORT}`);
    console.log(`✓ API endpoints available at: http://localhost:${PORT}/api`);
    console.log(`✓ Network access: http://${hostLabel}:${PORT}/api`);
    console.log(`✓ Auth endpoints: http://localhost:${PORT}/api/auth/login`);
    console.log(`✓ Auth endpoints: http://localhost:${PORT}/api/auth/register`);
  });
};

startServer();