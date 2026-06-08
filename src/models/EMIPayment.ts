export interface EMIPayment {
  paymentId: string;
  loanId: string;
  emiNumber: number;
  amtPaid: number;
  verified: boolean;
  recordedBy: string;
  recordedByName: string;
  paidAt: Date;
  verifiedAt: Date | null;
}

export interface CreateEMIPaymentInput {
  loanId: string;
  emiNumber: number;
  amtPaid: number;
  recordedBy: string;
  recordedByName: string;
  paidAt: Date;
}
