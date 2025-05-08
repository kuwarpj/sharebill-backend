import express from 'express';
const router = express.Router();
import { addExpense, getGroupExpenses } from '../controllers/expenseController.js';
// 'protect' middleware is applied in server.js for all /api/expenses routes

// @route   POST /api/expenses
// @desc    Add a new expense to a group
// @access  Private
router.post('/', addExpense);

// @route   GET /api/expenses/group/:groupId
// @desc    Get all expenses for a specific group
// @access  Private
router.get('/group/:groupId', getGroupExpenses);


export default router;
