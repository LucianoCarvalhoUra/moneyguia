export type ExpenseCategory = 
  | 'food' 
  | 'transport' 
  | 'entertainment' 
  | 'health' 
  | 'shopping' 
  | 'bills' 
  | 'education' 
  | 'other';

export type PaymentMethod = 'account' | 'pix' | 'credit_card';

export interface BankAccount {
  id: string;
  bankName: string;
  agency: string;
  accountNumber: string;
  userId: string;
}

export interface CreditCard {
  id: string;
  brand: string;
  lastFourDigits: string;
  userId: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: Date;
  dueDate: Date;
  paymentMethod: PaymentMethod;
  accountId?: string;
  cardId?: string;
  isRecurring: boolean;
  installments?: number;
  currentInstallment?: number;
  observation?: string;
  userId: string;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  whatsappNumber?: string;
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: 'Alimentação',
  transport: 'Transporte',
  entertainment: 'Lazer',
  health: 'Saúde',
  shopping: 'Compras',
  bills: 'Contas',
  education: 'Educação',
  other: 'Outros',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  food: '🍔',
  transport: '🚗',
  entertainment: '🎬',
  health: '💊',
  shopping: '🛍️',
  bills: '📄',
  education: '📚',
  other: '📦',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  account: 'Conta Corrente',
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
};
