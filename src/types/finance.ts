export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  userId: string;
  isDefault?: boolean;
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  userId: string;
}

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
  categoryId: string;
  subcategoryId?: string;
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
  isPaid: boolean;
  userId: string;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  whatsappNumber?: string;
}

export const DEFAULT_CATEGORIES: Omit<Category, 'userId'>[] = [
  { id: 'food', name: 'Alimentação', icon: '🍔', color: 'category-food', isDefault: true },
  { id: 'transport', name: 'Transporte', icon: '🚗', color: 'category-transport', isDefault: true },
  { id: 'entertainment', name: 'Lazer', icon: '🎬', color: 'category-entertainment', isDefault: true },
  { id: 'health', name: 'Saúde', icon: '💊', color: 'category-health', isDefault: true },
  { id: 'shopping', name: 'Compras', icon: '🛍️', color: 'category-shopping', isDefault: true },
  { id: 'bills', name: 'Contas', icon: '📄', color: 'category-bills', isDefault: true },
  { id: 'education', name: 'Educação', icon: '📚', color: 'category-education', isDefault: true },
  { id: 'other', name: 'Outros', icon: '📦', color: 'category-other', isDefault: true },
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  account: 'Conta Corrente',
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
};

export const CATEGORY_COLORS = [
  'category-food',
  'category-transport',
  'category-entertainment',
  'category-health',
  'category-shopping',
  'category-bills',
  'category-education',
  'category-other',
];

export const CATEGORY_ICONS = [
  '🍔', '🚗', '🎬', '💊', '🛍️', '📄', '📚', '📦',
  '🏠', '💰', '🎮', '✈️', '💼', '🎁', '🔧', '📱',
  '💡', '🌿', '🎨', '⚽', '🎵', '☕', '🐕', '👶',
];
