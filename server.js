                                                                                                                                                   const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const { sequelize } = require('./models');
const WebSocketService = require('./services/websocketService');
const DueDateNotificationService = require('./services/dueDateNotificationService');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      // Railway deployment URLs
      'https://tasket-production.up.railway.app',
      'https://tasket-backend-production.up.railway.app',
      // For dynamic subdomain support
      /\.railway\.app$/
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize WebSocket service
const websocketService = new WebSocketService(io);

// Initialize Due Date Notification service
const dueDateNotificationService = new DueDateNotificationService(websocketService);

// Make WebSocket service available to routes
app.set('websocketService', websocketService);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  // Railway deployment URLs
  'https://tasket-production.up.railway.app',
  'https://tasket-backend-production.up.railway.app',
  // For dynamic subdomain support
  /\.railway\.app$/
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches Railway pattern
    const isAllowedOrigin = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowedOrigin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve static frontend files in production
// NOTE: This is a backend-only API. The following code is for local development only.
// In production, the frontend should be served separately.
if (process.env.NODE_ENV === 'production' && process.env.SERVE_FRONTEND === 'true') {
  // Serve static files from the frontend build
  app.use(express.static(path.join(__dirname, '../tasket/dist')));
  
  // Handle React Router - send all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../tasket/dist/index.html'));
  });
} else {
  // In development, we still need to serve static files but not interfere with API routes
  // The catch-all handler should only apply to truly unmatched routes
  // But we should not interfere with static file serving
  // 404 handler for unmatched API routes only
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API route not found' });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      message: 'Duplicate entry',
      field: err.errors[0]?.path
    });
  }
  
  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum size is 10MB for task attachments and 5MB for images.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files uploaded. Maximum is 10 attachments per task.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected field in upload. Please check your form data.' });
    }
    // Handle any other Multer errors
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Use port from environment variable (Railway) or default to 5002
// Railway sets the PORT environment variable
const PORT = process.env.PORT || 5002;

// Database connection and server start
const startServer = async () => {
  console.log('Starting server initialization...');
  try {
    console.log('Attempting database connection...');
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    console.log('Synchronizing database...');
    // Sync database (don't force recreate to preserve seeded data)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database synchronized successfully.');
    
    // Start server
    console.log(`Attempting to start server on port ${PORT}`);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
      
      // Show which database we're using
      if (process.env.DATABASE_URL) {
        console.log(`💾 Database: PostgreSQL (via DATABASE_URL)`);
      } else if (process.env.DB_NAME) {
        console.log(`💾 Database: PostgreSQL (${process.env.DB_NAME})`);
      } else {
        console.log(`💾 Database: SQLite (development mode)`);
      }
      
      console.log(`🔌 WebSocket server enabled`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error.name, error.message);
    console.error('Error stack:', error.stack);
    console.error('Details:', {
      DATABASE_URL: process.env.DATABASE_URL ? 'Present' : 'Not set',
      DB_NAME: process.env.DB_NAME,
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT
    });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;