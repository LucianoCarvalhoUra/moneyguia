import {
  Heading, Type, Minus, Square, LayoutDashboard,
  BarChart2, PieChart, TrendingUp, Table2, CreditCard,
} from 'lucide-react';
import type { ElementType, LayoutItem } from './types';

// ─── Available data fields per source ────────────────────────────────────────

export const DATA_FIELDS = {
  expenses: [
    { key: 'amount',        label: 'Valor (R$)',       type: 'number', groupable: false },
    { key: 'description',   label: 'Descrição',        type: 'string', groupable: false },
    { key: 'expenseDate',   label: 'Data da Despesa',  type: 'date',   groupable: false },
    { key: 'categoryId',    label: 'Categoria',        type: 'string', groupable: true  },
    { key: 'paymentMethod', label: 'Forma de Pag.',    type: 'string', groupable: true  },
    { key: 'isPaid',        label: 'Status (Pago)',    type: 'boolean',groupable: true  },
    { key: 'month',         label: 'Mês (agrupador)',  type: 'derived',groupable: true  },
  ],
  incomes: [
    { key: 'amount',      label: 'Valor (R$)',      type: 'number', groupable: false },
    { key: 'title',       label: 'Descrição',       type: 'string', groupable: false },
    { key: 'receiveDate', label: 'Data de Receb.',  type: 'date',   groupable: false },
    { key: 'categoryId',  label: 'Categoria',       type: 'string', groupable: true  },
    { key: 'isReceived',  label: 'Recebido',        type: 'boolean',groupable: true  },
    { key: 'month',       label: 'Mês (agrupador)', type: 'derived',groupable: true  },
  ],
} as const;

export type FieldDef = typeof DATA_FIELDS.expenses[number] | typeof DATA_FIELDS.incomes[number];

// ─── Palette component registry ───────────────────────────────────────────────

export interface PaletteItem {
  type: ElementType;
  label: string;
  description: string;
  icon: React.ElementType;
  category: 'layout' | 'text' | 'chart' | 'data';
  defaultLayout: Omit<LayoutItem, 'i'>;
  defaultConfig: Record<string, unknown>;
  needsDataConfig: boolean;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  // ── Layout
  {
    type: 'separator',
    label: 'Divisória',
    description: 'Linha horizontal separadora',
    icon: Minus,
    category: 'layout',
    defaultLayout: { x: 0, y: 0, w: 12, h: 1, minW: 2, minH: 1 },
    defaultConfig: { color: '#e2e8f0' },
    needsDataConfig: false,
  },
  {
    type: 'box',
    label: 'Caixa',
    description: 'Contêiner de layout livre',
    icon: Square,
    category: 'layout',
    defaultLayout: { x: 0, y: 0, w: 6, h: 4, minW: 2, minH: 2 },
    defaultConfig: { bgColor: '#f8fafc', padding: 'md' },
    needsDataConfig: false,
  },
  {
    type: 'group-card',
    label: 'Group Card',
    description: 'Card agrupador com título',
    icon: LayoutDashboard,
    category: 'layout',
    defaultLayout: { x: 0, y: 0, w: 6, h: 5, minW: 3, minH: 3 },
    defaultConfig: { text: 'Grupo', bgColor: '#ffffff', padding: 'md' },
    needsDataConfig: false,
  },

  // ── Text
  {
    type: 'heading',
    label: 'Título',
    description: 'Texto de destaque como cabeçalho',
    icon: Heading,
    category: 'text',
    defaultLayout: { x: 0, y: 0, w: 8, h: 2, minW: 2, minH: 1 },
    defaultConfig: { text: 'Novo Título', fontSize: '2xl', fontWeight: 'bold', color: '#1e293b', align: 'left' },
    needsDataConfig: false,
  },
  {
    type: 'paragraph',
    label: 'Texto',
    description: 'Parágrafo de texto livre',
    icon: Type,
    category: 'text',
    defaultLayout: { x: 0, y: 0, w: 8, h: 2, minW: 2, minH: 1 },
    defaultConfig: { text: 'Insira seu texto aqui...', fontSize: 'base', fontWeight: 'normal', color: '#475569', align: 'left' },
    needsDataConfig: false,
  },

  // ── Charts
  {
    type: 'pie-chart',
    label: 'Gráfico Pizza',
    description: 'Distribuição em fatias (Donut)',
    icon: PieChart,
    category: 'chart',
    defaultLayout: { x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 6 },
    defaultConfig: { dataSource: 'expenses', groupBy: 'categoryId', aggregation: 'sum', yField: 'amount', showLegend: true },
    needsDataConfig: true,
  },
  {
    type: 'bar-chart',
    label: 'Gráfico Barras',
    description: 'Comparativo em barras verticais',
    icon: BarChart2,
    category: 'chart',
    defaultLayout: { x: 0, y: 0, w: 8, h: 8, minW: 4, minH: 6 },
    defaultConfig: { dataSource: 'expenses', groupBy: 'month', aggregation: 'sum', yField: 'amount', showLegend: false, showGrid: true },
    needsDataConfig: true,
  },
  {
    type: 'line-chart',
    label: 'Gráfico Linhas',
    description: 'Evolução ao longo do tempo',
    icon: TrendingUp,
    category: 'chart',
    defaultLayout: { x: 0, y: 0, w: 8, h: 8, minW: 4, minH: 6 },
    defaultConfig: { dataSource: 'expenses', groupBy: 'month', aggregation: 'sum', yField: 'amount', showLegend: true, showGrid: true },
    needsDataConfig: true,
  },

  // ── Data
  {
    type: 'kpi',
    label: 'Card KPI',
    description: 'Resumo numérico com destaque',
    icon: CreditCard,
    category: 'data',
    defaultLayout: { x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
    defaultConfig: { label: 'Total Despesas', dataSource: 'expenses', field: 'amount', aggregation: 'sum', prefix: 'R$', colorScheme: 'default' },
    needsDataConfig: true,
  },
  {
    type: 'data-table',
    label: 'Tabela de Dados',
    description: 'Listagem tabular com filtros',
    icon: Table2,
    category: 'data',
    defaultLayout: { x: 0, y: 0, w: 12, h: 10, minW: 6, minH: 6 },
    defaultConfig: { dataSource: 'expenses', columns: ['expenseDate', 'description', 'amount', 'categoryId', 'paymentMethod'], limit: 20 },
    needsDataConfig: true,
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  layout: 'Layout',
  text:   'Texto',
  chart:  'Gráficos',
  data:   'Dados',
};

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  account:     'Conta Bancária',
  pix:         'PIX',
  credit_card: 'Cartão de Crédito',
};

export const AGGR_LABELS: Record<string, string> = {
  sum:   'Soma',
  count: 'Contagem',
  avg:   'Média',
  min:   'Mínimo',
  max:   'Máximo',
};

export const LS_TEMPLATES_KEY = 'moneyguia_report_templates';
