import { queryDocs, setDoc, generateId, serverTimestamp, COLLECTIONS } from "@/services/FirebaseService";
import { Withdrawal, CreateWithdrawalInput } from "@/models/Withdrawal";
import { WithdrawalStatus } from "@/constants/Enums";

export const requestWithdrawal = async (input: CreateWithdrawalInput): Promise<string> => {
  const withdrawalId = generateId(COLLECTIONS.WITHDRAWALS);
  await setDoc(COLLECTIONS.WITHDRAWALS, withdrawalId, {
    withdrawalId: String(withdrawalId),
    memberId: String(input.memberId),
    memberName: String(input.memberName),
    amount: Number(input.amount),
    status: WithdrawalStatus.PENDING,
    requestedAt: serverTimestamp(),
  });
  return withdrawalId;
};

export const approveWithdrawal = async (withdrawalId: string, memberId: string, amount: number): Promise<void> => {
  const { debitWallet } = await import("@/controllers/WalletController");
  const { updateDoc } = await import("@/services/FirebaseService");
  await debitWallet(memberId, amount, null, "Withdrawal approved by admin");
  await updateDoc(COLLECTIONS.WITHDRAWALS, withdrawalId, { status: WithdrawalStatus.APPROVED, approvedAt: serverTimestamp() });
};

export const getPendingWithdrawals = async (): Promise<Withdrawal[]> => {
  const data = await queryDocs(COLLECTIONS.WITHDRAWALS, [{ field: "status", op: "==", value: WithdrawalStatus.PENDING }]);
  return (data as Withdrawal[]).sort((a: any, b: any) => (b.requestedAt?.getTime?.() || 0) - (a.requestedAt?.getTime?.() || 0));
};

export const getWithdrawalsByMember = async (memberId: string): Promise<Withdrawal[]> => {
  if (!memberId) return [];
  return (await queryDocs(COLLECTIONS.WITHDRAWALS, [{ field: "memberId", op: "==", value: memberId }])) as Withdrawal[];
};
