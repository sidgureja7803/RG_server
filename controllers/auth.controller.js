import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import { sendOTP } from '../config/nodemailer.js';
import crypto from 'crypto';

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

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Generate new OTP
      const otp = user.generateOTP();
      await user.save();
      
      // Send OTP
      try {
        await sendOTP(user.email, otp);
      } catch (error) {
        console.error('Failed to send OTP:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again.'
        });
      }
      
      return res.status(403).json({
        success: false,
        message: 'Email not verified. A new verification code has been sent to your email.',
        userId: user._id
      });
    }

    // Create token
    const token = generateToken(user._id);

    // Remove sensitive fields from response
    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      profilePicture: user.profilePicture,
      role: user.role
    };

    res.json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.',
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
    
    // Get client URL from environment or use a default for deployed environments
    const clientURL = process.env.CLIENT_URL || 'https://resumeforge-nine.vercel.app';
    
    // Redirect back to the client application
    res.redirect(`${clientURL}/oauth/callback?provider=google&token=${token}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    
    // Get client URL from environment or use a default for deployed environments
    const clientURL = process.env.CLIENT_URL || 'https://resumeforge-nine.vercel.app';
    
    res.redirect(`${clientURL}/login?error=Google OAuth failed`);
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
    
    // Get client URL from environment or use a default for deployed environments
    const clientURL = process.env.CLIENT_URL || 'https://resumeforge-nine.vercel.app';
    
    // Redirect back to the client application
    res.redirect(`${clientURL}/oauth/callback?provider=github&token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    
    // Get client URL from environment or use a default for deployed environments
    const clientURL = process.env.CLIENT_URL || 'https://resumeforge-nine.vercel.app';
    
    res.redirect(`${clientURL}/login?error=GitHub OAuth failed`);
  }
};

// @desc    Request password reset
// @route   POST /api/auth/reset-password
// @access  Public
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Send email
    try {
      await sendResetPasswordEmail(user.email, resetUrl);
      
      res.json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:resetToken
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { resetToken } = req.params;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password'
      });
    }

    // Get hashed token
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while resetting your password'
    });
  }
}; 