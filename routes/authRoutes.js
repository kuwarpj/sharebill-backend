import express from 'express';
const router = express.Router();
import { signupUser, loginUser } from '../controllers/authController.js';

// @route   POST /auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', signupUser);

// @route   POST /auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', loginUser);

export default router;
