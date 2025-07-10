import express from 'express';
const router = express.Router();
import { signupUser, loginUser, sendOtpToEmail, verifyOtpAndSignup } from '../controllers/authController.js';

// @route   POST /auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', signupUser);

// @route   POST /auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', loginUser);
router.post('/sendotp', sendOtpToEmail)
router.post('/verify-and-signup', verifyOtpAndSignup)

export default router;
