export interface Share {
  shareId: string;
  loanId: string;
  memberId: string;
  memberName: string;
  shareAmt: number;
  shareRatio: number;
  fromReturns: number;          // auto-collected (already in company)
  fromInvestment: number;       // needs physical collection from member
  investmentCollected: boolean; // admin marks true after collecting cash
  investmentCollectedAt?: Date;
  createdAt: Date;
}

export interface CreateShareInput {
  loanId: string;
  memberId: string;
  memberName: string;
  shareAmt: number;
  shareRatio: number;
  fromReturns: number;
  fromInvestment: number;
}
