import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import type { ReportElement, FilterConfig, Aggregation } from './types';
import { PAYMENT_METHOD_MAP } from './schema';

// ─── Aggregation helper ───────────────────────────────────────────────────────

function aggregate(values: number[], method: Aggregation = 'sum'): number {
  if (!values.length) return 0;
  switch (method) {
    case 'sum':   return values.reduce((a, b) => a + b, 0);
    case 'count': return values.length;
    case 'avg':   return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':   return Math.min(...values);
    case 'max':   return Math.max(...values);
  }
}

// ─── Generic filter application ──────────────────────────────────────────────

function applyFilters<T extends Record<string, unknown>>(rows: T[], filters?: FilterConfig[]): T[] {
  if (!filters?.length) return rows;
  return rows.filter(row =>
    filters.every(f => {
      const v = row[f.field];
      const fv = f.value.toLowerCase();
      const sv = String(v ?? '').toLowerCase();
      switch (f.operator) {
        case 'eq':       return sv === fv;
        case 'neq':      return sv !== fv;
        case 'gt':       return Number(v) > Number(f.value);
        case 'lt':       return Number(v) < Number(f.value);
        case 'gte':      return Number(v) >= Number(f.value);
        case 'lte':      return Number(v) <= Number(f.value);
        case 'contains': return sv.includes(fv);
        default:         return true;
      }
    })
  );
}

// ─── Derive key label ─────────────────────────────────────────────────────────

function resolveLabel(
  key: string,
  row: Record<string, unknown>,
  categoryMap: Record<string, string>,
): string {
  if (key === 'categoryId') return categoryMap[row.categoryId as string] ?? 'Sem categoria';
  if (key === 'paymentMethod') return PAYMENT_METHOD_MAP[row.paymentMethod as string] ?? String(row.paymentMethod ?? '');
  if (key === 'isPaid') return row.isPaid ? 'Pago' : 'Pendente';
  if (key === 'isReceived') return row.isReceived ? 'Recebido' : 'Pendente';
  if (key === 'month') {
    const date = row.expenseDate ?? row.receiveDate;
    if (!date) return '—';
    return format(new Date(date as string), 'MMM/yy', { locale: ptBR });
  }
  return String(row[key] ?? '');
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useReportData(element: ReportElement) {
  const { expenses, categories, getCategoryById } = useFinance();
  const { incomes, incomeCategories, getIncomeCategoryById } = useIncome();

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    incomeCategories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories, incomeCategories]);

  return useMemo(() => {
    const { config, type } = element;
    if (!config.dataSource) return null;

    const rawRows = config.dataSource === 'expenses'
      ? expenses.map(e => ({
          ...e,
          expenseDate: e.expenseDate instanceof Date ? e.expenseDate.toISOString() : String(e.expenseDate),
        }))
      : incomes.map(i => ({
          ...i,
          receiveDate: i.receiveDate instanceof Date ? i.receiveDate.toISOString() : String(i.receiveDate),
        }));

    const filtered = applyFilters(
      rawRows as Record<string, unknown>[],
      config.filters,
    );

    // ── KPI
    if (type === 'kpi') {
      const values = filtered.map(r => Number(r[config.field ?? 'amount'] ?? 0));
      return { value: aggregate(values, config.aggregation ?? 'sum') };
    }

    // ── Charts (pie, bar, line)
    if (['pie-chart', 'bar-chart', 'line-chart'].includes(type)) {
      if (!config.groupBy) return { chartData: [] };

      const groups: Record<string, number[]> = {};
      filtered.forEach(row => {
        const labelKey = resolveLabel(config.groupBy!, row, categoryMap);
        const val = Number(row[config.yField ?? 'amount'] ?? 0);
        if (!groups[labelKey]) groups[labelKey] = [];
        groups[labelKey].push(val);
      });

      const chartData = Object.entries(groups)
        .map(([name, vals]) => ({ name, value: aggregate(vals, config.aggregation ?? 'sum') }))
        .sort((a, b) => b.value - a.value);

      const limited = config.limit ? chartData.slice(0, config.limit) : chartData;
      return { chartData: limited };
    }

    // ── Data table
    if (type === 'data-table') {
      const cols = config.columns ?? ['expenseDate', 'description', 'amount', 'categoryId'];
      const rows = filtered.slice(0, config.limit ?? 50).map(row =>
        Object.fromEntries(
          cols.map(col => {
            if (col === 'categoryId') return [col, categoryMap[row.categoryId as string] ?? '—'];
            if (col === 'paymentMethod') return [col, PAYMENT_METHOD_MAP[row.paymentMethod as string] ?? String(row.paymentMethod ?? '')];
            if (col === 'expenseDate' || col === 'receiveDate') {
              const d = row[col];
              return [col, d ? format(new Date(d as string), 'dd/MM/yyyy') : '—'];
            }
            if (col === 'amount') return [col, Number(row.amount ?? 0)];
            return [col, String(row[col] ?? '—')];
          })
        )
      );
      return { rows, cols };
    }

    return null;
  }, [element, expenses, incomes, categoryMap]);
}

// ─── Field label helper (exported for use in UI) ──────────────────────────────

export const FIELD_LABELS: Record<string, string> = {
  amount:        'Valor (R$)',
  description:   'Descrição',
  title:         'Título',
  expenseDate:   'Data Despesa',
  receiveDate:   'Data Receb.',
  categoryId:    'Categoria',
  paymentMethod: 'Forma Pag.',
  isPaid:        'Status',
  isReceived:    'Recebido',
  month:         'Mês',
};
