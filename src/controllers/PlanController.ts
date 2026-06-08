import {
  getDoc, setDoc, updateDoc, deleteDoc, queryDocs,
  generateId, serverTimestamp, runTransaction,
  db, firestoreDoc, COLLECTIONS,
} from "@/services/FirebaseService";
import { Plan, CreatePlanInput, PlanBreakdown, ScheduleRow } from "@/models/Plan";
import { LoanMode } from "@/constants/Enums";
import { AppConfig } from "@/constants/AppConfig";
import { roundMoney, splitProportionally } from "@/utils/WalletCalculator";

// ─── Plan CRUD ────────────────────────────────────────────────────────────────

export const createPlan = async (input: CreatePlanInput): Promise<string> => {
  const planId = generateId(COLLECTIONS.PLANS);
  await setDoc(COLLECTIONS.PLANS, planId, {
    planId, name: String(input.name), months: Number(input.months),
    interestRatePerHundred: Number(input.interestRatePerHundred),
    repaymentType: String(input.repaymentType),
    isActive: true, createdAt: serverTimestamp(),
  });
  return planId;
};

export const updatePlan = async (planId: string, input: Partial<CreatePlanInput>): Promise<void> => {
  const clean: Record<string, unknown> = {};
  if (input.name !== undefined) clean.name = String(input.name);
  if (input.months !== undefined) clean.months = Number(input.months);
  if (input.interestRatePerHundred !== undefined) clean.interestRatePerHundred = Number(input.interestRatePerHundred);
  if (input.repaymentType !== undefined) clean.repaymentType = String(input.repaymentType);
  await updateDoc(COLLECTIONS.PLANS, planId, clean);
};

export const togglePlanActive = async (planId: string, isActive: boolean): Promise<void> => {
  await updateDoc(COLLECTIONS.PLANS, planId, { isActive });
};

export const deletePlan = async (planId: string): Promise<void> => {
  await deleteDoc(COLLECTIONS.PLANS, planId);
};

export const getAllPlans = async (): Promise<Plan[]> => {
  const data = await queryDocs(COLLECTIONS.PLANS, []);
  return (data as Plan[]).sort((a: any, b: any) => {
    return (a.createdAt?.getTime?.() || 0) - (b.createdAt?.getTime?.() || 0);
  });
};

export const getActivePlans = async (): Promise<Plan[]> => {
  const data = await queryDocs(COLLECTIONS.PLANS, [{ field: "isActive", op: "==", value: true }]);
  return (data as Plan[]).sort((a: any, b: any) => {
    return (a.createdAt?.getTime?.() || 0) - (b.createdAt?.getTime?.() || 0);
  });
};

export const getPlanById = async (planId: string): Promise<Plan | null> => {
  const data = await getDoc(COLLECTIONS.PLANS, planId);
  return data ? (data as Plan) : null;
};

// ─── Loan Number Generator (thread-safe transaction) ─────────────────────────

const APP_META_COLLECTION = "app_meta";
const LOAN_COUNTER_DOC = "loan_counter";

export const generateLoanNumber = async (): Promise<string> => {
  let newCount = 1;
  try {
    const counterRef = firestoreDoc(APP_META_COLLECTION, LOAN_COUNTER_DOC);
    await runTransaction(async (transaction) => {
      const snap = await transaction.get(counterRef);
      if (!snap.exists()) {
        transaction.set(counterRef, { count: 1 });
        newCount = 1;
      } else {
        const current = snap.data()?.count;
        newCount = (typeof current === "number" ? current : 0) + 1;
        transaction.update(counterRef, { count: newCount });
      }
    });
  } catch (e: unknown) {
    console.warn("generateLoanNumber: transaction failed, using fallback.", e instanceof Error ? e.message : e);
    try {
      const counterRef = firestoreDoc(APP_META_COLLECTION, LOAN_COUNTER_DOC);
      const { db: firestore } = await import("@/lib/firebase");
      const { getDoc: fsGet, setDoc: fsSet, updateDoc: fsUp, doc } = await import("firebase/firestore");
      const snap = await fsGet(doc(firestore, APP_META_COLLECTION, LOAN_COUNTER_DOC));
      if (!snap.exists()) {
        await fsSet(doc(firestore, APP_META_COLLECTION, LOAN_COUNTER_DOC), { count: 1 });
        newCount = 1;
      } else {
        newCount = (snap.data()?.count || 0) + 1;
        await fsUp(doc(firestore, APP_META_COLLECTION, LOAN_COUNTER_DOC), { count: newCount });
      }
    } catch {
      newCount = Math.floor(Date.now() / 1000) % 99999;
    }
  }
  return `LN${String(newCount).padStart(5, "0")}`;
};

// ─── Plan Breakdown Calculator ────────────────────────────────────────────────

export const calculatePlanBreakdown = (plan: Plan, principal: number): PlanBreakdown => {
  const { months, interestRatePerHundred, repaymentType } = plan;
  const p = Number(principal);
  const monthlyInterest = roundMoney((p * interestRatePerHundred) / 100);

  if (repaymentType === LoanMode.FLAT_EMI) {
    const totalInterest = roundMoney(monthlyInterest * months);
    const totalPayable = roundMoney(p + totalInterest);
    const principalSplits = splitProportionally(p, Array(months).fill(1));
    const basePrincipal = Math.floor((p / months) * 100) / 100;
    const flatEMI = roundMoney(basePrincipal + monthlyInterest);
    const schedule: ScheduleRow[] = Array.from({ length: months }, (_, i) => {
      const principal = principalSplits[i];
      const payment = roundMoney(principal + monthlyInterest);
      const balance = Math.max(0, roundMoney(p - principalSplits.slice(0, i + 1).reduce((s, v) => s + v, 0)));
      return { month: i + 1, payment, principal, interest: monthlyInterest, balance };
    });
    return { monthlyInterest, monthlyEMI: flatEMI, totalInterest, totalPayable, principalPerMonth: basePrincipal, schedule };
  }

  if (repaymentType === LoanMode.INTEREST_ONLY) {
    const totalInterest = roundMoney(monthlyInterest * months);
    const totalPayable = roundMoney(p + totalInterest);
    const schedule: ScheduleRow[] = Array.from({ length: months }, (_, i) => ({
      month: i + 1,
      payment: i === months - 1 ? roundMoney(monthlyInterest + p) : monthlyInterest,
      principal: i === months - 1 ? p : 0,
      interest: monthlyInterest,
      balance: i === months - 1 ? 0 : p,
    }));
    return { monthlyInterest, monthlyEMI: monthlyInterest, totalInterest, totalPayable, principalPerMonth: 0, schedule };
  }

  // Reducing EMI
  const principalSplits = splitProportionally(p, Array(months).fill(1));
  const schedule: ScheduleRow[] = [];
  let balance = p;
  let totalInterestSum = 0;
  for (let i = 0; i < months; i++) {
    const principal = principalSplits[i];
    const interestThisMonth = roundMoney((balance * interestRatePerHundred) / 100);
    const payment = roundMoney(principal + interestThisMonth);
    totalInterestSum = roundMoney(totalInterestSum + interestThisMonth);
    balance = Math.max(0, roundMoney(balance - principal));
    schedule.push({ month: i + 1, payment, principal, interest: interestThisMonth, balance });
  }
  return {
    monthlyInterest, monthlyEMI: schedule[0]?.payment || 0,
    totalInterest: totalInterestSum, totalPayable: roundMoney(p + totalInterestSum),
    principalPerMonth: principalSplits[0] || 0, schedule,
  };
};
