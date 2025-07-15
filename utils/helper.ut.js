export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();


export function calculateUserExpenseView(expenses, userId) {
  return expenses.map(exp => {
    let userOwes = 0;
    let userPaid = 0;

    // Map userId to their owed amount
    const splitMap = new Map();
    for (const split of exp.splits) {
      splitMap.set(split.userId.toString(), split.amount);
    }

    // What this user owes
    if (splitMap.has(userId.toString())) {
      userOwes = splitMap.get(userId.toString());
    }

    // If user is payer
    if (exp.paidBy._id.toString() === userId.toString()) {
      userPaid = exp.amount;
    }

    const net = userPaid - userOwes;

    let status = 'none';
    let amountInView = 0;

    if (net > 0) {
      status = 'lent';
      amountInView = net;
    } else if (net < 0) {
      status = 'owe';
      amountInView = -net;
    }

    // Build formatted participants
    const participants = exp.participants.map(p => ({
      id: p._id,
      username: p.username,
      email: p.email,
      avatarUrl: p.avatarUrl,
      amount: splitMap.get(p._id.toString()) || 0,
    }));

    return {
      id: exp._id,
      description: exp.description,
      amount: exp.amount,
      paidBy: {
        id: exp.paidBy._id,
        username: exp.paidBy.username,
        email: exp.paidBy.email,
        avatarUrl: exp.paidBy.avatarUrl,
      },
      participants,
      createdAt: exp.createdAt,
      status,
      amountInView,
    };
  });
}



export const calculateBalances = (userId, group, expenses) => {
  const balances = {};
  let totalYouOwe = 0;
  let totalYouLent = 0;

  // Initialize balances for all members except yourself
  for (const member of group.members) {
    if (member._id.toString() === userId) continue;

    balances[member._id.toString()] = {
      _id: member._id,
      username: member.username,
      avatarUrl: member.avatarUrl,
      owe: 0,
      lent: 0,
      netBalance: 0,
      status: "settled",
    };
  }

  // Process all expenses
  for (const expense of expenses) {
    const paidById = expense.paidBy?._id?.toString();
    const splits = expense.splits || [];

    for (const split of splits) {
      const splitUserId = split.userId.toString();

      if (splitUserId === userId && paidById && paidById !== userId) {
        if (balances[paidById]) {
          balances[paidById].owe += split.amount;
          totalYouOwe += split.amount;
        }
      } else if (paidById === userId && splitUserId !== userId) {
        if (balances[splitUserId]) {
          balances[splitUserId].lent += split.amount;
          totalYouLent += split.amount;
        }
      }
    }
  }

  // Calculate net balances and statuses
  for (const memberId in balances) {
    const b = balances[memberId];
    b.netBalance = b.owe - b.lent;

    if (b.netBalance > 0) {
      b.status = "owe";
    } else if (b.netBalance < 0) {
      b.status = "lent";
      b.netBalance = Math.abs(b.netBalance);
    } else {
      b.status = "settled";
    }
  }

  return {
    individualBalances: Object.values(balances),
    totalYouOwe,
    totalYouLent,
    netBalance: totalYouOwe - totalYouLent,
  };
};