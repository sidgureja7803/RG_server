import express from 'express';
import { analyzeResume, getAnalysisHistory, saveAnalysis } from '../controllers/atsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Analyze resume against job description
router.post('/analyze', analyzeResume);

// Save analysis results
router.post('/save-analysis', saveAnalysis);

// Get analysis history
router.get('/analysis-history', getAnalysisHistory);

export default router; 