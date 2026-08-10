export type ElementType =
  | 'heading' | 'paragraph' | 'separator' | 'box' | 'group-card'
  | 'kpi' | 'pie-chart' | 'bar-chart' | 'line-chart' | 'data-table';

export type DataSource = 'expenses' | 'incomes';
export type Aggregation = 'sum' | 'count' | 'avg' | 'min' | 'max';
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
export type TextAlign = 'left' | 'center' | 'right';
export type ColorScheme = 'default' | 'green' | 'red' | 'blue' | 'purple' | 'amber';

export interface FilterConfig {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface ElementConfig {
  // ── Layout / Style
  text?: string;
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: string;
  align?: TextAlign;
  bgColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';

  // ── Data binding
  dataSource?: DataSource;
  xField?: string;
  yField?: string;
  groupBy?: string;
  aggregation?: Aggregation;
  limit?: number;
  filters?: FilterConfig[];
  sortDesc?: boolean;

  // ── KPI
  label?: string;
  field?: string;
  prefix?: string;
  suffix?: string;
  colorScheme?: ColorScheme;

  // ── Table
  columns?: string[];

  // ── Chart
  chartTitle?: string;
  showLegend?: boolean;
  showGrid?: boolean;
}

export interface ReportElement {
  id: string;
  type: ElementType;
  config: ElementConfig;
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  elements: ReportElement[];
  layouts: LayoutItem[];
  createdAt: string;
}
