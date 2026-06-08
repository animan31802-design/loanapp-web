import {AppConfig} from '@/constants/AppConfig';

export interface WalletDistribution {
  finderCommission: number;
  memberCredits: Array<{
    memberId: string;
    memberName: string;
    principalCredit: number;
    interestCredit: number;
    totalCredit: number;
    shareRatio: number;
  }>;
}

export interface ContributionDeduction {
  memberId: string;
  memberName: string;
  totalContribute: number;
  fromReturns: number;      // deducted from returnsBalance first (already in company)
  fromInvestment: number;   // deducted from investmentBalance (admin collects physically)
  shareRatio: number;
  walletBalance: number;    // total available (investment + returns)
}

/**
 * EMI distribution:
 * - principalPortion → ALL contributors proportionally → returnsBalance
 * - interestPortion  → finder 10% commission, 90% split by ratio → returnsBalance
 */
export const calculateWalletDistribution = (
  principalPortion: number,
  interestPortion: number,
  finderMemberId: string,
  finderMemberName: string,
  shares: Array<{
    memberId: string;
    memberName: string;
    shareAmt: number;
    shareRatio: number;
  }>,
): WalletDistribution => {
  const finderCommission = roundMoney(interestPortion * AppConfig.FINDER_COMMISSION_RATE);
  const interestPool = roundMoney(interestPortion * AppConfig.POOL_RATE);

  // Split principal and interest pool across shares using penny-safe method
  const shareRatios = shares.map(s => s.shareRatio);
  const principalSplits = splitProportionally(principalPortion, shareRatios);
  const interestSplits = splitProportionally(interestPool, shareRatios);

  const memberCredits = shares.map((share, i) => {
    const principalCredit = principalSplits[i];
    const interestCredit = interestSplits[i];
    return {
      memberId: share.memberId,
      memberName: share.memberName,
      principalCredit,
      interestCredit,
      totalCredit: roundMoney(principalCredit + interestCredit),
      shareRatio: share.shareRatio,
    };
  });

  return {finderCommission, memberCredits};
};

export const calculateShareRatio = (shareAmt: number, totalLoanAmt: number): number => {
  if (totalLoanAmt === 0) return 0;
  return Math.round((shareAmt / totalLoanAmt) * 10000) / 10000;
};

export const calculateTotalContributed = (shares: Array<{shareAmt: number}>): number =>
  shares.reduce((sum, s) => sum + s.shareAmt, 0);

/**
 * Calculate proportional contributions.
 * Total available = investmentBalance + returnsBalance per member.
 * Deduction priority: returnsBalance first (already in company), then investmentBalance.
 */
export const calculateProportionalContributions = (
  loanAmount: number,
  memberWallets: Array<{
    memberId: string;
    memberName: string;
    investmentBalance: number;
    returnsBalance: number;
  }>,
): {
  canFund: boolean;
  totalAvailable: number;
  shortfall: number;
  contributions: ContributionDeduction[];
} => {
  const walletsWithTotal = memberWallets.map(w => ({
    ...w,
    totalBalance: Number(w.investmentBalance) + Number(w.returnsBalance),
  }));

  const totalAvailable = walletsWithTotal.reduce((s, w) => s + w.totalBalance, 0);
  const canFund = totalAvailable >= loanAmount;
  const shortfall = Math.max(0, loanAmount - totalAvailable);

  if (!canFund) {
    return {
      canFund: false,
      totalAvailable,
      shortfall,
      contributions: walletsWithTotal.map(w => ({
        memberId: w.memberId,
        memberName: w.memberName,
        totalContribute: 0,
        fromReturns: 0,
        fromInvestment: 0,
        shareRatio: 0,
        walletBalance: w.totalBalance,
      })),
    };
  }

  // Use splitProportionally to guarantee exact sum — no penny gaps
  const ratios = walletsWithTotal.map(w => w.totalBalance);
  const splitAmounts = splitProportionally(loanAmount, ratios);

  const contributions: ContributionDeduction[] = walletsWithTotal.map((w, i) => {
    const totalContribute = splitAmounts[i];
    const ratio = w.totalBalance / totalAvailable;

    // Priority: use returnsBalance first (already in company account)
    const fromReturns = roundMoney(Math.min(Number(w.returnsBalance), totalContribute));
    const fromInvestment = roundMoney(totalContribute - fromReturns);

    return {
      memberId: w.memberId,
      memberName: w.memberName,
      totalContribute,
      fromReturns,
      fromInvestment,
      shareRatio: Math.round(ratio * 10000) / 10000,
      walletBalance: w.totalBalance,
    };
  });

  return {canFund: true, totalAvailable, shortfall: 0, contributions};
};


// ─── Penny-safe math utilities ────────────────────────────────────────────────

/** Round to 2 decimal places consistently */
export const roundMoney = (val: number): number =>
  Math.round((val + Number.EPSILON) * 100) / 100;

/**
 * Split a total amount proportionally across ratios, guaranteeing
 * the parts sum EXACTLY to total (no penny gaps).
 * Uses the "largest remainder" method.
 */
export const splitProportionally = (
  total: number,
  ratios: number[],
): number[] => {
  if (ratios.length === 0) return [];
  const totalRatio = ratios.reduce((s, r) => s + r, 0);
  if (totalRatio === 0) return ratios.map(() => 0);

  // Raw (unrounded) shares
  const raw = ratios.map(r => (total * r) / totalRatio);

  // Floor each to 2 decimal places
  const floored = raw.map(v => Math.floor(v * 100) / 100);

  // How many cents remain to distribute?
  const distributed = floored.reduce((s, v) => s + v, 0);
  let remaining = Math.round((total - distributed) * 100); // in cents

  // Distribute remaining cents to those with largest fractional parts
  const fractions = raw.map((v, i) => ({i, frac: v * 100 - Math.floor(v * 100)}));
  fractions.sort((a, b) => b.frac - a.frac);

  const result = [...floored];
  for (let k = 0; k < remaining; k++) {
    result[fractions[k % fractions.length].i] =
      Math.round((result[fractions[k % fractions.length].i] + 0.01) * 100) / 100;
  }

  return result;
};
