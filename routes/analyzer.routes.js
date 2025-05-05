import express from 'express';
import { 
  analyzeResume,
  analyzeResumeWithJobDescription,
  getAnalysisHistory,
  saveAnalysisResult,
  analyzeMatch
} from '../controllers/analyzer.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { body } from 'express-validator';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Protect most analyzer routes
router.use('/analyze', authenticate);
router.use('/analyze-with-job', authenticate);
router.use('/history', authenticate);
router.use('/save', authenticate);

// @route   POST /api/analyzer/analyze
// @desc    Analyze a resume without a job description
// @access  Private
router.post('/analyze', [
  body('resumeId').isMongoId()
], analyzeResume);

// @route   POST /api/analyzer/analyze-with-job
// @desc    Analyze a resume against a job description
// @access  Private
router.post('/analyze-with-job', [
  body('resumeId').isMongoId(),
  body('jobDescription').notEmpty()
], analyzeResumeWithJobDescription);

// @route   GET /api/analyzer/history
// @desc    Get analysis history for the user
// @access  Private
router.get('/history', getAnalysisHistory);

// @route   POST /api/analyzer/save
// @desc    Save an analysis result
// @access  Private
router.post('/save', [
  body('resumeId').isMongoId(),
  body('analysisResult').isObject(),
  body('jobDescription').optional()
], saveAnalysisResult);

// Route for analyzing resume match - No auth for testing
router.post('/match', upload.single('resume'), analyzeMatch);

export default router; 