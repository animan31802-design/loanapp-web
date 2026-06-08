import {
  queryDocs, setDoc, updateDoc, generateId, serverTimestamp, COLLECTIONS,
} from "@/services/FirebaseService";
import { EMIPayment, CreateEMIPaymentInput } from "@/models/EMIPayment";
import { LoanMode } from "@/constants/Enums";
import { roundMoney } from "@/utils/WalletCalculator";

export const getEMISplit = (
  loan: { requestedAmt: number; tenureMonths: number | null; interestRatePerHundred: number | null; mode: string | null },
  emiNumber: number
): { principalPortion: number; interestPortion: number; totalEMI: number } => {
  const principal = Number(loan.requestedAmt);
  const months = Number(loan.tenureMonths) || 1;
  const rate = Number(loan.interestRatePerHundred) || 0;
  const mode = loan.mode;

  if (mode === LoanMode.FLAT_EMI) {
    const monthlyInterest = roundMoney((principal * rate) / 100);
    const basePrincipal = Math.floor((principal / months) * 100) / 100;
    const totalBase = roundMoney(basePrincipal * months);
    const lastCorrection = roundMoney(principal - totalBase);
    const principalPortion = emiNumber === months ? roundMoney(basePrincipal + lastCorrection) : basePrincipal;
    const totalEMI = roundMoney(principalPortion + monthlyInterest);
    return { principalPortion, interestPortion: monthlyInterest, totalEMI };
  }

  if (mode === LoanMode.INTEREST_ONLY) {
    const interestPortion = roundMoney((principal * rate) / 100);
    const principalPortion = emiNumber >= months ? principal : 0;
    return { principalPortion, interestPortion, totalEMI: roundMoney(interestPortion + principalPortion) };
  }

  // Reducing EMI
  const basePrincipal = Math.floor((principal / months) * 100) / 100;
  const totalBase = roundMoney(basePrincipal * months);
  const lastCorrection = roundMoney(principal - totalBase);
  const principalPortion = emiNumber === months ? roundMoney(basePrincipal + lastCorrection) : basePrincipal;
  const paidPrincipal = roundMoney(basePrincipal * (emiNumber - 1));
  const remainingBalance = roundMoney(principal - paidPrincipal);
  const interestPortion = roundMoney((remainingBalance * rate) / 100);
  return { principalPortion, interestPortion, totalEMI: roundMoney(principalPortion + interestPortion) };
};

export const recordEMIPayment = async (input: CreateEMIPaymentInput): Promise<string> => {
  const { getLoanById } = await import("@/controllers/LoanController");
  const loan = await getLoanById(input.loanId);
  if (!loan) throw new Error("Loan not found");

  const { principalPortion, interestPortion } = getEMISplit(loan, input.emiNumber);
  const paymentId = generateId(COLLECTIONS.EMI_PAYMENTS);

  await setDoc(COLLECTIONS.EMI_PAYMENTS, paymentId, {
    paymentId: String(paymentId),
    loanId: String(input.loanId),
    emiNumber: Number(input.emiNumber),
    amtPaid: Number(input.amtPaid),
    principalPortion: Number(principalPortion),
    interestPortion: Number(interestPortion),
    recordedBy: String(input.recordedBy),
    recordedByName: String(input.recordedByName || ""),
    verified: false,
    createdAt: serverTimestamp(),
    paidAt: serverTimestamp(),
  });

  return paymentId;
};

export const verifyEMIPayment = async (paymentId: string, loanId: string, amtPaid: number): Promise<void> => {
  const { getLoanById } = await import("@/controllers/LoanController");
  const { getSharesByLoan } = await import("@/controllers/ShareController");
  const { distributeEMIToWallets } = await import("@/controllers/WalletController");
  const { notifyPaymentVerified } = await import("@/controllers/NotificationController");

  const loan = await getLoanById(loanId);
  if (!loan) throw new Error("Loan not found");

  const shares = await getSharesByLoan(loanId);
  if (!shares || shares.length === 0) throw new Error("No contribution shares found for this loan.");

  const payments = await getEMIPaymentsByLoan(loanId);
  const payment = payments.find((p: any) => p.paymentId === paymentId || p.id === paymentId);
  const emiNumber = payment?.emiNumber || payments.length;
  const { principalPortion, interestPortion } = getEMISplit(loan, emiNumber);

  await updateDoc(COLLECTIONS.EMI_PAYMENTS, paymentId, { verified: true, verifiedAt: serverTimestamp() });

  await distributeEMIToWallets(loanId, loan.loanNumber || loanId, emiNumber, principalPortion, interestPortion, loan.finderMemberId, loan.finderMemberName, shares as any);

  const months = Number(loan.tenureMonths) || 0;
  if (months > 0 && emiNumber >= months) {
    const { updateDoc: upDoc } = await import("@/services/FirebaseService");
    await upDoc(COLLECTIONS.LOANS, loanId, { status: "CLOSED", closedAt: serverTimestamp() });
  }

  try {
    const memberIds = [...new Set(shares.map((s: any) => s.memberId))];
    await notifyPaymentVerified(memberIds as string[], loanId, emiNumber, Number(amtPaid));
  } catch (e) { console.log("Notification error:", e); }
};

export const getEMIPaymentsByLoan = async (loanId: string): Promise<EMIPayment[]> => {
  if (!loanId) return [];
  const data = await queryDocs(COLLECTIONS.EMI_PAYMENTS, [{ field: "loanId", op: "==", value: loanId }]);
  return (data as EMIPayment[]).sort((a, b) => (Number(a.emiNumber) || 0) - (Number(b.emiNumber) || 0));
};

export const getPendingVerifications = async (): Promise<EMIPayment[]> => {
  return (await queryDocs(COLLECTIONS.EMI_PAYMENTS, [{ field: "verified", op: "==", value: false }])) as EMIPayment[];
};

export const getNextEMINumber = async (loanId: string): Promise<number> => {
  const payments = await getEMIPaymentsByLoan(loanId);
  return payments.length + 1;
};
