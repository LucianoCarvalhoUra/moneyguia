import { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PAYMENT_METHOD_LABELS } from '@/types/finance';
import type { Expense, Category, Subcategory } from '@/types/finance';
import type { Income, IncomeCategory } from '@/types/income';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KPI {
  label: string;
  value: string;
  subtext?: string;
  color: 'green' | 'red' | 'blue' | 'amber' | 'purple';
}

interface ChartConfig {
  nameKey?: string;
  valueKey?: string;
  xKey?: string;
  bars?: Array<{ key: string; color: string; label: string }>;
  lines?: Array<{ key: string; color: string; label: string }>;
}

interface AIReport {
  valid: boolean;
  invalidMessage?: string;
  title: string;
  subtitle?: string;
  kpis: KPI[];
  chartType: 'pie' | 'bar' | 'line' | 'none';
  chartTitle: string;
  chartData: Array<Record<string, number | string>>;
  chartConfig: ChartConfig;
  tableColumns: Array<{ key: string; label: string; align?: 'left' | 'right' }>;
  tableRows: Array<Record<string, string>>;
  isEmpty: boolean;
  emptyMessage?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  { emoji: '📊', text: 'Balanço Mensal (Receitas vs Despesas)' },
  { emoji: '🍽️', text: 'Distribuição de gastos por categoria este mês' },
  { emoji: '📈', text: 'Evolução mensal das minhas despesas este ano' },
];

const PIE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#64748b',
];

const KPI_STYLES: Record<string, string> = {
  green: 'border-green-200 bg-green-50 text-green-800',
  red:   'border-red-200 bg-red-50 text-red-800',
  blue:  'border-blue-200 bg-blue-50 text-blue-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  purple:'border-purple-200 bg-purple-50 text-purple-800',
};

const ITEMS_PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: unknown): string => {
  try {
    const dt = d instanceof Date ? d : new Date(d as string);
    return isNaN(dt.getTime()) ? '' : format(dt, 'dd/MM/yyyy');
  } catch { return ''; }
};

const safeDate = (d: unknown): Date => {
  try {
    const dt = d instanceof Date ? d : new Date(d as string);
    return isNaN(dt.getTime()) ? new Date(0) : dt;
  } catch { return new Date(0); }
};

// ─── Report Engine (client-side, no edge function) ────────────────────────────

