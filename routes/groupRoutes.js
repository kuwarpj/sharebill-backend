import express from "express";
const router = express.Router();
import {
  createGroup,
  getUserGroups,
  getGroupById,
  addMemberToGroupHandler,
  getRecentActivities,
  getGroupUserBalances,
} from "../controllers/group.ct.js";



router.post("/create", createGroup);
router.post("/:groupId/add-member", addMemberToGroupHandler);
router.get("/usergroup", getUserGroups);
router.get("/:id", getGroupById);
router.get("/user/recent-activity", getRecentActivities);
router.get("/user-balance/:groupId", getGroupUserBalances)




export default router;
