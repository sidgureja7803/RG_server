import express from 'express';
import authRoutes from './auth.routes.js';
import resumeRoutes from './resume.routes.js';
import userRoutes from './user.routes.js';
import jobRoutes from './job.routes.js';
import templateRoutes from './template.routes.js';
import commentRoutes from './comment.routes.js';
import versionRoutes from './version.routes.js';
import analyzerRoutes from './analyzer.routes.js';

const router = express.Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/resumes', resumeRoutes);
router.use('/users', userRoutes);
router.use('/templates', templateRoutes);
router.use('/jobs', jobRoutes);
router.use('/analyzer', analyzerRoutes);

// Version and comment routes are mounted within resume routes
// See resume.routes.js

export default router; 