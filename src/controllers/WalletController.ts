import {
  queryDocs, getDoc, setDoc, updateDoc, generateId,
  serverTimestamp, addDoc, COLLECTIONS,
} from "@/services/FirebaseService";
import { Wallet } from "@/models/Wallet";
import { WalletTransaction } from "@/models/WalletTransaction";
import { TransactionType } from "@/constants/Enums";
import { calculateWalletDistribution, calculateProportionalContributions, roundMoney } from "@/utils/WalletCalculator";
import { Share } from "@/models/Share";

export const getOrCreateWallet = async (memberId: string, memberName: string): Promise<Wallet> => {
  const existing = await queryDocs(COLLECTIONS.WALLETS, [{ field: "memberId", op: "==", value: memberId }]);
  if (existing.length > 0) return existing[0] as Wallet;
  const walletId = generateId(COLLECTIONS.WALLETS);
  const wallet: any = { walletId, memberId, memberName, investmentBalance: 0, deployedBalance: 0, freeInvestment: 0, returnsBalance: 0, totalBalance: 0, totalEarned: 0, totalWithdrawn: 0, totalInvested: 0 };
  await setDoc(COLLECTIONS.WALLETS, walletId, { ...wallet, updatedAt: serverTimestamp() });
  return wallet as Wallet;
};

export const getWalletByMember = async (memberId: string): Promise<Wallet | null> => {
  if (!memberId) return null;
  const data = await queryDocs(COLLECTIONS.WALLETS, [{ field: "memberId", op: "==", value: memberId }]);
  return data.length > 0 ? (data[0] as Wallet) : null;
};

export const getAllWallets = async (): Promise<Wallet[]> => {
  return (await queryDocs(COLLECTIONS.WALLETS, [])) as Wallet[];
};

const logTransaction = async (walletId: string, memberId: string, loanId: string | null, type: TransactionType, amount: number, note: string) => {
  await addDoc(COLLECTIONS.WALLET_TRANSACTIONS, {
    walletId: String(walletId), memberId: String(memberId), loanId: loanId || null,
    type: String(type), amount: Number(amount), note: String(note), createdAt: serverTimestamp(),
  });
};

export const creditReturns = async (memberId: string, memberName: string, amount: number, type: TransactionType, loanId: string | null, note: string): Promise<void> => {
  const wallet = await getOrCreateWallet(memberId, memberName);
  const newReturns = roundMoney(Number(wallet.returnsBalance) + amount);
  const newTotal = roundMoney(Number(wallet.investmentBalance) + newReturns);
  const newTotalEarned = roundMoney(Number(wallet.totalEarned) + amount);
  await updateDoc(COLLECTIONS.WALLETS, wallet.walletId, { returnsBalance: newReturns, totalBalance: newTotal, totalEarned: newTotalEarned, updatedAt: serverTimestamp() });
  await logTransaction(wallet.walletId, memberId, loanId, type, amount, note);
};

export const creditWallet = creditReturns;

export const addInvestment = async (memberId: string, memberName: string, amount: number): Promise<void> => {
  const wallet = await getOrCreateWallet(memberId, memberName);
  const newInvestment = roundMoney(Number(wallet.investmentBalance) + amount);
  const newFree = roundMoney(Number(wallet.freeInvestment) + amount);
  const newTotal = roundMoney(newInvestment + Number(wallet.returnsBalance));
  const newTotalInvested = roundMoney(Number(wallet.totalInvested) + amount);
  await updateDoc(COLLECTIONS.WALLETS, wallet.walletId, { investmentBalance: newInvestment, freeInvestment: newFree, totalBalance: newTotal, totalInvested: newTotalInvested, updatedAt: serverTimestamp() });
  await logTransaction(wallet.walletId, memberId, null, TransactionType.INVESTMENT, amount, `Monthly investment added — ₹${amount.toFixed(2)}`);
};

export const reduceInvestment = async (memberId: string, amount: number): Promise<void> => {
  const wallet = await getWalletByMember(memberId);
  if (!wallet) throw new Error("Wallet not found");
  const free = Number(wallet.freeInvestment);
  if (amount > free) throw new Error(`Cannot reduce more than free investment (₹${free.toFixed(2)})`);
  const newInvestment = roundMoney(Number(wallet.investmentBalance) - amount);
  const newFree = roundMoney(free - amount);
  const newTotal = roundMoney(newInvestment + Number(wallet.returnsBalance));
  await updateDoc(COLLECTIONS.WALLETS, wallet.walletId, { investmentBalance: newInvestment, freeInvestment: newFree, totalBalance: newTotal, updatedAt: serverTimestamp() });
  await logTransaction(wallet.walletId, memberId, null, TransactionType.INVESTMENT_REDUCE, -amount, `Investment reduced by ₹${amount.toFixed(2)}`);
};

export const debitWallet = async (memberId: string, amount: number, loanId: string | null, note: string): Promise<void> => {
  const wallet = await getWalletByMember(memberId);
  if (!wallet) throw new Error(`Wallet not found for ${memberId}`);
  if (Number(wallet.returnsBalance) < amount) throw new Error(`Insufficient returns balance. Available: ₹${Number(wallet.returnsBalance).toFixed(2)}`);
  const newReturns = roundMoney(Number(wallet.returnsBalance) - amount);
  const newTotal = roundMoney(Number(wallet.investmentBalance) + newReturns);
  const newTotalWithdrawn = roundMoney(Number(wallet.totalWithdrawn) + amount);
  await updateDoc(COLLECTIONS.WALLETS, wallet.walletId, { returnsBalance: newReturns, totalBalance: newTotal, totalWithdrawn: newTotalWithdrawn, updatedAt: serverTimestamp() });
  await logTransaction(wallet.walletId, memberId, loanId, TransactionType.WITHDRAWAL, -amount, note);
};