function buildReport(
  prompt: string,
  expenses: Expense[],
  incomes: Income[],
  categories: Category[],
  subcategories: Subcategory[],
  incomeCategories: IncomeCategory[],
): AIReport {
  const q = prompt.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, ''); // strip accents for matching

  const now = new Date();
  const curMonth = now.getMonth();   // 0-indexed
  const curYear  = now.getFullYear();

  // ── Guard: non-finance prompt ────────────────────────────────────────────
  const financeKeywords = [
    'gasto','despesa','receita','ganho','salario','saldo','balanço','balanco',
    'categoria','conta','cartao','cartão','mes','ano','financ','dinheiro',
    'pago','pagar','receber','recebido','transporte','alimentacao','alimentação',
    'uber','anuidade','taxa','evolucao','evolução','historico','histórico',
    'distribuicao','distribuição','mensal','anual','comparativo',
  ];
  const isFinance = financeKeywords.some(k => q.includes(k));
  if (!isFinance) {
    return {
      valid: false,
      invalidMessage:
        'Desculpe, eu só consigo gerar relatórios baseados no seu histórico financeiro do MoneyGuia. Tente perguntar sobre seus gastos, receitas ou saldo!',
      title: '', subtitle: '', kpis: [],
      chartType: 'none', chartTitle: '', chartData: [], chartConfig: {},
      tableColumns: [], tableRows: [], isEmpty: false,
    };
  }

  // ── Detect time period ───────────────────────────────────────────────────
  type DateFilter = (d: Date) => boolean;
  let dateFilter: DateFilter;
  let periodLabel: string;

  if (q.includes('mes passado') || q.includes('mes anterior') || q.includes('ultimo mes')) {
    const lm = new Date(curYear, curMonth - 1, 1);
    dateFilter = (d) => d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    periodLabel = format(lm, "MMMM 'de' yyyy", { locale: ptBR });
    periodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
  } else if (q.includes('este ano') || q.includes('esse ano') || q.includes('no ano') || q.includes('do ano')) {
    dateFilter = (d) => d.getFullYear() === curYear;
    periodLabel = `Ano ${curYear}`;
  } else if (q.match(/ultimos?\s+(\d+)\s+mes/)) {
    const m = q.match(/ultimos?\s+(\d+)\s+mes/);
    const months = m ? parseInt(m[1]) : 3;
    const cutoff = new Date(curYear, curMonth - months + 1, 1);
    dateFilter = (d) => d >= cutoff;
    periodLabel = `Últimos ${months} meses`;
  } else {
    // default: current month
    dateFilter = (d) => d.getMonth() === curMonth && d.getFullYear() === curYear;
    const mn = format(now, "MMMM 'de' yyyy", { locale: ptBR });
    periodLabel = mn.charAt(0).toUpperCase() + mn.slice(1);
  }

  // ── Detect category filter ───────────────────────────────────────────────
  let catFilterId: string | null = null;
  let catFilterName: string | null = null;
  for (const c of categories) {
    const n = c.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (q.includes(n)) { catFilterId = c.id; catFilterName = c.name; break; }
  }

  // ── Filter raw data ──────────────────────────────────────────────────────
  const activeExpenses = expenses
    .filter(e => !(e as unknown as { excludeFromCalculations?: boolean }).excludeFromCalculations)
    .filter(e => dateFilter(safeDate(e.expenseDate)))
    .filter(e => !catFilterId || e.categoryId === catFilterId);

  const activeIncomes = incomes
    .filter(i => !i.excludeFromCalculations)
    .filter(i => dateFilter(safeDate(i.receiveDate)));

  // ── Detect intent ────────────────────────────────────────────────────────
  const wantsCat     = q.includes('categoria') || q.includes('distribuicao') || q.includes('divisao') || q.includes('por tipo');
  const wantsEvolve  = q.includes('evolucao') || q.includes('historico') || q.includes('mes a mes') || q.includes('mensal') || q.includes('ao longo') || q.includes('meses');
  const wantsBalance = q.includes('balanco') || q.includes('balanc') || q.includes('vs') || (q.includes('receita') && q.includes('despesa'));
  const wantsIncome  = (q.includes('receita') || q.includes('ganho') || q.includes('salario')) && !wantsBalance;
  const wantsExpense = (q.includes('despesa') || q.includes('gasto') || q.includes('custo')) && !wantsBalance;

  // ── Route to the appropriate report builder ──────────────────────────────

  // 1. Balance: income vs expense by month (bar chart)
  if (wantsBalance || (!wantsCat && !wantsEvolve && !wantsIncome && !wantsExpense && !catFilterId)) {
    return buildBalanceReport(activeExpenses, activeIncomes, periodLabel, curYear, curMonth, q);
  }

  // 2. Evolution: monthly total over time (line chart)
  if (wantsEvolve) {
    return buildEvolutionReport(
      wantsIncome ? [] : activeExpenses,
      wantsExpense ? [] : activeIncomes,
      periodLabel, curYear, categories,
    );
  }

  // 3. By category: pie chart
  if (wantsCat) {
    if (wantsIncome) {
      return buildByCategoryReport(activeIncomes.map(i => ({
        amount: i.amount,
        catId: i.categoryId,
        label: i.title,
        date: safeDate(i.receiveDate),
      })), incomeCategories.map(c => ({ id: c.id, name: c.name })), 'Receitas', periodLabel);
    }
    return buildByCategoryReport(activeExpenses.map(e => ({
      amount: e.amount,
      catId: e.categoryId,
      label: e.description,
      date: safeDate(e.expenseDate),
    })), categories.map(c => ({ id: c.id, name: c.name })), 'Despesas', periodLabel);
  }

  // 4. Income list
  if (wantsIncome) {
    return buildIncomeListReport(activeIncomes, incomeCategories, periodLabel, catFilterName);
  }

  // 5. Expense list (default)
  return buildExpenseListReport(activeExpenses, categories, subcategories, periodLabel, catFilterName);
}

// ── Sub-builders ─────────────────────────────────────────────────────────────

