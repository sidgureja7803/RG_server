import express from 'express';
import passport from 'passport';
import { 
  register, 
  login, 
  getCurrentUser, 
  verifyEmail, 
  resendOTP,
  googleCallback,
  githubCallback,
  requestPasswordReset,
  resetPassword
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/verify-email
// @desc    Verify email with OTP
// @access  Public
router.post('/verify-email', verifyEmail);

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP
// @access  Public
router.post('/resend-otp', resendOTP);

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticate, getCurrentUser);

// @route   POST /api/auth/reset-password
// @desc    Request password reset
// @access  Public
router.post('/reset-password', requestPasswordReset);

// @route   POST /api/auth/reset-password/:resetToken
// @desc    Reset password with token
// @access  Public
router.post('/reset-password/:resetToken', resetPassword);

// @route   GET /api/auth/google
// @desc    Google OAuth
// @access  Public
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

// @route   GET /api/auth/github
// @desc    GitHub OAuth
// @access  Public
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

// @route   GET /api/auth/github/callback
// @desc    GitHub OAuth callback
// @access  Public
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  githubCallback
);

export default router; 