export interface Wallet {
  walletId: string;
  memberId: string;
  memberName: string;

  // Investment tracking
  investmentBalance: number;   // Total committed by member (paper number)
  deployedBalance: number;     // Locked in active loans
  freeInvestment: number;      // investmentBalance - deployedBalance (can be reduced)

  // Returns tracking (physically in company account)
  returnsBalance: number;      // Earned from EMI returns (principal back + interest share)

  // Combined for contribution calculation
  totalBalance: number;        // investmentBalance + returnsBalance

  // Legacy / summary fields
  totalEarned: number;         // Lifetime returns earned
  totalWithdrawn: number;      // Lifetime returns withdrawn
  totalInvested: number;       // Lifetime investment added

  updatedAt: Date;
}
