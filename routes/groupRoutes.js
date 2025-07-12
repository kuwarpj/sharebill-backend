import express from "express";
const router = express.Router();
import {
  createGroup,
  getUserGroups,
  getGroupById,
  addMemberToGroupHandler,
  getRecentActivities,
} from "../controllers/group.ct.js";
import { acceptGroupInvitation, getUserInvitations } from "../controllers/notification.ct.js";


router.get('/getallinvite', getUserInvitations)
router.post("/create", createGroup);
router.post("/:groupId/add-member", addMemberToGroupHandler);
router.get("/usergroup", getUserGroups);
router.post("/invite/accept/:groupId", acceptGroupInvitation);
router.get("/:id", getGroupById);
router.get("/user/recent-activity", getRecentActivities);




export default router;
