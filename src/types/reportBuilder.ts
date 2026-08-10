export type ElementType =
  | 'box'
  | 'card'
  | 'separator'
  | 'heading'
  | 'text'
  | 'label'
  | 'table'
  | 'image'
  | 'watermark';

export interface TableRow {
  label: string;
  value: string;
}

export interface ElementStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  background: string;
  align: 'left' | 'center' | 'right';
  borderWidth: number;
  borderColor: string;
  radius: number;
  padding: number;
  italic?: boolean;
  opacity?: number;
}

export interface ReportElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  rows?: TableRow[];
  src?: string;
  style: ElementStyle;
}

export type PageSize = 'a4' | 'receipt';

export interface ReportTemplate {
  id: string;
  name: string;
  page_size: PageSize;
  layout_json: ReportElement[];
  category_id?: string | null;
  created_at?: string;
}

/** layout_json pode ser um array (legado) ou um objeto com metadados. */
export interface TemplateLayoutPayload {
  elements: ReportElement[];
  categoryId?: string | null;
}

export function parseLayout(raw: any): { elements: ReportElement[]; categoryId: string | null } {
  if (Array.isArray(raw)) return { elements: raw as ReportElement[], categoryId: null };
  if (raw && Array.isArray(raw.elements)) {
    return { elements: raw.elements as ReportElement[], categoryId: raw.categoryId ?? null };
  }
  return { elements: [], categoryId: null };
}


export const PAGE_SIZES: Record<PageSize, { label: string; width: number; height: number }> = {
  a4: { label: 'A4 (retrato)', width: 794, height: 1123 },
  receipt: { label: 'Recibo (meia folha)', width: 794, height: 560 },
};

export const DEFAULT_STYLE: ElementStyle = {
  fontSize: 14,
  fontWeight: 'normal',
  color: '#0f172a',
  background: 'transparent',
  align: 'left',
  borderWidth: 0,
  borderColor: '#cbd5e1',
  radius: 8,
  padding: 8,
  italic: false,
  opacity: 1,
};

export const PALETTE: {
  type: ElementType;
  label: string;
  group: 'Molduras' | 'Texto' | 'Tabelas' | 'Mídia';
  defaults: Partial<ReportElement>;
}[] = [
  {
    type: 'box',
    label: 'Caixa (Box)',
    group: 'Molduras',
    defaults: { w: 400, h: 160, content: '', style: { ...DEFAULT_STYLE, borderWidth: 1, background: '#ffffff' } },
  },
  {
    type: 'card',
    label: 'Card com borda',
    group: 'Molduras',
    defaults: {
      w: 360,
      h: 140,
      content: '',
      style: { ...DEFAULT_STYLE, borderWidth: 1, radius: 14, background: '#f8fafc', padding: 14 },
    },
  },
  {
    type: 'separator',
    label: 'Linha divisória',
    group: 'Molduras',
    defaults: { w: 400, h: 2, content: '', style: { ...DEFAULT_STYLE, borderColor: '#94a3b8' } },
  },
  {
    type: 'heading',
    label: 'Título',
    group: 'Texto',
    defaults: {
      w: 460,
      h: 44,
      content: 'COMPROVANTE DE PAGAMENTO',
      style: { ...DEFAULT_STYLE, fontSize: 20, fontWeight: 'bold', align: 'center' },
    },
  },
  {
    type: 'text',
    label: 'Parágrafo / Texto',
    group: 'Texto',
    defaults: { w: 320, h: 32, content: 'Texto livre', style: { ...DEFAULT_STYLE } },
  },
  {
    type: 'label',
    label: 'Rótulo',
    group: 'Texto',
    defaults: {
      w: 200,
      h: 26,
      content: 'RÓTULO',
      style: { ...DEFAULT_STYLE, fontSize: 11, fontWeight: 'bold', color: '#64748b' },
    },
  },
  {
    type: 'table',
    label: 'Tabela dinâmica',
    group: 'Tabelas',
    defaults: {
      w: 420,
      h: 150,
      content: 'Desmembramento',
      rows: [
        { label: 'Aluguel', value: '{sub.aluguel}' },
        { label: 'Condomínio', value: '{sub.condominio}' },
        { label: 'IPTU', value: '{sub.iptu}' },
      ],
      style: { ...DEFAULT_STYLE, borderWidth: 1, padding: 10, background: '#ffffff' },
    },
  },
  {
    type: 'table',
    label: 'Tabela de subitens (categoria)',
    group: 'Tabelas',
    defaults: {
      w: 420,
      h: 160,
      content: 'Subitens da categoria',
      rows: [{ label: 'Subitens', value: '{subitens.lista}' }],
      style: { ...DEFAULT_STYLE, borderWidth: 1, padding: 10, background: '#ffffff' },
    },
  },

  {
    type: 'image',
    label: 'Logo / Imagem',
    group: 'Mídia',
    defaults: { w: 140, h: 90, content: '', src: '', style: { ...DEFAULT_STYLE, borderWidth: 1 } },
  },
  {
    type: 'watermark',
    label: 'Marca d’água',
    group: 'Mídia',
    defaults: {
      w: 420,
      h: 120,
      content: 'PAGO',
      style: { ...DEFAULT_STYLE, fontSize: 64, fontWeight: 'bold', color: '#94a3b8', align: 'center', opacity: 0.2 },
    },
  },
];

export interface DataField {
  token: string;
  label: string;
  group: string;
}

export const DATA_FIELDS: DataField[] = [
  { token: '{categoria.nome}', label: 'Nome da categoria', group: 'Categoria do modelo' },
  { token: '{despesa.valor_total}', label: 'Valor total do lançamento', group: 'Categoria do modelo' },
  { token: '{despesa.data_pagamento}', label: 'Data de pagamento', group: 'Categoria do modelo' },
  { token: '{despesa.forma_pagamento}', label: 'Forma de pagamento', group: 'Categoria do modelo' },
  { token: '{subitens.lista}', label: 'Lista de subitens (tabela)', group: 'Categoria do modelo' },
  { token: '{expense.description}', label: 'Descrição da despesa', group: 'Despesa' },
  { token: '{expense.amount}', label: 'Valor total', group: 'Despesa' },
  { token: '{expense.date}', label: 'Data de pagamento', group: 'Despesa' },
  { token: '{expense.dueDate}', label: 'Data de vencimento', group: 'Despesa' },
  { token: '{expense.observation}', label: 'Observação', group: 'Despesa' },
  { token: '{expense.installment}', label: 'Parcela', group: 'Despesa' },
  { token: '{payment.method}', label: 'Forma de pagamento', group: 'Pagamento' },
  { token: '{payment.settlement}', label: 'Forma de quitação', group: 'Pagamento' },
  { token: '{payment.account}', label: 'Conta bancária', group: 'Pagamento' },
  { token: '{payment.card}', label: 'Cartão de crédito', group: 'Pagamento' },
  { token: '{payment.status}', label: 'Status', group: 'Pagamento' },
  { token: '{category.name}', label: 'Categoria', group: 'Categoria' },
  { token: '{subcategory.name}', label: 'Subcategoria', group: 'Categoria' },
  { token: '{profile.name}', label: 'Seu nome', group: 'Perfil' },
  { token: '{profile.email}', label: 'Seu e-mail', group: 'Perfil' },
  { token: '{today}', label: 'Data de hoje', group: 'Geral' },
];

