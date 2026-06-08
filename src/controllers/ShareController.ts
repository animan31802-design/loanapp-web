import {
  queryDocs, setDoc, generateId, serverTimestamp, COLLECTIONS,
} from "@/services/FirebaseService";
import { Share } from "@/models/Share";

export const createShare = async (
  loanId: string, memberId: string, memberName: string,
  shareAmt: number, shareRatio: number, fromReturns = 0, fromInvestment = 0
): Promise<string> => {
  const shareId = generateId(COLLECTIONS.SHARES);
  await setDoc(COLLECTIONS.SHARES, shareId, {
    shareId: String(shareId), loanId: String(loanId),
    memberId: String(memberId), memberName: String(memberName),
    shareAmt: Number(shareAmt), shareRatio: Number(shareRatio),
    fromReturns: Number(fromReturns), fromInvestment: Number(fromInvestment),
    investmentCollected: Number(fromInvestment) <= 0,
    createdAt: serverTimestamp(),
  });
  return shareId;
};

export const getSharesByLoan = async (loanId: string): Promise<Share[]> => {
  if (!loanId) return [];
  return (await queryDocs(COLLECTIONS.SHARES, [{ field: "loanId", op: "==", value: loanId }])) as Share[];
};

export const getSharesByMember = async (memberId: string): Promise<Share[]> => {
  if (!memberId) return [];
  return (await queryDocs(COLLECTIONS.SHARES, [{ field: "memberId", op: "==", value: memberId }])) as Share[];
};

export const markInvestmentCollected = async (shareId: string): Promise<void> => {
  const { updateDoc } = await import("@/services/FirebaseService");
  await updateDoc(COLLECTIONS.SHARES, shareId, { investmentCollected: true, investmentCollectedAt: serverTimestamp() });
};

export const areAllContributionsCollected = async (loanId: string): Promise<boolean> => {
  const shares = await getSharesByLoan(loanId);
  if (shares.length === 0) return false;
  return shares.every((s: any) => s.investmentCollected === true);
};

export const deleteSharesByLoan = async (loanId: string): Promise<void> => {
  const { deleteDoc } = await import("@/services/FirebaseService");
  const shares = await getSharesByLoan(loanId);
  await Promise.all(shares.map((s: any) => deleteDoc(COLLECTIONS.SHARES, s.shareId || s.id)));
};
