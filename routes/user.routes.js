const express = require('express');
const { 
  updateProfile, 
  uploadProfilePicture, 
  searchUsers 
} = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

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

module.exports = router; 