export const deductLoanContributions = async (
  loanId: string, loanNumber: string, loanAmount: number,
  members: Array<{ memberId: string; memberName: string }>
): Promise<Array<{ memberId: string; memberName: string; contributeAmt: number; fromReturns: number; fromInvestment: number; shareRatio: number }>> => {
  const wallets = await Promise.all(members.map(async m => {
    const w = await getOrCreateWallet(m.memberId, m.memberName);
    return { memberId: m.memberId, memberName: m.memberName, investmentBalance: Number(w.investmentBalance) || 0, returnsBalance: Number(w.returnsBalance) || 0 };
  }));
  const { canFund, shortfall, contributions } = calculateProportionalContributions(loanAmount, wallets);
  if (!canFund) throw new Error(`Insufficient balance. Shortfall: ₹${shortfall.toFixed(2)}. Ask members to add investment.`);
  for (const c of contributions) {
    if (c.totalContribute <= 0) continue;
    const wallet = await getWalletByMember(c.memberId);
    if (!wallet) continue;
    const newReturns = roundMoney(Number(wallet.returnsBalance) - c.fromReturns);
    const newInvestment = Number(wallet.investmentBalance);
    const newDeployed = roundMoney(Number(wallet.deployedBalance) + c.totalContribute);
    const newFree = Math.max(0, roundMoney(newInvestment - newDeployed));
    const newTotal = roundMoney(newInvestment + newReturns);
    await updateDoc(COLLECTIONS.WALLETS, wallet.walletId, { returnsBalance: newReturns, deployedBalance: newDeployed, freeInvestment: newFree, totalBalance: newTotal, updatedAt: serverTimestamp() });
    await logTransaction(wallet.walletId, c.memberId, loanId, TransactionType.LOAN_CONTRIBUTION, -c.totalContribute,
      `Loan contribution ${loanNumber} — Returns: ₹${c.fromReturns.toFixed(2)}, Investment: ₹${c.fromInvestment.toFixed(2)}`);
  }
  return contributions.map(c => ({ memberId: c.memberId, memberName: c.memberName, contributeAmt: c.totalContribute, fromReturns: c.fromReturns, fromInvestment: c.fromInvestment, shareRatio: c.shareRatio }));
};

export const distributeEMIToWallets = async (
  loanId: string, loanNumber: string, emiNumber: number,
  principalPortion: number, interestPortion: number,
  finderMemberId: string, finderMemberName: string, shares: Share[]
): Promise<void> => {
  const distribution = calculateWalletDistribution(principalPortion, interestPortion, finderMemberId, finderMemberName, shares);
  if (distribution.finderCommission > 0) {
    await creditReturns(finderMemberId, finderMemberName, distribution.finderCommission, TransactionType.COMMISSION, loanId,
      `Commission (10% interest) — ${loanNumber} EMI #${emiNumber}`);
  }
  for (const credit of distribution.memberCredits) {
    if (credit.totalCredit <= 0) continue;
    const wallet = await getWalletByMember(credit.memberId);
    if (!wallet) continue;
    const newReturns = roundMoney(Number(wallet.returnsBalance) + credit.totalCredit);
    const newTotal = roundMoney(Number(wallet.investmentBalance) + newReturns);
    const newTotalEarned = roundMoney(Number(wallet.totalEarned) + credit.totalCredit);
    await updateDoc(COLLECTIONS.WALLETS, wallet.walletId, { returnsBalance: newReturns, totalBalance: newTotal, totalEarned: newTotalEarned, updatedAt: serverTimestamp() });
    await logTransaction(wallet.walletId, credit.memberId, loanId, TransactionType.SHARE_CREDIT, credit.totalCredit,
      `EMI #${emiNumber} — Principal ₹${credit.principalCredit.toFixed(2)} + Interest ₹${credit.interestCredit.toFixed(2)} — ${loanNumber}`);
  }
};

export const refundLoanContributions = async (loanId: string, loanNumber: string, shares: Share[]): Promise<void> => {
  for (const share of shares) {
    if (Number((share as any).shareAmt) <= 0) continue;
    const wallet = await getWalletByMember((share as any).memberId);
    if (!wallet) continue;
    const amt = Number((share as any).shareAmt);
    const newDeployed = Math.max(0, roundMoney(Number(wallet.deployedBalance) - amt));
    const newInvestment = roundMoney(Number(wallet.investmentBalance) + amt);
    const newFree = Math.max(0, roundMoney(newInvestment - newDeployed));
    const newTotal = roundMoney(newInvestment + Number(wallet.returnsBalance));
    await updateDoc(COLLECTIONS.WALLETS, wallet.walletId, { investmentBalance: newInvestment, deployedBalance: newDeployed, freeInvestment: newFree, totalBalance: newTotal, updatedAt: serverTimestamp() });
    await logTransaction(wallet.walletId, (share as any).memberId, loanId, TransactionType.LOAN_REFUND, amt, `Refund — loan ${loanNumber} cancelled`);
  }
};

export const getWalletTransactions = async (memberId: string): Promise<WalletTransaction[]> => {
  if (!memberId) return [];
  const data = await queryDocs(COLLECTIONS.WALLET_TRANSACTIONS, [{ field: "memberId", op: "==", value: memberId }]);
  return (data as WalletTransaction[]).sort((a: any, b: any) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
};
