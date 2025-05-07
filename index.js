import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import passport from 'passport';
import { rateLimiterMiddleware } from './config/rateLimiter.js';
import { connectDatabase } from './config/database.js';
import { initializeSocketIO } from './services/collaboration.service.js';
import './config/passport.js'; // Initialize passport strategies
import path from 'path';
import { fileURLToPath } from 'url';
import errorHandler from './middleware/error.middleware.js';
import routes from './routes/index.js';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import latexRoutes from './routes/latexRoutes.js';
import { initializeSocketIO as socketIOInit } from './services/socketService.js';
import atsRoutes from './routes/atsRoutes.js';
import templateRoutes from './routes/templateRoutes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Connect to MongoDB
connectDatabase()
  .then(() => console.log('Database connected successfully'))
  .catch((err) => console.error('Database connection error:', err));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use(mongoSanitize());
app.use(xss());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://resumeforge-nine.vercel.app', 'https://resumeforge-sidgureja7803s-projects.vercel.app']
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
};

// Handle OPTIONS requests early for CORS preflight
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Compression
app.use(compression());

// Rate limiting
app.use(rateLimiterMiddleware);

// Passport middleware
app.use(passport.initialize());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);
app.use('/api/latex', latexRoutes);
app.use('/api/ats', atsRoutes);
app.use('/api/templates', templateRoutes);

// Error handling
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // Start HTTP server
    server = httpServer.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Initialize Socket.IO
    const io = initializeSocketIO(httpServer);

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  console.log('Received shutdown signal. Starting graceful shutdown...');
  
  try {
    // Close HTTP server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('HTTP server closed');
    }

    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('Database connection closed');
    }

    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
