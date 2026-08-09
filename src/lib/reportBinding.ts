import { Expense, Category, Subcategory, BankAccount, CreditCard, PAYMENT_METHOD_LABELS } from '@/types/finance';

export interface BindingContext {
  expense?: Expense;
  related: Expense[];
  categories: Category[];
  subcategories: Subcategory[];
  accounts: BankAccount[];
  cards: CreditCard[];
  profileName?: string;
  profileEmail?: string;
  categoryId?: string | null;
}


export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const formatDateBR = (value?: Date | string | null) => {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
};

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function resolveSubTotal(key: string, ctx: BindingContext): string {
  const target = normalize(key);
  const pool = ctx.related.length ? ctx.related : ctx.expense ? [ctx.expense] : [];
  const total = pool
    .filter((e) => {
      const sub = ctx.subcategories.find((s) => s.id === e.subcategoryId)?.name ?? '';
      const cat = ctx.categories.find((c) => c.id === e.categoryId)?.name ?? '';
      return (
        normalize(sub).includes(target) ||
        normalize(cat).includes(target) ||
        normalize(e.description || '').includes(target)
      );
    })
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  return formatBRL(total);
}

export function resolveToken(token: string, ctx: BindingContext): string {
  const key = token.replace(/[{}]/g, '').trim();
  const e = ctx.expense;

  if (key.startsWith('sub.')) return resolveSubTotal(key.slice(4), ctx);

  switch (key) {
    case 'expense.description':
      return e?.description ?? '—';
    case 'expense.amount':
      return e ? formatBRL(Number(e.amount)) : formatBRL(0);
    case 'expense.date':
      return formatDateBR(e?.expenseDate);
    case 'expense.dueDate':
      return formatDateBR(e?.dueDate);
    case 'expense.observation':
      return e?.observation || '—';
    case 'expense.installment':
      return e?.installments && e.installments > 1 ? `${e.currentInstallment ?? 1}/${e.installments}` : 'Única';
    case 'payment.method':
      return e ? PAYMENT_METHOD_LABELS[e.paymentMethod] ?? '—' : '—';
    case 'payment.settlement': {
      const m = (e as any)?.settlementMethod;
      return m ? PAYMENT_METHOD_LABELS[m as keyof typeof PAYMENT_METHOD_LABELS] ?? '—' : '—';
    }
    case 'payment.account': {
      const acc = ctx.accounts.find((a) => a.id === (e?.accountId || (e as any)?.settlementAccountId));
      return acc ? `${acc.bankName} • ${acc.accountNumber}` : '—';
    }
    case 'payment.card': {
      const card = ctx.cards.find((c) => c.id === (e?.cardId || (e as any)?.settlementCardId));
      return card ? `${card.brand} •••• ${card.lastFourDigits}` : '—';
    }
    case 'payment.status':
      return e?.isPaid ? 'PAGO' : 'PENDENTE';
    case 'category.name':
      return ctx.categories.find((c) => c.id === e?.categoryId)?.name ?? '—';
    case 'subcategory.name':
      return ctx.subcategories.find((s) => s.id === e?.subcategoryId)?.name ?? '—';
    case 'profile.name':
      return ctx.profileName || '—';
    case 'profile.email':
      return ctx.profileEmail || '—';
    case 'today':
      return formatDateBR(new Date());
    default:
      return token;
  }
}

export function renderBindings(text: string, ctx: BindingContext): string {
  if (!text) return '';
  return text.replace(/\{[^{}]+\}/g, (m) => resolveToken(m, ctx));
}
