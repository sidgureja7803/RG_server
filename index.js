const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const passport = require('./config/passport');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log("Database connection established");

    // Middlewares
    app.use(cors({
      origin: process.env.CLIENT_URL,
      credentials: true
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(morgan('dev'));
    app.use(passport.initialize());

    // Serve static files from the uploads directory
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Routes will be imported here
    const authRoutes = require('./routes/auth.routes');
    const resumeRoutes = require('./routes/resume.routes');
    const userRoutes = require('./routes/user.routes');
    const templateRoutes = require('./routes/template.routes');

    // Register routes
    app.use('/api/auth', authRoutes);
    app.use('/api/resumes', resumeRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/templates', templateRoutes);

    // Basic route
    app.get('/', (req, res) => {
      res.send('Resume Generator API is running');
    });

    // Error handler middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? {} : err
      });
    });

    // Start the server after the DB connection is established
    app.listen(PORT, () => {
      console.log("Server is successfully listening on port", PORT);
    });
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });
