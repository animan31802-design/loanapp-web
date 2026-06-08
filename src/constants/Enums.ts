export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum LoanStatus {
  PENDING = 'PENDING',     // Created, members contributing
  FUNDED = 'FUNDED',       // Full amount collected, waiting admin approval
  ACTIVE = 'ACTIVE',       // Admin approved, EMIs running
  REJECTED = 'REJECTED',   // Admin rejected
  CLOSED = 'CLOSED',       // All EMIs paid
}

export enum LoanMode {
  EMI = 'EMI',                        // Reducing balance EMI
  FLAT_EMI = 'FLAT_EMI',              // Fixed same amount every month
  INTEREST_ONLY = 'INTEREST_ONLY',    // Interest monthly, principal at end
}

export enum LoanTenure {
  ONE_YEAR = 12,
  TWO_YEARS = 24,
  THREE_YEARS = 36,
}

export enum TransactionType {
  INVESTMENT = 'INVESTMENT',       // Member adds monthly investment
  INVESTMENT_REDUCE = 'INVESTMENT_REDUCE', // Member reduces free investment
  COMMISSION = 'COMMISSION',       // Finder 10% on interest
  SHARE_CREDIT = 'SHARE_CREDIT',   // EMI returns (principal + interest share)
  WITHDRAWAL = 'WITHDRAWAL',       // Member withdraws returns
  LOAN_CONTRIBUTION = 'LOAN_CONTRIBUTION', // Deducted when loan approved
  LOAN_REFUND = 'LOAN_REFUND',     // Refunded when loan cancelled
}

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
}
