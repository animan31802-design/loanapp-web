import {UserRole} from '@/constants/Enums';

export interface User {
  uid: string;
  name: string;
  phone: string;
  role: UserRole;
  teamId: string | null;
  createdAt: Date;
}

export interface CreateUserInput {
  name: string;
  phone: string;
  role: UserRole;
  teamId?: string;
}
