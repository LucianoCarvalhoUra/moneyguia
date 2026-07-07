import { useState } from 'react';
import { ChevronDown, ChevronRight, Database, Layers, GripVertical } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { PALETTE_ITEMS, CATEGORY_LABELS, DATA_FIELDS } from './schema';
import { FIELD_LABELS } from './useReportData';
import type { ElementType } from './types';

interface Props {
  onDragStart: (type: ElementType) => void;
}

const SECTION_ORDER: ('layout' | 'text' | 'chart' | 'data')[] = ['layout', 'text', 'chart', 'data'];

export function LeftPanel({ onDragStart }: Props) {
  const [dataOpen, setDataOpen]   = useState(true);
  const [compOpen, setCompOpen]   = useState(true);
  const [expandedTable, setExpandedTable] = useState<string | null>('expenses');

  const { categories } = useFinance();
  const { incomeCategories } = useIncome();

  const grouped = SECTION_ORDER.reduce((acc, cat) => {
    acc[cat] = PALETTE_ITEMS.filter(p => p.category === cat);
    return acc;
  }, {} as Record<string, typeof PALETTE_ITEMS>);

  const TABLE_INFO = {
    expenses: {
      label: 'expenses',
      description: `Despesas • ${DATA_FIELDS.expenses.length} campos`,
      fields: DATA_FIELDS.expenses,
    },
    incomes: {
      label: 'incomes',
      description: `Receitas • ${DATA_FIELDS.incomes.length} campos`,
      fields: DATA_FIELDS.incomes,
    },
    categories: {
      label: 'categories',
      description: `Categorias • ${(categories.length + incomeCategories.length)} registros`,
      fields: [{ key: 'name', label: 'Nome', type: 'string' }],
    },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background border-r border-border">
      <div className="px-3 py-3 border-b bg-muted/30">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Painel</p>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Section: DATA ──────────────────────────────────────────────── */}
        <SectionHeader
          icon={Database}
          label="Dados"
          open={dataOpen}
          onToggle={() => setDataOpen(o => !o)}
        />

        {dataOpen && (
          <div className="px-3 py-2 space-y-1">
            {Object.entries(TABLE_INFO).map(([key, info]) => (
              <div key={key} className="rounded-md border border-border/50 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setExpandedTable(expandedTable === key ? null : key)}
                >
                  <div>
                    <p className="text-xs font-semibold font-mono text-foreground">{info.label}</p>
                    <p className="text-[10px] text-muted-foreground">{info.description}</p>
                  </div>
                  {expandedTable === key
                    ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                </button>

                {expandedTable === key && (
                  <div className="bg-muted/30 border-t border-border/40 divide-y divide-border/30">
                    {info.fields.map((f) => (
                      <div
                        key={f.key}
                        className="flex items-center justify-between px-3 py-1.5 text-[11px] hover:bg-muted/50 cursor-default"
                      >
                        <span className="font-mono text-foreground">{f.key}</span>
                        <span className="text-muted-foreground">{FIELD_LABELS[f.key] ?? f.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Section: COMPONENTS ──────────────────────────────────────── */}
        <SectionHeader
          icon={Layers}
          label="Elementos Visuais"
          open={compOpen}
          onToggle={() => setCompOpen(o => !o)}
        />

        {compOpen && (
          <div className="px-3 py-2 space-y-3">
            {SECTION_ORDER.map(cat => (
              <div key={cat}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="space-y-1">
                  {grouped[cat].map(item => (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={() => onDragStart(item.type)}
                      className="flex items-center gap-2.5 rounded-md border border-border/50 bg-background px-2.5 py-2 cursor-grab hover:border-primary/50 hover:bg-primary/5 transition-colors select-none active:cursor-grabbing"
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                      <item.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground leading-tight">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight truncate">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon, label, open, onToggle,
}: { icon: React.ElementType; label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 border-y border-border/30 transition-colors"
      onClick={onToggle}
    >
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs font-semibold text-foreground flex-1">{label}</span>
      {open
        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}
