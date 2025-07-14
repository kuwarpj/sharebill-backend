import Group from "../models/groupModel.js";
import User from "../models/userModel.js";
import GroupInvitation from "../models/groupInvitation.mo.js";
import sendEmail from "../utils/sendEmail.ut.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/api.ut.js";
import Activity from "../models/userActivity.mo.js";
import Expense from "../models/expense.mo.js";

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private

const createGroup = asyncHandler(async (req, res) => {
  const { groupName, groupDesc, members = [] } = req.body;
  const creatorId = req.user.id;

  console.log("This is", groupName, groupDesc, members, creatorId);

  if (!groupName) {
    throw new ApiError(400, "Group name is required");
  }

  const creator = await User.findById(creatorId);
  if (!creator) throw new ApiError(404, "Creator not found");
  const group = await Group.create({
    name: groupName,
    description: groupDesc || "",
    members: [creatorId],
    createdBy: creatorId,
  });

  // Record activity for group creation
  await Activity.create({
    userId: creatorId,
    groupId: group._id,
    groupName: group.name,
    type: "GROUP_CREATED",
    description: `You created group "${groupName}"`,
    amountType: "none",
  });
  const results = [];

  for (const member of members) {
    if (
      member.email &&
      member.email.toLowerCase() !== creator.email.toLowerCase()
    ) {
      const result = await addMemberToGroup({
        email: member.email,
        groupId: group._id,
        invitedBy: creatorId,
      });
      results.push({ email: member.email, ...result });
    }
  }

  const populatedGroup = await Group.findById(group._id)
    .populate("members", "-password")
    .populate("createdBy", "-password");

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { group: populatedGroup.toJSON(), membersProcessed: results },
        "Group created successfully"
      )
    );
});

const addMemberToGroupHandler = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const result = await addMemberToGroup({
    email,
    groupId,
    invitedBy: req.user.id,
  });

  res
    .status(200)
    .json(new ApiResponse(200, result, "Member processed successfully"));
});

