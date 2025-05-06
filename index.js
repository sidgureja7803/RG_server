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

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Connect to MongoDB
connectDatabase()
  .then(() => console.log('Database connected successfully'))
  .catch((err) => console.error('Database connection error:', err));

// Initialize Socket.IO for real-time collaboration
initializeSocketIO(httpServer);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://resumeforge-nine.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(helmet());
app.use(compression());
app.use(passport.initialize());
app.use(rateLimiterMiddleware);

// Sanitize data
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Uploads directory
app.use('/uploads', express.static('uploads'));

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', routes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Resume Generator API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// Apply error handler
app.use(errorHandler);

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;
