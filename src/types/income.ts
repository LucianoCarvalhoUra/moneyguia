export interface IncomeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  userId: string;
  isDefault?: boolean;
}

export interface IncomeSubcategory {
  id: string;
  name: string;
  categoryId: string;
  userId: string;
}

export interface Income {
  id: string;
  categoryId: string;
  subcategoryId?: string;
  title: string;
  amount: number;
  receiveDate: Date;
  description?: string;
  isRecurring: boolean;
  isReceived: boolean;
  accountId?: string;
  recurrenceId?: string;
  userId: string;
  createdAt: Date;
}

export const DEFAULT_INCOME_CATEGORIES: Omit<IncomeCategory, 'userId'>[] = [
  { id: 'salary', name: 'Salário', icon: '💼', color: 'category-income-salary', isDefault: true },
  { id: 'investments', name: 'Investimentos', icon: '📈', color: 'category-income-investments', isDefault: true },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: 'category-income-freelance', isDefault: true },
  { id: 'gifts', name: 'Presentes', icon: '🎁', color: 'category-income-gifts', isDefault: true },
  { id: 'other-income', name: 'Outros', icon: '💰', color: 'category-income-other', isDefault: true },
];

export const INCOME_CATEGORY_ICONS = [
  '💼', '📈', '💻', '🎁', '💰', '🏦', '💵', '📊',
  '🏠', '🚗', '✈️', '🎓', '💳', '📱', '🛒', '🎭',
];

export const INCOME_CATEGORY_COLORS = [
  'category-income-salary',
  'category-income-investments',
  'category-income-freelance',
  'category-income-gifts',
  'category-income-other',
  'category-food',
  'category-transport',
  'category-housing',
];
