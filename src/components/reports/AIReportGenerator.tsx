import { useState, useMemo, useRef, useCallback } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
import { format } from 'date-fns';
import { PAYMENT_METHOD_LABELS } from '@/types/finance';

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
  invalidMessage?: string | null;
  title: string;
  subtitle?: string | null;
  kpis: KPI[];
  chartType: 'pie' | 'bar' | 'line' | 'none';
  chartTitle: string;
  chartData: Array<Record<string, number | string>>;
  chartConfig: ChartConfig;
  tableColumns: Array<{ key: string; label: string; align?: 'left' | 'right' }>;
  tableRows: Array<Record<string, string>>;
  isEmpty: boolean;
  emptyMessage?: string | null;
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
  red: 'border-red-200 bg-red-50 text-red-800',
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  purple: 'border-purple-200 bg-purple-50 text-purple-800',
};

const ITEMS_PER_PAGE = 10;

// ─── Component ────────────────────────────────────────────────────────────────

export function AIReportGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<AIReport | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { expenses, categories, subcategories, accounts, cards } = useFinance();
  const { incomes, incomeCategories } = useIncome();

  // Build serialisable snapshot of the user's financial data to send to AI
  const financialData = useMemo(() => {
    const safeDate = (d: unknown): string => {
      try {
        const dt = d instanceof Date ? d : new Date(d as string);
        return isNaN(dt.getTime()) ? '' : format(dt, 'yyyy-MM-dd');
      } catch {
        return '';
      }
    };

    return {
      today: format(new Date(), 'yyyy-MM-dd'),
      expenses: expenses
        .filter((e) => !(e as { excludeFromCalculations?: boolean }).excludeFromCalculations)
        .slice(0, 600) // cap to avoid oversized payloads
        .map((e) => ({
          date: safeDate(e.expenseDate),
          dueDate: safeDate(e.dueDate),
          description: e.description,
          amount: e.amount,
          category: categories.find((c) => c.id === e.categoryId)?.name ?? 'Sem categoria',
          subcategory: e.subcategoryId
            ? (subcategories.find((s) => s.id === e.subcategoryId)?.name ?? '')
            : '',
          paymentMethod: PAYMENT_METHOD_LABELS[e.paymentMethod] ?? e.paymentMethod,
          isPaid: e.isPaid,
          account: e.accountId
            ? (accounts.find((a) => a.id === e.accountId)?.bankName ?? '')
            : '',
          card: e.cardId
            ? (cards.find((c) => c.id === e.cardId)?.brand ?? '')
            : '',
        })),
      incomes: incomes
        .filter((i) => !i.excludeFromCalculations)
        .slice(0, 300)
        .map((i) => ({
          date: safeDate(i.receiveDate),
          title: i.title,
          amount: i.amount,
          category:
            incomeCategories.find((c) => c.id === i.categoryId)?.name ?? 'Sem categoria',
          isReceived: i.isReceived,
          account: i.accountId
            ? (accounts.find((a) => a.id === i.accountId)?.bankName ?? '')
            : '',
        })),
      accounts: accounts.map((a) => ({
        name: a.bankName,
        agency: a.agency,
      })),
      cards: cards.map((c) => ({
        brand: c.brand,
        lastFour: c.lastFourDigits,
      })),
      categories: categories.map((c) => c.name),
      incomeCategories: incomeCategories.map((c) => c.name),
    };
  }, [expenses, incomes, categories, subcategories, incomeCategories, accounts, cards]);

  const generateReport = useCallback(
    async (promptText: string) => {
      const trimmed = promptText.trim();
      if (!trimmed || isLoading) return;

      setIsLoading(true);
      setReport(null);
      setCurrentPage(1);

      try {
        const { data, error } = await supabase.functions.invoke('generate-ai-report', {
          body: { prompt: trimmed, financialData },
        });

        if (error) throw new Error(error.message ?? 'Erro ao chamar a IA');
        if (!data) throw new Error('Resposta vazia da IA');

        setReport(data as AIReport);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao gerar relatório');
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, financialData]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateReport(prompt);
    }
  };

  const handleSuggestion = (text: string) => {
    setPrompt(text);
    generateReport(text);
  };

  // Pagination
  const totalPages = Math.ceil((report?.tableRows.length ?? 0) / ITEMS_PER_PAGE);
  const paginatedRows =
    report?.tableRows.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    ) ?? [];

  // KPI grid cols
  const kpiGridCols = (count: number) => {
    if (count === 2) return 'sm:grid-cols-2';
    if (count === 3) return 'sm:grid-cols-3';
    return 'sm:grid-cols-2 lg:grid-cols-4';
  };

  return (
    <div className="space-y-6">
      {/* ── Input Bar ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar Relatório com IA
          </CardTitle>
          <CardDescription>
            Descreva em linguagem natural o relatório que você precisa e a IA irá gerá-lo
            automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Mostre um resumo das minhas receitas versus despesas deste mês agrupado por categoria..."
            className="min-h-[96px] resize-none"
            disabled={isLoading}
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
            <Button
              onClick={() => generateReport(prompt)}
              disabled={!prompt.trim() || isLoading}
              className="gradient-primary shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Gerando…' : 'Gerar Relatório'}
            </Button>

            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((s) => (
                <Badge
                  key={s.text}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors text-xs py-1"
                  onClick={() => handleSuggestion(s.text)}
                >
                  {s.emoji} {s.text}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Loading Skeleton ───────────────────────────────────────────── */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              Analisando suas finanças e estruturando os dados…
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-72 rounded-xl" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Report Output ──────────────────────────────────────────────── */}
      {report && !isLoading && (
        <>
          {/* Invalid prompt */}
          {!report.valid && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-amber-800 text-sm">
                  {report.invalidMessage ??
                    'Desculpe, eu só consigo gerar relatórios baseados no seu histórico financeiro do MoneyGuia. Tente perguntar sobre seus gastos ou receitas!'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {report.valid && report.isEmpty && (
            <Card>
              <CardContent className="py-20 flex flex-col items-center gap-4 text-center">
                <PieChartIcon className="w-16 h-16 text-muted-foreground/25" />
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    Nenhum dado encontrado
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                    {report.emptyMessage ??
                      'Não há registros correspondentes para os critérios solicitados. Tente ajustar o período ou categoria.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full report */}
          {report.valid && !report.isEmpty && (
            <div className="space-y-6 animate-in fade-in-50">
              {/* Title */}
              <div>
                <h2 className="text-xl font-bold text-foreground">{report.title}</h2>
                {report.subtitle && (
                  <p className="text-muted-foreground text-sm mt-1">{report.subtitle}</p>
                )}
              </div>

              {/* KPI Cards */}
              {report.kpis?.length > 0 && (
                <div
                  className={`grid grid-cols-1 gap-4 ${kpiGridCols(report.kpis.length)}`}
                >
                  {report.kpis.map((kpi, i) => (
                    <Card
                      key={i}
                      className={`border ${KPI_STYLES[kpi.color] ?? KPI_STYLES.blue}`}
                    >
                      <CardContent className="pt-5 pb-4">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                          {kpi.label}
                        </p>
                        <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                        {kpi.subtext && (
                          <p className="text-xs mt-1 opacity-60">{kpi.subtext}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Chart */}
              {report.chartType !== 'none' &&
                report.chartData?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">
                        {report.chartTitle}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={320}>
                        {report.chartType === 'pie' ? (
                          <PieChart>
                            <Pie
                              data={report.chartData}
                              dataKey={report.chartConfig.valueKey ?? 'value'}
                              nameKey={report.chartConfig.nameKey ?? 'name'}
                              cx="50%"
                              cy="50%"
                              outerRadius={110}
                              label={({ name, percent }) =>
                                `${String(name).length > 14 ? String(name).slice(0, 13) + '…' : name} ${(percent * 100).toFixed(0)}%`
                              }
                              labelLine
                            >
                              {report.chartData.map((_, idx) => (
                                <Cell
                                  key={idx}
                                  fill={PIE_COLORS[idx % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v) =>
                                `R$ ${Number(v).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`
                              }
                            />
                            <Legend />
                          </PieChart>
                        ) : report.chartType === 'bar' ? (
                          <BarChart data={report.chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey={report.chartConfig.xKey ?? 'name'}
                              fontSize={12}
                              stroke="#888888"
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              fontSize={12}
                              stroke="#888888"
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) =>
                                `R$${(Number(v) / 1000).toFixed(0)}k`
                              }
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                              }}
                              formatter={(v) =>
                                `R$ ${Number(v).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`
                              }
                            />
                            <Legend />
                            {(report.chartConfig.bars ?? []).map((bar) => (
                              <Bar
                                key={bar.key}
                                dataKey={bar.key}
                                name={bar.label}
                                fill={bar.color}
                                radius={[4, 4, 0, 0]}
                              />
                            ))}
                          </BarChart>
                        ) : (
                          <LineChart data={report.chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey={report.chartConfig.xKey ?? 'name'}
                              fontSize={12}
                              stroke="#888888"
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              fontSize={12}
                              stroke="#888888"
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) =>
                                `R$${(Number(v) / 1000).toFixed(0)}k`
                              }
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                              }}
                              formatter={(v) =>
                                `R$ ${Number(v).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`
                              }
                            />
                            <Legend />
                            {(report.chartConfig.lines ?? []).map((line) => (
                              <Line
                                key={line.key}
                                type="monotone"
                                dataKey={line.key}
                                name={line.label}
                                stroke={line.color}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            ))}
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

              {/* Data Table */}
              {report.tableColumns?.length > 0 && report.tableRows?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">
                      Detalhamento ({report.tableRows.length}{' '}
                      {report.tableRows.length === 1 ? 'registro' : 'registros'})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {report.tableColumns.map((col) => (
                              <TableHead
                                key={col.key}
                                className={col.align === 'right' ? 'text-right' : ''}
                              >
                                {col.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRows.map((row, i) => (
                            <TableRow key={i}>
                              {report.tableColumns.map((col) => (
                                <TableCell
                                  key={col.key}
                                  className={
                                    col.align === 'right' ? 'text-right font-medium tabular-nums' : ''
                                  }
                                >
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
                        <p className="text-sm text-muted-foreground">
                          Página {currentPage} de {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={currentPage === totalPages}
                          >
                            Próximo
                            <ChevronRight className="w-4 h-4 ml-1" />
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
