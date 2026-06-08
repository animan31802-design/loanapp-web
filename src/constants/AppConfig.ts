export const AppConfig = {
  FINDER_COMMISSION_RATE: 0.10,
  POOL_RATE: 0.90,
  TENURE_OPTIONS: [12, 24, 36],
  APP_NAME: 'LoanApp',
  CURRENCY: '₹',
  LOAN_NUMBER_PREFIX: 'LN',
  LOAN_COUNTER_DOC: 'loan_counter', // single doc in app_meta collection
  COLLECTIONS: {
    USERS: 'users',
    TEAMS: 'teams',
    CUSTOMERS: 'customers',
    LOANS: 'loans',
    SHARES: 'shares',
    EMI_PAYMENTS: 'emi_payments',
    WALLETS: 'wallets',
    WALLET_TRANSACTIONS: 'wallet_transactions',
    WITHDRAWALS: 'withdrawals',
    PLANS: 'plans',
    APP_META: 'app_meta',
    NOTIFICATIONS: 'notifications', // for loan counter + settings
  },
};
