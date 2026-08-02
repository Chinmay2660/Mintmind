const SPLIT_TOLERANCE = 0.01;

export function buildMemberSplits(memberIds, percentages, targetAmount) {
  if (!memberIds.length) {
    throw new Error('At least one family member is required');
  }

  const totalPct = percentages.reduce((sum, pct) => sum + pct, 0);
  if (Math.abs(totalPct - 100) > SPLIT_TOLERANCE) {
    throw new Error('Member split percentages must add up to 100%');
  }

  let allocated = 0;
  return memberIds.map((userId, index) => {
    const isLast = index === memberIds.length - 1;
    const target = isLast
      ? Math.round((targetAmount - allocated) * 100) / 100
      : Math.round((targetAmount * percentages[index]) / 100 * 100) / 100;
    allocated += target;

    return {
      user: userId,
      percentage: percentages[index],
      targetAmount: target,
      currentAmount: 0,
    };
  });
}

export function equalSplitPercentages(count) {
  if (count <= 0) return [];
  const base = Math.floor((100 / count) * 100) / 100;
  const splits = Array(count).fill(base);
  const remainder = Math.round((100 - base * count) * 100) / 100;
  if (remainder !== 0) splits[0] = Math.round((splits[0] + remainder) * 100) / 100;
  return splits;
}

export function sumMemberCurrentAmounts(memberSplits = []) {
  return memberSplits.reduce((sum, split) => sum + (split.currentAmount || 0), 0);
}
