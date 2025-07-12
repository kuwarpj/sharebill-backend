import express from "express";
const router = express.Router();

import { acceptGroupInvitation, getUserInvitations } from "../controllers/notification.ct.js";

router.get('/getallinvite', getUserInvitations)
router.post("/accept/:groupId", acceptGroupInvitation);


export default router;
