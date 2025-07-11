import express from "express";
import {
  addPersonalExpesne,
  editPersonalExpense,
  getPersonalExpense,
} from "../controllers/personalExpense.ct.js";
const router = express.Router();

router.post("/add", addPersonalExpesne);
router.get("/expense", getPersonalExpense);
router.put("/:expenseId", editPersonalExpense);

export default router;
