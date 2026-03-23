export type TransactionType = 'income' | 'expense';
export type AccountType = 'card' | 'cash' | 'bank';

export interface UserProfile {
  id: string;
  email: string;
  createdAt: string;
  role?: 'admin' | 'user';
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  showOnDashboard: boolean;
  showInTotals: boolean;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  description: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  completedAt?: string;
  isCompleted: boolean;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  limitAmount: number;
  period: 'monthly';
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}
