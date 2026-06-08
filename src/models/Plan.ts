import {LoanMode} from '@/constants/Enums';

export interface Plan {
  planId: string;
  name: string;
  months: number;
  interestRatePerHundred: number; // e.g. 1.50 means ₹1.50 per ₹100 per month
  repaymentType: LoanMode;        // EMI or INTEREST_ONLY
  isActive: boolean;
  createdAt: Date;
}

export interface CreatePlanInput {
  name: string;
  months: number;
  interestRatePerHundred: number;
  repaymentType: LoanMode;
}

// Derived breakdown for UI display
export interface PlanBreakdown {
  monthlyInterest: number;
  monthlyEMI: number;       // principal/months + interest (EMI mode) OR just interest (IO mode)
  totalInterest: number;
  totalPayable: number;
  principalPerMonth: number;
  schedule: ScheduleRow[];
}

export interface ScheduleRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}
