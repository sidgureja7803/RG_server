const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields if provided
    if (req.body.username) user.username = req.body.username;
    if (req.body.email) user.email = req.body.email;
    
    // If password is being updated, hash it
    if (req.body.password) {
      user.password = req.body.password;
    }

    // Save the updated user
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      profilePicture: updatedUser.profilePicture,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/profile/picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Update profile picture path
    user.profilePicture = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({
      _id: user._id,
      profilePicture: user.profilePicture,
      message: 'Profile picture updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error uploading profile picture',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Search users (for collaboration)
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Find users matching the query by username or email
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude the current user
        { 
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('_id username email profilePicture')
      .limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: 'Error searching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  updateProfile,
  uploadProfilePicture,
  searchUsers
}; 