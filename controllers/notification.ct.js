import GroupInvitation from "../models/groupInvitation.mo.js";
import Group from "../models/groupModel.js";
import Activity from "../models/userActivity.mo.js";
import User from "../models/userModel.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/api.ut.js";

const acceptGroupInvitation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userEmail = req.user.email;
  const { groupId } = req.params;
  if (!groupId) {
    throw new ApiError(400, "Group ID is required");
  }

  const invite = await GroupInvitation.findOne({
    email: userEmail,
    groupId,
    status: "pending",
  });

  if (!invite) {
    throw new ApiError(404, "No pending invite found for this group");
  }

  // ✅ Add user to the group (if not already a member)
  await Group.findByIdAndUpdate(groupId, {
    $addToSet: { members: userId },
  });

  // ✅ Update the invite status
  invite.status = "accepted";
  invite.acceptedAt = new Date();
  await invite.save();

  // Get inviter details
  const inviter = await User.findById(invite.invitedBy);
  // Record activity for the user who accepted

  const group = Group.findById(groupId);
  await Activity.create({
    userId,
    groupId,
    groupName: group.name,
    type: "GROUP_JOINED",
    description: `You joined group "${group.name}"`,
    amountType: "none",
    involvedUsers: [
      {
        userId: invite.invitedBy,
        username: inviter.username,
        amountType: "none",
      },
    ],
  });

  // Record activity for the inviter
  await Activity.create({
    userId: invite.invitedBy,
    groupId,
    groupName: group.name,
    type: "INVITATION_ACCEPTED",
    description: `${req.user.username} accepted your invitation to join group "${group.name}"`,
    amountType: "none",
    involvedUsers: [
      {
        userId,
        username: req.user.username,
        amountType: "none",
      },
    ],
  });

  // ✅ Fetch and populate the group data
  const updatedGroup = await Group.findById(groupId)
    .populate("members", "-password")
    .populate("createdBy", "username email");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedGroup,
        "Group invitation accepted successfully"
      )
    );
});

const getUserInvitations = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;

  const invites = await GroupInvitation.find({
    email: userEmail,
    status: { $in: ["pending", "accepted"] },
  })
    .populate("groupId", "name description")
    .populate("invitedBy", "username email")
    .lean();

  const formattedInvites = invites.map((invite) => ({
    ...invite,
    status: invite.status === "accepted" ? "accepted" : "pending",
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedInvites,
        "Group invitations fetched successfully"
      )
    );
});
export { acceptGroupInvitation, getUserInvitations };