//Utility function to add memeber to group and send email invites
const addMemberToGroup = async ({ email, groupId, invitedBy }) => {
  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");

  const invitingUser = await User.findById(invitedBy);
  if (!invitingUser) throw new Error("Inviting user not found");

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  // Prevent duplicate invites
  const existingInvite = await GroupInvitation.findOne({
    email: normalizedEmail,
    groupId,
    status: "pending",
  });

  if (!existingInvite) {
    await GroupInvitation.create({
      email: normalizedEmail,
      groupId,
      invitedBy,
      status: "pending",
    });

    const actionText = existingUser
      ? `Log in to accept the invitation`
      : `Sign up to join the group`;

    const actionLink = existingUser
      ? `https://sharebill-frontend.vercel.app/login`
      : `https://sharebill-frontend.vercel.app/signup?email=${normalizedEmail}`;

    await sendEmail(
      normalizedEmail,
      `Join ${group.name} on Splitwise`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>You're Invited to Join ${group.name}</h2>
        <p><strong>${invitingUser.username}</strong> has invited you to join <strong>${group.name}</strong>.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${actionLink}" style="padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            ${actionText}
          </a>
        </div>
        <p>If you didn’t expect this, you can safely ignore the email.</p>
      </div>
      `
    );
  }

  return { status: "invited" };
};

const getUserGroups = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  // Step 1: Fetch all groups where user is a member
  const groups = await Group.find({ members: userId })
    .populate("members", "username email avatarUrl id")
    .populate("createdBy", "username email avatarUrl")
    .sort({ createdAt: -1 })
    .lean(); // use lean() to return plain JS objects for performance

  const groupIds = groups.map((g) => g._id);

  // Step 2: Fetch all expenses across all groups at once
  const allExpenses = await Expense.find({ groupId: { $in: groupIds } })
    .populate("paidBy", "username email avatarUrl")
    .sort({ createdAt: -1 }) // so first expense per group is latest
    .lean();

  // Step 3: Group expenses by groupId
  const expensesByGroup = new Map();
  for (const expense of allExpenses) {
    const groupId = expense.groupId.toString();

    if (!expensesByGroup.has(groupId)) {
      expensesByGroup.set(groupId, []);
    }
    expensesByGroup.get(groupId).push(expense);
  }

  // Step 4: Enrich group with latestTransaction + totals
  const enrichedGroups = groups.map((group) => {
    const groupId = group._id.toString();
    const expenses = expensesByGroup.get(groupId) || [];

    let totalYouOwe = 0;
    let totalYouLent = 0;
    let latestExpense = expenses[0] || null; // sorted by createdAt desc

    for (const expense of expenses) {
      const userSplit = expense.splits?.find(
        (split) => split.userId.toString() === userId
      );

      const amountPaidByUser =
        expense.paidBy?._id?.toString() === userId ? expense.amount : 0;

      if (userSplit) {
        if (amountPaidByUser > 0) {
          totalYouLent += amountPaidByUser - userSplit.amount;
        } else {
          totalYouOwe += userSplit.amount;
        }
      }
    }

    return {
      ...group,
      latestTransaction: latestExpense
        ? {
            description: latestExpense.description,
            amount: latestExpense.amount,
            paidBy: latestExpense.paidBy,
            createdAt: latestExpense.createdAt,
          }
        : null,
      youOwe: totalYouOwe,
      youLent: totalYouLent,
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, enrichedGroups, "Groups fetched successfully"));
});

const getGroupById = async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;

  try {
    const group = await Group.findById(groupId)
      .populate("members", "username  id")
      .populate("createdBy", "username id");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some((member) => member._id.equals(userId));
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "User not authorized to access this group" });
    }

    res.json(new ApiResponse(200, group, "Groups Data fetched successfully"));
  } catch (error) {
    console.error("Get group by ID error:", error);
    if (error.kind === "ObjectId") {
      return res
        .status(404)
        .json({ message: "Group not found (invalid ID format)" });
    }
    res
      .status(500)
      .json({ message: "Server error while fetching group details" });
  }
};

// TODO: Add functions for adding/removing members (which would also use invitation logic),
// updating group details, deleting group

const getRecentActivities = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { groupId, page = 1, limit = 10 } = req.query;

  const query = { userId };
  if (groupId) query.groupId = groupId;

  // Convert page and limit to numbers
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  const skip = (pageNumber - 1) * limitNumber;

  // Get total count of documents for pagination
  const total = await Activity.countDocuments(query);

  // Get paginated activities
  const activities = await Activity.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber)
    .select("-__v -updatedAt")
    .lean();

  const formattedActivities = activities.map((activity) => ({
    id: activity._id,
    description: activity.description,
    group: activity.groupName,
    amount: activity.amount
      ? `₹${activity.amount.toFixed(2)} ${activity.amountType}`
      : undefined,
    date: activity.createdAt.toISOString().split("T")[0],
    type: activity.type,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        activities: formattedActivities,
        pagination: {
          totalItems: total,
          totalPages: Math.ceil(total / limitNumber),
          currentPage: pageNumber,
          itemsPerPage: limitNumber,
        },
      },
      "Activities fetched successfully"
    )
  );
});

// Api to get  finincial summary for a group for logged-in users perspective
const getGroupUserBalances = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id.toString();

  const group = await Group.findById(groupId)
    .populate("members", "username email avatarUrl")
    .populate("createdBy", "username email avatarUrl")
    .lean();

  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  const expenses = await Expense.find({ groupId })
    .populate("paidBy", "username email avatarUrl")
    .lean();

  const balances = {}; 

  for (const member of group.members) {
    if (member._id.toString() === userId) continue;

    balances[member._id.toString()] = {
      _id: member._id,
      username: member.username,
      avatarUrl: member.avatarUrl,
      owe: 0,
      lent: 0,
    };
  }

  for (const expense of expenses) {
    const paidById = expense.paidBy?._id?.toString();
    const splits = expense.splits || [];

    for (const split of splits) {
      const splitUserId = split.userId.toString();

      if (splitUserId === userId && paidById && paidById !== userId) {
        // You owe to the payer
        if (balances[paidById]) {
          balances[paidById].owe += split.amount;
        }
      } else if (paidById === userId && splitUserId !== userId) {
        // They owe you
        if (balances[splitUserId]) {
          balances[splitUserId].lent += split.amount;
        }
      }
    }
  }

  const balanceSummary = Object.values(balances);

  const responseData = {
    _id: group._id,
    name: group.name,
    description: group.description,
    totalMembers: group.members.length,
    members: group.members,
    balances: balanceSummary,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        responseData,
        "Group user balances fetched successfully"
      )
    );
});

export {
  createGroup,
  getUserGroups,
  getGroupById,
  addMemberToGroupHandler,
  getRecentActivities,
  getGroupUserBalances,
};
