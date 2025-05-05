import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  uploadTemplateImage
} from '../controllers/template.controller.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'public', 'templates'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, .png, and .webp files are allowed'));
    }
  }
});

// Public routes
router.get('/', getTemplates);
router.get('/:id', getTemplateById);

// Admin routes
router.use(authenticate);
router.use(isAdmin);

// Handle template image uploads (thumbnail and preview)
router.post('/upload-image', upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'previewImage', maxCount: 1 }
]), uploadTemplateImage);

router.post('/', [
  body('name').trim().notEmpty().withMessage('Template name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('thumbnail').trim().notEmpty().withMessage('Thumbnail URL is required'),
  body('previewImage').trim().notEmpty().withMessage('Preview image URL is required'),
  body('structure').isObject().withMessage('Template structure is required'),
  body('category').isIn(['Modern', 'Professional', 'Creative', 'Simple', 'Academic'])
    .withMessage('Invalid category')
], createTemplate);

router.put('/:id', [
  body('name').optional().trim().notEmpty().withMessage('Template name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('thumbnail').optional().trim().notEmpty().withMessage('Thumbnail URL cannot be empty'),
  body('previewImage').optional().trim().notEmpty().withMessage('Preview image URL cannot be empty'),
  body('structure').optional().isObject().withMessage('Template structure must be an object'),
  body('category').optional().isIn(['Modern', 'Professional', 'Creative', 'Simple', 'Academic'])
    .withMessage('Invalid category')
], updateTemplate);

router.delete('/:id', deleteTemplate);

export default router; 