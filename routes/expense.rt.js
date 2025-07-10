import express from 'express';
import { createExpense, getGroupExpensesForUser } from '../controllers/expense.ct.js';
const router = express.Router();



router.post("/add", createExpense);
router.get('/group/:groupId', getGroupExpensesForUser);


export default router;
