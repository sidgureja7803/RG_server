import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware.js';
import { searchJobsController, getJobRecommendationsController } from '../controllers/job.controller.js';

const router = express.Router();

// @route   POST /api/jobs/search
// @desc    Search jobs based on resume content and optional location
// @access  Private
router.post('/search',
  authenticate,
  [
    body('query').notEmpty().trim().escape(),
    body('location').optional().trim().escape(),
  ],
  searchJobsController
);

// @route   POST /api/jobs/recommendations
// @desc    Get job recommendations based on resume content
// @access  Private
router.post('/recommendations',
  authenticate,
  [
    body('resumeContent').notEmpty(),
  ],
  getJobRecommendationsController
);

export default router; 