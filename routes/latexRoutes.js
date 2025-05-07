import express from 'express';
import { compileLatex, saveDocument, getDocument } from '../controllers/latexController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Compile LaTeX to PDF
router.post('/compile', compileLatex);

// Save LaTeX document
router.post('/save', saveDocument);

// Get LaTeX document
router.get('/document/:documentId', getDocument);

export default router; 