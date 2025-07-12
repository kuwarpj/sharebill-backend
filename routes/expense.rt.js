import express from 'express';
import { createExpense, getGroupExpensesForUser, updateExpense } from '../controllers/expense.ct.js';
const router = express.Router();



router.post("/add", createExpense);
router.post("/edit/:expenseId", updateExpense);
router.get('/group/:groupId', getGroupExpensesForUser);


export default router;
