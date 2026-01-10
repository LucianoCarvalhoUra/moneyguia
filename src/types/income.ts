export interface IncomeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  userId: string;
  isDefault?: boolean;
}

export interface Income {
  id: string;
  categoryId: string;
  title: string;
  amount: number;
  receiveDate: Date;
  description?: string;
  isRecurring: boolean;
  accountId?: string;
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
