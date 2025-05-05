import express from 'express';
import { 
  updateProfile, 
  uploadProfilePicture, 
  searchUsers 
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

// Protect all user routes
router.use(authenticate);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', updateProfile);

// @route   POST /api/users/profile/picture
// @desc    Upload profile picture
// @access  Private
router.post('/profile/picture', upload.single('profilePicture'), uploadProfilePicture);

// @route   GET /api/users/search
// @desc    Search users (for collaboration)
// @access  Private
router.get('/search', searchUsers);

export default router; 