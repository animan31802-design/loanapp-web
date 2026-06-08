import {LoanStatus, LoanMode} from '@/constants/Enums';

export interface Loan {
  loanId: string;
  id?: string;
  loanNumber: string;         // e.g. LN00001
  customerId: string;
  customerName: string;
  customerPhone: string;
  finderMemberId: string;
  finderMemberName: string;
  requestedAmt: number;
  requestMonth: string;       // e.g. "2025-06" (YYYY-MM)
  planId: string;
  planName: string;
  mode: LoanMode | null;
  interestRate: number | null;        // kept for legacy EMI calc
  interestRatePerHundred: number | null; // new: ₹X per ₹100 per month
  tenureMonths: number | null;
  status: LoanStatus;
  totalContributed: number;
  createdAt: Date;
  approvedAt: Date | null;
  closedAt: Date | null;
}

export interface CreateLoanInput {
  loanNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  finderMemberId: string;
  finderMemberName: string;
  requestedAmt: number;
  requestMonth: string;
  planId: string;
  planName: string;
  mode: LoanMode;
  interestRatePerHundred: number;
  tenureMonths: number;
}

export interface ApproveLoanInput {
  loanId: string;
  interestRate: number;
  mode: LoanMode;
  tenureMonths: number;
}

export interface EMISuggestion {
  tenureMonths: number;
  monthlyEMI: number;
  totalInterest: number;
  totalPayable: number;
}
