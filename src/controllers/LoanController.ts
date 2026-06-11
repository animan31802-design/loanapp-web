import {
  getDoc, setDoc, updateDoc, queryDocs, generateId,
  serverTimestamp, db, firestoreDoc, COLLECTIONS,
} from "@/services/FirebaseService";
import { LoanStatus, LoanMode } from "@/constants/Enums";
import { Loan, CreateLoanInput, ApproveLoanInput } from "@/models/Loan";

const getAdminId = async (): Promise<string | null> => {
  try {
    const admins = await queryDocs(COLLECTIONS.USERS, [{ field: "role", op: "==", value: "admin" }]);
    return admins.length > 0 ? (admins[0] as any).uid : null;
  } catch { return null; }
};

export const createLoanRequest = async (input: CreateLoanInput): Promise<string> => {
  const loanId = generateId(COLLECTIONS.LOANS);
  const docData: Record<string, unknown> = {
    loanId: String(loanId),
    loanNumber: String(input.loanNumber || ""),
    customerId: String(input.customerId || ""),
    customerName: String(input.customerName || ""),
    customerPhone: String(input.customerPhone || ""),
    finderMemberId: String(input.finderMemberId || ""),
    finderMemberName: String(input.finderMemberName || ""),
    requestedAmt: Number(input.requestedAmt) || 0,
    requestMonth: String(input.requestMonth || ""),
    planId: String(input.planId || ""),
    planName: String(input.planName || ""),
    mode: String(input.mode || ""),
    interestRatePerHundred: Number(input.interestRatePerHundred) || 0,
    tenureMonths: Number(input.tenureMonths) || 0,
    status: LoanStatus.PENDING,
    totalContributed: 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(COLLECTIONS.LOANS, loanId, docData);

  try {
    const adminId = await getAdminId();
    if (adminId) {
      const { getAllWallets } = await import("@/controllers/WalletController");
      const { notifyNewLoanRequest } = await import("@/controllers/NotificationController");
      const wallets = await getAllWallets().catch(() => []);
      const totalAvailable = wallets.reduce((s: number, w: any) =>
        s + (Number(w.investmentBalance) || 0) + (Number(w.returnsBalance) || 0), 0);
      await notifyNewLoanRequest(adminId, String(input.finderMemberName), String(input.customerName), Number(input.requestedAmt) || 0, totalAvailable);
    }
  } catch (e) { console.log("Notification error:", e); }

  return loanId;
};

export const approveLoan = async (input: ApproveLoanInput): Promise<void> => {
  const loan = await getLoanById(input.loanId);
  if (!loan) throw new Error("Loan not found");

  const { getAllMembers } = await import("@/controllers/TeamController");
  const { deductLoanContributions } = await import("@/controllers/WalletController");
  const { createShare } = await import("@/controllers/ShareController");

  // If FUNDED, wallet deductions already happened — only create shares and mark ACTIVE.
  // If PENDING, run the full deduction flow.
  if (loan.status !== LoanStatus.FUNDED) {
    const members = await getAllMembers();
    if (!members || members.length === 0) throw new Error("No members found.");

    const contributions = await deductLoanContributions(
      input.loanId, loan.loanNumber || input.loanId,
      Number(loan.requestedAmt),
      members.map((m: any) => ({ memberId: m.uid, memberName: m.name }))
    );

    for (const c of contributions) {
      if (c.contributeAmt > 0) {
        await createShare(input.loanId, c.memberId, c.memberName, c.contributeAmt, c.shareRatio, c.fromReturns || 0, c.fromInvestment || 0);
      }
    }
  }

  await updateDoc(COLLECTIONS.LOANS, input.loanId, {
    status: LoanStatus.ACTIVE,
    totalContributed: Number(loan.requestedAmt),
    approvedAt: serverTimestamp(),
  });

  try {
    const { notifyLoanApproved } = await import("@/controllers/NotificationController");
    await notifyLoanApproved(loan.finderMemberId, loan.customerName, Number(loan.requestedAmt));
  } catch (e) { console.log("Notification error:", e); }
};

export const rejectLoan = async (loanId: string): Promise<void> => {
  const loan = await getLoanById(loanId);
  await updateDoc(COLLECTIONS.LOANS, loanId, { status: LoanStatus.REJECTED, closedAt: serverTimestamp() });
  try {
    if (loan) {
      const { notifyLoanRejected } = await import("@/controllers/NotificationController");
      await notifyLoanRejected(loan.finderMemberId, loan.customerName);
    }
  } catch (e) { console.log("Notification error:", e); }
};

export const cancelLoan = async (loanId: string): Promise<void> => {
  const loan = await getLoanById(loanId);
  if (!loan) throw new Error("Loan not found");
  if (loan.status === LoanStatus.ACTIVE) throw new Error("Cannot cancel a loan that has already been disbursed.");

  const { getSharesByLoan, deleteSharesByLoan } = await import("@/controllers/ShareController");
  const { refundLoanContributions } = await import("@/controllers/WalletController");

  const shares = await getSharesByLoan(loanId);
  if (shares.length > 0) {
    await refundLoanContributions(loanId, loan.loanNumber || loanId, shares);
    await deleteSharesByLoan(loanId);
  }
  await updateDoc(COLLECTIONS.LOANS, loanId, { status: LoanStatus.REJECTED, closedAt: serverTimestamp() });
};

export const setDisbursementDate = async (loanId: string, disbursementDate: string): Promise<void> => {
  await updateDoc(COLLECTIONS.LOANS, loanId, { disbursementDate: String(disbursementDate) });
};

export const markDisbursed = async (loanId: string): Promise<void> => {
  const loan = await getLoanById(loanId);
  if (!loan) throw new Error("Loan not found");

  const { getSharesByLoan } = await import("@/controllers/ShareController");
  const { markShareDisbursed } = await import("@/controllers/WalletController");

  const shares = await getSharesByLoan(loanId);
  for (const share of shares) {
    await markShareDisbursed((share as any).memberId, Number((share as any).shareAmt));
  }

  await updateDoc(COLLECTIONS.LOANS, loanId, { disbursed: true, disbursedAt: serverTimestamp() });
};

export const getLoanById = async (loanId: string): Promise<Loan | null> => {
  if (!loanId) return null;
  const data = await getDoc(COLLECTIONS.LOANS, loanId);
  if (data) return data as Loan;
  const results = await queryDocs(COLLECTIONS.LOANS, [{ field: "loanId", op: "==", value: loanId }]);
  return results.length > 0 ? (results[0] as Loan) : null;
};

export const getPendingLoans = async (): Promise<Loan[]> => {
  return (await queryDocs(COLLECTIONS.LOANS, [{ field: "status", op: "==", value: LoanStatus.PENDING }])) as Loan[];
};

export const getFundedLoans = async (): Promise<Loan[]> => {
  return (await queryDocs(COLLECTIONS.LOANS, [{ field: "status", op: "==", value: LoanStatus.FUNDED }])) as Loan[];
};

export const getActiveLoans = async (): Promise<Loan[]> => {
  return (await queryDocs(COLLECTIONS.LOANS, [{ field: "status", op: "==", value: LoanStatus.ACTIVE }])) as Loan[];
};

export const getAllLoans = async (): Promise<Loan[]> => {
  return (await queryDocs(COLLECTIONS.LOANS, [])) as Loan[];
};

export const getLoansByMember = async (memberId: string): Promise<Loan[]> => {
  if (!memberId) return [];
  return (await queryDocs(COLLECTIONS.LOANS, [{ field: "finderMemberId", op: "==", value: memberId }])) as Loan[];
};

export const updateTotalContributed = async (loanId: string, totalContributed: number, requestedAmt: number): Promise<void> => {
  const newStatus = totalContributed >= requestedAmt ? LoanStatus.FUNDED : LoanStatus.PENDING;
  await updateDoc(COLLECTIONS.LOANS, loanId, { totalContributed, status: newStatus });
};
