import express from 'express';
import multer from 'multer';
import {
  getTemplates,
  uploadTemplate,
  deleteTemplate,
  getTemplateContent
} from '../controllers/templateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Protected routes (require authentication)
router.use(protect);

// Get all templates (public and user's own)
router.get('/', getTemplates);

// Upload new template
router.post('/upload', upload.single('file'), uploadTemplate);

// Delete template
router.delete('/:templateId', deleteTemplate);

// Get template content
router.get('/:templateId/content', getTemplateContent);

export default router; 