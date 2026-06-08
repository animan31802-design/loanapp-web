import {WithdrawalStatus} from '@/constants/Enums';

export interface Withdrawal {
  withdrawalId: string;
  memberId: string;
  memberName: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: Date;
  approvedAt: Date | null;
}

export interface CreateWithdrawalInput {
  memberId: string;
  memberName: string;
  amount: number;
}
