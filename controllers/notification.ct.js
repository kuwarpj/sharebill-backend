import GroupInvitation from "../models/groupInvitation.mo.js";
import Group from "../models/groupModel.js";
import { ApiResponse } from "../utils/apiResponse.ut.js";
import { ApiError } from "../utils/apiError.ut.js";
import { asyncHandler } from "../utils/asyncHandler.ut.js";

const acceptGroupInvitation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userEmail = req.user.email;
  const { groupId } = req.params;
  console.log("THis", userId, userEmail, groupId);
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
  console.log("THis", userEmail);
  const invites = await GroupInvitation.find({
    email: userEmail,
  })
    .populate("groupId", "name description")

  console.log("invites", invites);
  return res
    .status(200)
    .json(new ApiResponse(200, invites, "Pending group invitations fetched"));
});

export { acceptGroupInvitation, getUserInvitations };
