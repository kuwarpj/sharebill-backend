import express from 'express';
const router = express.Router();
import { getMe, searchUsers } from '../controllers/userController.js';
// The 'protect' middleware should already be applied when these routes are mounted in server.js

// @route   GET /api/users/me
// @desc    Get current user's profile
// @access  Private (auth handled by middleware at app level for /api/users)
router.get('/me', getMe);

// @route   GET /api/users/search
// @desc    Search users by username or email
// @access  Private
router.get('/search', searchUsers);


// Example for future routes:
// router.put('/me', updateUserProfile); // Requires updateUserProfile in userController

export default router;
