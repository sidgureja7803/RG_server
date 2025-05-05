import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import { sendOTP } from '../config/nodemailer.js';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({
        message: 'User already exists with that email or username'
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password
    });

    if (user) {
      // Generate and send OTP
      const otp = user.generateOTP();
      await user.save();
      
      const emailSent = await sendOTP(email, otp);
      if (!emailSent) {
        await User.deleteOne({ _id: user._id });
        return res.status(500).json({ message: 'Failed to send verification email' });
      }

      res.status(201).json({
        message: 'Registration successful. Please verify your email.',
        userId: user._id
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    if (!user.verifyOTP(otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const otp = user.generateOTP();
    await user.save();

    const emailSent = await sendOTP(user.email, otp);
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    
    // Check if user exists and password matches
    if (user && (await user.comparePassword(password))) {
      if (!user.isEmailVerified) {
        const otp = user.generateOTP();
        await user.save();
        await sendOTP(user.email, otp);
        
        return res.status(403).json({
          message: 'Email not verified',
          userId: user._id
        });
      }

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
export const googleCallback = async (req, res) => {
  try {
    const { email, name, picture, sub: googleId } = req.user._json;
    
    let user = await User.findOne({ email });
    
    if (!user) {
      user = await User.create({
        username: name,
        email,
        password: googleId + process.env.JWT_SECRET,
        googleId,
        profilePicture: picture,
        isEmailVerified: true
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.isEmailVerified = true;
      await user.save();
    }

    const token = generateToken(user._id);
    res.redirect(`${process.env.CLIENT_URL}/oauth/callback?provider=google&token=${token}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=Google OAuth failed`);
  }
};

// @desc    GitHub OAuth callback
// @route   GET /api/auth/github/callback
// @access  Public
export const githubCallback = async (req, res) => {
  try {
    const { email, login: username, avatar_url: picture, id: githubId } = req.user._json;
    
    let user = await User.findOne({ $or: [{ email }, { githubId }] });
    
    if (!user) {
      user = await User.create({
        username,
        email: email || `${username}@github.com`,
        password: githubId + process.env.JWT_SECRET,
        githubId,
        profilePicture: picture,
        isEmailVerified: true
      });
    } else if (!user.githubId) {
      user.githubId = githubId;
      user.isEmailVerified = true;
      await user.save();
    }

    const token = generateToken(user._id);
    res.redirect(`${process.env.CLIENT_URL}/oauth/callback?provider=github&token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=GitHub OAuth failed`);
  }
}; 