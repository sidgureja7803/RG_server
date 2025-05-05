import express from 'express';
import { 
  createComment,
  getComments,
  updateComment,
  deleteComment,
  toggleCommentResolution
} from '../controllers/comment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { body } from 'express-validator';

const router = express.Router({ mergeParams: true }); // Enable access to parent router params

// Protect all comment routes
router.use(authenticate);

// Create a new comment
router.post('/', [
  body('content').notEmpty().trim(),
  body('section').notEmpty().trim(),
  body('position').optional().isObject(),
  body('parentComment').optional().isMongoId()
], createComment);

// Get all comments for a resume
router.get('/', getComments);

// Update a comment
router.put('/:commentId', [
  body('content').notEmpty().trim()
], updateComment);

// Delete a comment
router.delete('/:commentId', deleteComment);

// Toggle comment resolution
router.put('/:commentId/resolve', toggleCommentResolution);

export default router; 