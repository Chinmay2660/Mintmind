import Goal from '@/models/Goal';
import { buildMemberSplits, equalSplitPercentages, sumMemberCurrentAmounts } from '@/lib/utils/goalSplits';

export function getActiveMemberIds(family) {
  const ids = new Set();
  if (family.familyHead) ids.add(family.familyHead.toString());
  for (const member of family.members || []) {
    if (member.status === 'active' && member.user) {
      ids.add(member.user.toString());
    }
  }
  return [...ids];
}

export function resolveMemberSplits(family, targetAmount, splitPercentages) {
  const memberIds = getActiveMemberIds(family);
  const percentages = splitPercentages?.length === memberIds.length
    ? splitPercentages
    : equalSplitPercentages(memberIds.length);
  return buildMemberSplits(memberIds, percentages, targetAmount);
}

export async function syncPersonalGoalsFromFamilyGoal(familyGoal) {
  const ops = (familyGoal.memberSplits || []).map((split) => {
    const userId = split.user._id ?? split.user;
    return Goal.findOneAndUpdate(
      { familyGoalId: familyGoal._id, userId },
      {
        userId,
        familyGoalId: familyGoal._id,
        title: familyGoal.title,
        description: familyGoal.description,
        targetAmount: split.targetAmount,
        currentAmount: split.currentAmount ?? 0,
        targetDate: familyGoal.targetDate,
        category: familyGoal.category,
        status: familyGoal.status,
      },
      { upsert: true, new: true }
    );
  });
  await Promise.all(ops);
}

export async function deletePersonalGoalsForFamilyGoal(familyGoalId) {
  await Goal.deleteMany({ familyGoalId });
}

export function applyContribution(goal, userId, amount) {
  const splits = goal.memberSplits || [];
  let found = false;

  for (const split of splits) {
    const splitUserId = (split.user?._id ?? split.user).toString();
    if (splitUserId === userId.toString()) {
      split.currentAmount = (split.currentAmount || 0) + amount;
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error('You are not assigned to this goal');
  }

  goal.currentAmount = sumMemberCurrentAmounts(splits);
  if (goal.currentAmount >= goal.targetAmount) {
    goal.status = 'completed';
  }
  return goal;
}