function buildBalanceReport(
  expenses: Expense[],
  incomes: Income[],
  periodLabel: string,
  curYear: number,
  curMonth: number,
  q: string,
): AIReport {
  const isYearly = q.includes('ano') || q.includes('anual');

  const totalInc  = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExp  = expenses.reduce((s, e) => s + e.amount, 0);
  const balance   = totalInc - totalExp;

  // Group by month
  const monthMap: Record<string, { Receitas: number; Despesas: number }> = {};

  const addToMap = (dateRaw: unknown, amount: number, key: 'Receitas' | 'Despesas') => {
    const d = safeDate(dateRaw);
    const k = isYearly
      ? format(d, 'MMM', { locale: ptBR }).replace('.', '')
      : format(d, 'dd/MM');
    if (!monthMap[k]) monthMap[k] = { Receitas: 0, Despesas: 0 };
    monthMap[k][key] += amount;
  };

  incomes.forEach(i  => addToMap(i.receiveDate, i.amount, 'Receitas'));
  expenses.forEach(e => addToMap(e.expenseDate, e.amount, 'Despesas'));

  const chartData = Object.entries(monthMap)
    .map(([name, v]) => ({ name, ...v }))
    .slice(0, 18);

  return {
    valid: true, isEmpty: chartData.length === 0,
    emptyMessage: 'Nenhuma transação encontrada para o período.',
    title: 'Balanço: Receitas vs Despesas',
    subtitle: periodLabel,
    kpis: [
      { label: 'Total Receitas',  value: fmtMoney(totalInc),  color: 'green' },
      { label: 'Total Despesas',  value: fmtMoney(totalExp),  color: 'red' },
      { label: 'Saldo Líquido',   value: fmtMoney(balance),   color: balance >= 0 ? 'blue' : 'amber' },
      { label: 'Transações',      value: String(expenses.length + incomes.length), color: 'purple' },
    ],
    chartType: 'bar',
    chartTitle: `Receitas vs Despesas — ${periodLabel}`,
    chartData,
    chartConfig: {
      xKey: 'name',
      bars: [
        { key: 'Receitas', color: '#10b981', label: 'Receitas' },
        { key: 'Despesas', color: '#ef4444', label: 'Despesas' },
      ],
    },
    tableColumns: [
      { key: 'tipo',      label: 'Tipo' },
      { key: 'descricao', label: 'Descrição' },
      { key: 'data',      label: 'Data' },
      { key: 'valor',     label: 'Valor', align: 'right' },
    ],
    tableRows: [
      ...incomes.map(i => ({
        tipo: 'Receita', descricao: i.title,
        data: fmtDate(i.receiveDate), valor: fmtMoney(i.amount),
      })),
      ...expenses.map(e => ({
        tipo: 'Despesa', descricao: e.description,
        data: fmtDate(e.expenseDate), valor: fmtMoney(e.amount),
      })),
    ].sort((a, b) => b.data.localeCompare(a.data)),
  };
}

