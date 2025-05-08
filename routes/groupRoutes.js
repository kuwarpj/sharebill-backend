import express from 'express';
const router = express.Router();
import { createGroup, getUserGroups, getGroupById } from '../controllers/groupController.js';
// 'protect' middleware is applied in server.js for all /api/groups routes

// @route   POST /api/groups
// @desc    Create a new group
// @access  Private
router.post('/', createGroup);

// @route   GET /api/groups
// @desc    Get all groups for the current user
// @access  Private
router.get('/', getUserGroups);

// @route   GET /api/groups/:id
// @desc    Get a single group by ID
// @access  Private (user membership check is within controller)
router.get('/:id', getGroupById);


export default router;
