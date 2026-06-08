import {TransactionType} from '@/constants/Enums';

export interface WalletTransaction {
  txnId: string;
  walletId: string;
  memberId: string;
  loanId: string | null;
  type: TransactionType;
  amount: number;
  note: string;
  createdAt: Date;
}

export interface CreateWalletTransactionInput {
  walletId: string;
  memberId: string;
  loanId: string | null;
  type: TransactionType;
  amount: number;
  note: string;
}
