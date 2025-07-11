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
