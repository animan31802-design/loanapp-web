export const Routes = {
  // Auth
  LOGIN: 'Login',

  // Admin
  ADMIN_DASHBOARD: 'AdminDashboard',
  LOAN_REQUESTS_LIST: 'LoanRequestsList',
  FUNDED_LOANS_LIST: 'FundedLoansList',
  LOAN_APPROVAL_DETAIL: 'LoanApprovalDetail',
  ACTIVE_LOANS_LIST: 'ActiveLoansList',
  PAYMENT_VERIFICATION: 'PaymentVerification',
  MEMBERS_LIST: 'MembersList',
  MEMBER_DETAIL: 'MemberDetail',
  ADD_MEMBER: 'AddMember',
  WITHDRAWAL_REQUESTS: 'WithdrawalRequests',
  REPORTS: 'Reports',
  PLANS: 'Plans',
  APP_SETTINGS: 'AppSettings',

  // Member
  MEMBER_DASHBOARD: 'MemberDashboard',
  ALL_LOANS: 'AllLoans',
  NEW_LOAN_REQUEST: 'NewLoanRequest',
  MY_LOANS: 'MyLoans',
  MY_CONTRIBUTIONS: 'MyContributions',
  MY_WALLET: 'MyWallet',
  REQUEST_WITHDRAWAL: 'RequestWithdrawal',
  ADD_INVESTMENT: 'AddInvestment',
  NOTIFICATIONS: 'Notifications',

  // Loan (shared)
  LOAN_DETAIL: 'LoanDetail',
  EMI_SCHEDULE: 'EMISchedule',
  CONTRIBUTE_SHARE: 'ContributeShare',
  RECORD_PAYMENT: 'RecordPayment',
} as const;