function buildByCategoryReport(
  items: Array<{ amount: number; catId: string; label: string; date: Date }>,
  cats: Array<{ id: string; name: string }>,
  typeLabel: string,
  periodLabel: string,
): AIReport {
  const totals: Record<string, number> = {};
  items.forEach(({ amount, catId }) => {
    const name = cats.find(c => c.id === catId)?.name ?? 'Sem categoria';
    totals[name] = (totals[name] ?? 0) + amount;
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const grandTotal = sorted.reduce((s, [, v]) => s + v, 0);
  const chartData = sorted.map(([name, value]) => ({ name, value }));

  return {
    valid: true, isEmpty: chartData.length === 0,
    emptyMessage: 'Nenhuma transação encontrada para o período.',
    title: `${typeLabel} por Categoria`,
    subtitle: periodLabel,
    kpis: [
      { label: `Total ${typeLabel}`, value: fmtMoney(grandTotal), color: typeLabel === 'Receitas' ? 'green' : 'red' },
      { label: 'Maior Categoria',   value: sorted[0]?.[0] ?? '-',  color: 'blue' },
      { label: 'Nº de Categorias',  value: String(sorted.length),  color: 'purple' },
      { label: 'Nº de Transações',  value: String(items.length),   color: 'amber' },
    ],
    chartType: 'pie',
    chartTitle: `Distribuição de ${typeLabel} por Categoria — ${periodLabel}`,
    chartData,
    chartConfig: { nameKey: 'name', valueKey: 'value' },
    tableColumns: [
      { key: 'categoria', label: 'Categoria' },
      { key: 'total',     label: 'Total',       align: 'right' },
      { key: 'percent',   label: '% do Total',  align: 'right' },
    ],
    tableRows: sorted.map(([name, val]) => ({
      categoria: name,
      total:    fmtMoney(val),
      percent:  `${((val / grandTotal) * 100).toFixed(1)}%`,
    })),
  };
}

function buildEvolutionReport(
  expenses: Expense[],
  incomes: Income[],
  periodLabel: string,
  curYear: number,
  categories: Category[],
): AIReport {
  // Build month-by-month totals for the displayed period
  const monthMap: Record<string, { Despesas: number; Receitas: number }> = {};

  expenses.forEach(e => {
    const k = format(safeDate(e.expenseDate), 'MMM/yy', { locale: ptBR });
    if (!monthMap[k]) monthMap[k] = { Despesas: 0, Receitas: 0 };
    monthMap[k].Despesas += e.amount;
  });
  incomes.forEach(i => {
    const k = format(safeDate(i.receiveDate), 'MMM/yy', { locale: ptBR });
    if (!monthMap[k]) monthMap[k] = { Despesas: 0, Receitas: 0 };
    monthMap[k].Receitas += i.amount;
  });

  const chartData = Object.entries(monthMap)
    .map(([name, v]) => ({ name, ...v }))
    .slice(0, 18);

  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const totalInc = incomes.reduce((s, i) => s + i.amount, 0);
  const monthCount = chartData.length || 1;
  const hasIncome = incomes.length > 0;

  const lines: Array<{ key: string; color: string; label: string }> = [
    { key: 'Despesas', color: '#ef4444', label: 'Despesas' },
  ];
  if (hasIncome) lines.push({ key: 'Receitas', color: '#10b981', label: 'Receitas' });

  return {
    valid: true, isEmpty: chartData.length === 0,
    emptyMessage: 'Nenhuma transação encontrada para o período.',
    title: 'Evolução Mensal',
    subtitle: periodLabel,
    kpis: [
      { label: 'Total Despesas',   value: fmtMoney(totalExp), color: 'red' },
      { label: 'Média Mensal',     value: fmtMoney(totalExp / monthCount), color: 'amber' },
      ...(hasIncome ? [{ label: 'Total Receitas', value: fmtMoney(totalInc), color: 'green' as const }] : []),
      { label: 'Meses no período', value: String(monthCount), color: 'blue' },
    ],
    chartType: 'line',
    chartTitle: `Evolução Mensal — ${periodLabel}`,
    chartData,
    chartConfig: { xKey: 'name', lines },
    tableColumns: [
      { key: 'mes',      label: 'Mês' },
      { key: 'despesas', label: 'Despesas', align: 'right' },
      ...(hasIncome ? [{ key: 'receitas', label: 'Receitas', align: 'right' as const }] : []),
      { key: 'saldo',    label: 'Saldo',    align: 'right' },
    ],
    tableRows: chartData.map(row => ({
      mes:      String(row.name),
      despesas: fmtMoney(Number(row.Despesas ?? 0)),
      receitas: fmtMoney(Number(row.Receitas ?? 0)),
      saldo:    fmtMoney(Number(row.Receitas ?? 0) - Number(row.Despesas ?? 0)),
    })),
  };
}

function buildExpenseListReport(
  expenses: Expense[],
  categories: Category[],
  subcategories: Subcategory[],
  periodLabel: string,
  catFilter: string | null,
): AIReport {
  const sorted = [...expenses].sort(
    (a, b) => safeDate(b.expenseDate).getTime() - safeDate(a.expenseDate).getTime()
  );
  const total = sorted.reduce((s, e) => s + e.amount, 0);
  const avg   = sorted.length ? total / sorted.length : 0;

  return {
    valid: true, isEmpty: sorted.length === 0,
    emptyMessage: `Nenhuma despesa encontrada${catFilter ? ` em "${catFilter}"` : ''} para o período.`,
    title: catFilter ? `Despesas: ${catFilter}` : 'Detalhamento de Despesas',
    subtitle: periodLabel,
    kpis: [
      { label: 'Total Gasto',    value: fmtMoney(total),       color: 'red'   },
      { label: 'Nº Despesas',    value: String(sorted.length), color: 'blue'  },
      { label: 'Média por item', value: fmtMoney(avg),         color: 'amber' },
      { label: 'Maior Despesa',  value: fmtMoney(Math.max(...sorted.map(e => e.amount), 0)), color: 'purple' },
    ],
    chartType: 'pie',
    chartTitle: `Distribuição por Categoria${catFilter ? ` — ${catFilter}` : ''}`,
    chartData: (() => {
      const map: Record<string, number> = {};
      sorted.forEach(e => {
        const name = categories.find(c => c.id === e.categoryId)?.name ?? 'Sem categoria';
        map[name] = (map[name] ?? 0) + e.amount;
      });
      return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
    })(),
    chartConfig: { nameKey: 'name', valueKey: 'value' },
    tableColumns: [
      { key: 'data',      label: 'Data' },
      { key: 'descricao', label: 'Descrição' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'pagamento', label: 'Pagamento' },
      { key: 'valor',     label: 'Valor', align: 'right' },
      { key: 'status',    label: 'Status' },
    ],
    tableRows: sorted.map(e => ({
      data:      fmtDate(e.expenseDate),
      descricao: e.description,
      categoria: categories.find(c => c.id === e.categoryId)?.name ?? '—',
      pagamento: PAYMENT_METHOD_LABELS[e.paymentMethod] ?? e.paymentMethod,
      valor:     fmtMoney(e.amount),
      status:    e.isPaid ? 'Pago' : 'Pendente',
    })),
  };
}

function buildIncomeListReport(
  incomes: Income[],
  incomeCategories: IncomeCategory[],
  periodLabel: string,
  catFilter: string | null,
): AIReport {
  const sorted = [...incomes].sort(
    (a, b) => safeDate(b.receiveDate).getTime() - safeDate(a.receiveDate).getTime()
  );
  const total = sorted.reduce((s, i) => s + i.amount, 0);

  return {
    valid: true, isEmpty: sorted.length === 0,
    emptyMessage: `Nenhuma receita encontrada para o período.`,
    title: 'Detalhamento de Receitas',
    subtitle: periodLabel,
    kpis: [
      { label: 'Total Recebido', value: fmtMoney(total),       color: 'green'  },
      { label: 'Nº Receitas',    value: String(sorted.length), color: 'blue'   },
      { label: 'Maior Receita',  value: fmtMoney(Math.max(...sorted.map(i => i.amount), 0)), color: 'purple' },
    ],
    chartType: 'pie',
    chartTitle: 'Distribuição por Categoria de Receita',
    chartData: (() => {
      const map: Record<string, number> = {};
      sorted.forEach(i => {
        const name = incomeCategories.find(c => c.id === i.categoryId)?.name ?? 'Sem categoria';
        map[name] = (map[name] ?? 0) + i.amount;
      });
      return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
    })(),
    chartConfig: { nameKey: 'name', valueKey: 'value' },
    tableColumns: [
      { key: 'data',      label: 'Data' },
      { key: 'titulo',    label: 'Título' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'valor',     label: 'Valor', align: 'right' },
      { key: 'status',    label: 'Status' },
    ],
    tableRows: sorted.map(i => ({
      data:      fmtDate(i.receiveDate),
      titulo:    i.title,
      categoria: incomeCategories.find(c => c.id === i.categoryId)?.name ?? '—',
      valor:     fmtMoney(i.amount),
      status:    i.isReceived ? 'Recebido' : 'Pendente',
    })),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AIReportGenerator() {
  const [prompt, setPrompt]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport]       = useState<AIReport | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { expenses, categories, subcategories } = useFinance();
  const { incomes, incomeCategories }           = useIncome();

  const generate = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setIsLoading(true);
      setReport(null);
      setCurrentPage(1);

      // Simulate brief processing so the skeleton appears
      setTimeout(() => {
        try {
          const result = buildReport(
            trimmed, expenses, incomes, categories, subcategories, incomeCategories,
          );
          setReport(result);
        } finally {
          setIsLoading(false);
        }
      }, 600);
    },
    [isLoading, expenses, incomes, categories, subcategories, incomeCategories],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(prompt); }
  };

  // Pagination
  const totalPages   = Math.ceil((report?.tableRows.length ?? 0) / ITEMS_PER_PAGE);
  const paginatedRows = report?.tableRows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  ) ?? [];

  const kpiCols = (n: number) =>
    n === 2 ? 'sm:grid-cols-2' : n === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="space-y-6">
      {/* ── Input ───────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar Relatório com IA
          </CardTitle>
          <CardDescription>
            Descreva em linguagem natural o relatório que você precisa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Mostre um resumo das minhas receitas versus despesas deste mês agrupado por categoria..."
            className="min-h-[96px] resize-none"
            disabled={isLoading}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
            <Button
              onClick={() => generate(prompt)}
              disabled={!prompt.trim() || isLoading}
              className="gradient-primary shrink-0"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Sparkles className="w-4 h-4 mr-2" />}
              {isLoading ? 'Gerando…' : 'Gerar Relatório'}
            </Button>
            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map(s => (
                <Badge
                  key={s.text}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors text-xs py-1"
                  onClick={() => { setPrompt(s.text); generate(s.text); }}
                >
                  {s.emoji} {s.text}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Skeleton ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              Analisando suas finanças e estruturando os dados…
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-72 rounded-xl" />
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Output ───────────────────────────────────────────────────────── */}
      {report && !isLoading && (
        <>
          {/* Invalid prompt */}
          {!report.valid && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-amber-800 text-sm">{report.invalidMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* Empty */}
          {report.valid && report.isEmpty && (
            <Card>
              <CardContent className="py-20 flex flex-col items-center gap-4 text-center">
                <PieChartIcon className="w-16 h-16 text-muted-foreground/25" />
                <div>
                  <h3 className="font-semibold text-lg">Nenhum dado encontrado</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                    {report.emptyMessage ?? 'Não há registros para os critérios solicitados.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full report */}
          {report.valid && !report.isEmpty && (
            <div className="space-y-6 animate-in fade-in-50">
              <div>
                <h2 className="text-xl font-bold">{report.title}</h2>
                {report.subtitle && <p className="text-muted-foreground text-sm mt-1">{report.subtitle}</p>}
              </div>

              {/* KPIs */}
              {report.kpis.length > 0 && (
                <div className={`grid grid-cols-1 gap-4 ${kpiCols(report.kpis.length)}`}>
                  {report.kpis.map((kpi, i) => (
                    <Card key={i} className={`border ${KPI_STYLES[kpi.color] ?? KPI_STYLES.blue}`}>
                      <CardContent className="pt-5 pb-4">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{kpi.label}</p>
                        <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                        {kpi.subtext && <p className="text-xs mt-1 opacity-60">{kpi.subtext}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Chart */}
              {report.chartType !== 'none' && report.chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">{report.chartTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      {report.chartType === 'pie' ? (
                        <PieChart>
                          <Pie
                            data={report.chartData}
                            dataKey={report.chartConfig.valueKey ?? 'value'}
                            nameKey={report.chartConfig.nameKey ?? 'name'}
                            cx="50%" cy="50%" outerRadius={110}
                            label={({ name, percent }) =>
                              `${String(name).length > 14 ? String(name).slice(0,13)+'…' : name} ${(percent*100).toFixed(0)}%`}
                            labelLine
                          >
                            {report.chartData.map((_, idx) => (
                              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => fmtMoney(Number(v))} />
                          <Legend />
                        </PieChart>
                      ) : report.chartType === 'bar' ? (
                        <BarChart data={report.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={report.chartConfig.xKey ?? 'name'} fontSize={12} stroke="#888" tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} stroke="#888" tickLine={false} axisLine={false} tickFormatter={v => `R$${(Number(v)/1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ backgroundColor:'hsl(var(--background))', border:'1px solid hsl(var(--border))' }} formatter={(v) => fmtMoney(Number(v))} />
                          <Legend />
                          {(report.chartConfig.bars ?? []).map(bar => (
                            <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={bar.color} radius={[4,4,0,0]} />
                          ))}
                        </BarChart>
                      ) : (
                        <LineChart data={report.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={report.chartConfig.xKey ?? 'name'} fontSize={12} stroke="#888" tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} stroke="#888" tickLine={false} axisLine={false} tickFormatter={v => `R$${(Number(v)/1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ backgroundColor:'hsl(var(--background))', border:'1px solid hsl(var(--border))' }} formatter={(v) => fmtMoney(Number(v))} />
                          <Legend />
                          {(report.chartConfig.lines ?? []).map(line => (
                            <Line key={line.key} type="monotone" dataKey={line.key} name={line.label}
                              stroke={line.color} strokeWidth={2} dot={{ r:4 }} activeDot={{ r:6 }} />
                          ))}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Table */}
              {report.tableColumns.length > 0 && report.tableRows.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">
                      Detalhamento ({report.tableRows.length} {report.tableRows.length === 1 ? 'registro' : 'registros'})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {report.tableColumns.map(col => (
                              <TableHead key={col.key} className={col.align === 'right' ? 'text-right' : ''}>
                                {col.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRows.map((row, i) => (
                            <TableRow key={i}>
                              {report.tableColumns.map(col => (
                                <TableCell key={col.key}
                                  className={col.align === 'right' ? 'text-right font-medium tabular-nums' : ''}>
                                  {row[col.key] ?? '—'}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                            disabled={currentPage === 1}>
                            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                          </Button>
                          <Button variant="outline" size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                            disabled={currentPage === totalPages}>
                            Próximo <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
