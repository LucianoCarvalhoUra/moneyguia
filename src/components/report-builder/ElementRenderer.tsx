import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { ReportElement, ColorScheme } from './types';
import { useReportData, FIELD_LABELS } from './useReportData';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#64748b',
];

const fmtMoney = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const KPI_SCHEME: Record<ColorScheme, { bg: string; text: string; badge: string }> = {
  default: { bg: 'bg-card',          text: 'text-foreground', badge: 'bg-muted text-muted-foreground' },
  green:   { bg: 'bg-emerald-50',    text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  red:     { bg: 'bg-red-50',        text: 'text-red-700',     badge: 'bg-red-100 text-red-700' },
  blue:    { bg: 'bg-blue-50',       text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700' },
  purple:  { bg: 'bg-purple-50',     text: 'text-purple-700',  badge: 'bg-purple-100 text-purple-700' },
  amber:   { bg: 'bg-amber-50',      text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700' },
};

const PAD_MAP = { none: 'p-0', sm: 'p-2', md: 'p-4', lg: 'p-6' };
const FS_MAP: Record<string, string> = {
  xs: 'text-xs', sm: 'text-sm', base: 'text-base',
  lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl', '3xl': 'text-3xl',
};

// ─── Element Renderer ─────────────────────────────────────────────────────────

export function ElementRenderer({
  element,
  isPreview = false,
  isSelected = false,
}: {
  element: ReportElement;
  isPreview?: boolean;
  isSelected?: boolean;
}) {
  const { type, config } = element;
  const data = useReportData(element);

  const baseClass = isSelected && !isPreview
    ? 'ring-2 ring-primary ring-offset-1 rounded-md h-full'
    : 'h-full';

  // ── Heading ────────────────────────────────────────────────────────────────
  if (type === 'heading') {
    return (
      <div className={baseClass} style={{ backgroundColor: config.bgColor }}>
        <p
          className={[
            FS_MAP[config.fontSize ?? '2xl'] ?? 'text-2xl',
            `font-${config.fontWeight ?? 'bold'}`,
            `text-${config.align ?? 'left'}`,
            PAD_MAP[config.padding ?? 'sm'],
            'leading-tight',
          ].join(' ')}
          style={{ color: config.color ?? '#1e293b' }}
        >
          {config.text || 'Título'}
        </p>
      </div>
    );
  }

  // ── Paragraph ─────────────────────────────────────────────────────────────
  if (type === 'paragraph') {
    return (
      <div className={baseClass} style={{ backgroundColor: config.bgColor }}>
        <p
          className={[
            FS_MAP[config.fontSize ?? 'base'] ?? 'text-base',
            `font-${config.fontWeight ?? 'normal'}`,
            `text-${config.align ?? 'left'}`,
            PAD_MAP[config.padding ?? 'sm'],
          ].join(' ')}
          style={{ color: config.color ?? '#475569' }}
        >
          {config.text || 'Texto…'}
        </p>
      </div>
    );
  }

  // ── Separator ─────────────────────────────────────────────────────────────
  if (type === 'separator') {
    return (
      <div className={`${baseClass} flex items-center`}>
        <Separator style={{ borderColor: config.color }} />
      </div>
    );
  }

  // ── Box ───────────────────────────────────────────────────────────────────
  if (type === 'box') {
    return (
      <div
        className={`${baseClass} border border-dashed border-slate-200 rounded-md ${PAD_MAP[config.padding ?? 'md']}`}
        style={{ backgroundColor: config.bgColor ?? '#f8fafc' }}
      />
    );
  }

  // ── Group Card ────────────────────────────────────────────────────────────
  if (type === 'group-card') {
    return (
      <Card className={`${baseClass} overflow-hidden`} style={{ backgroundColor: config.bgColor }}>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-semibold">{config.text || 'Grupo'}</CardTitle>
        </CardHeader>
        <CardContent className="p-4" />
      </Card>
    );
  }

  // ── KPI Card ──────────────────────────────────────────────────────────────
  if (type === 'kpi') {
    const scheme = KPI_SCHEME[config.colorScheme ?? 'default'];
    const value = (data as { value?: number } | null)?.value ?? 0;
    const formatted = config.field === 'amount' || config.aggregation === 'sum' || config.aggregation === 'avg'
      ? (config.prefix === 'R$' ? fmtMoney(value) : `${config.prefix ?? ''}${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}${config.suffix ?? ''}`)
      : `${config.prefix ?? ''}${value}${config.suffix ?? ''}`;

    return (
      <div className={`${baseClass} ${scheme.bg} rounded-lg border border-border/50 flex flex-col justify-center p-4`}>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {config.label || 'KPI'}
        </p>
        <p className={`text-2xl font-bold mt-1 tabular-nums ${scheme.text}`}>
          {formatted}
        </p>
        {config.dataSource && (
          <p className="text-xs text-muted-foreground mt-1">
            {config.aggregation === 'count' ? `${value} registros` : config.dataSource === 'expenses' ? 'Despesas' : 'Receitas'}
          </p>
        )}
      </div>
    );
  }

  // ── Pie Chart ─────────────────────────────────────────────────────────────
  if (type === 'pie-chart') {
    const chartData = (data as { chartData?: { name: string; value: number }[] } | null)?.chartData ?? [];
    return (
      <Card className={`${baseClass} overflow-hidden`}>
        {config.chartTitle && (
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-sm">{config.chartTitle}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-2 h-full">
          {chartData.length === 0 ? (
            <EmptyChart label="Nenhum dado disponível" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius="35%" outerRadius="65%" paddingAngle={2}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [fmtMoney(v), '']}
                  contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                {config.showLegend && <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Bar Chart ─────────────────────────────────────────────────────────────
  if (type === 'bar-chart') {
    const chartData = (data as { chartData?: { name: string; value: number }[] } | null)?.chartData ?? [];
    return (
      <Card className={`${baseClass} overflow-hidden`}>
        {config.chartTitle && (
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-sm">{config.chartTitle}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-2 h-full">
          {chartData.length === 0 ? (
            <EmptyChart label="Nenhum dado disponível" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [fmtMoney(v), 'Valor']}
                  contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                {config.showLegend && <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
                <Bar dataKey="value" name="Valor" radius={[3, 3, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Line Chart ────────────────────────────────────────────────────────────
  if (type === 'line-chart') {
    const chartData = (data as { chartData?: { name: string; value: number }[] } | null)?.chartData ?? [];
    return (
      <Card className={`${baseClass} overflow-hidden`}>
        {config.chartTitle && (
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-sm">{config.chartTitle}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-2 h-full">
          {chartData.length === 0 ? (
            <EmptyChart label="Nenhum dado disponível" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [fmtMoney(v), 'Valor']}
                  contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                {config.showLegend && <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
                <Line type="monotone" dataKey="value" name="Valor"
                  stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Data Table ────────────────────────────────────────────────────────────
  if (type === 'data-table') {
    const tableData = data as { rows?: Record<string, unknown>[]; cols?: string[] } | null;
    const rows = tableData?.rows ?? [];
    const cols = tableData?.cols ?? config.columns ?? [];

    return (
      <Card className={`${baseClass} overflow-hidden`}>
        {config.chartTitle && (
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-sm">{config.chartTitle}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-0 h-full overflow-auto">
          {rows.length === 0 ? (
            <EmptyChart label="Nenhum dado disponível" />
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {cols.map(col => (
                    <th key={col} className="px-3 py-2 text-left font-semibold text-muted-foreground border-b">
                      {FIELD_LABELS[col] ?? col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/20'}>
                    {cols.map(col => (
                      <td key={col} className="px-3 py-1.5 border-b border-border/30 text-foreground">
                        {col === 'amount'
                          ? fmtMoney(Number(row[col] ?? 0))
                          : String(row[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    );
  }

  return <div className={`${baseClass} bg-muted/20 rounded flex items-center justify-center text-xs text-muted-foreground`}>Elemento</div>;
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
      {label}
    </div>
  );
}
export default ElementRenderer;
