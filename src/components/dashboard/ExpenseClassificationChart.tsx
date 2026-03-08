import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Wallet, ShoppingBag, RefreshCw, Shuffle, Landmark } from 'lucide-react';

type ClassificationType = 'essential' | 'superfluous' | 'fixed' | 'variable' | 'long_term';

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  categoryId?: string;
  categoryName?: string;
  isRecurring?: boolean;
  installments?: number | null;
  currentInstallment?: number | null;
}

interface ExpenseClassificationChartProps {
  type: ClassificationType;
  expenses: ExpenseItem[];
}

const CONFIG: Record<ClassificationType, { title: string; icon: React.ElementType; colors: string[]; emptyMessage: string }> = {
  essential: {
    title: 'Despesas Essenciais',
    icon: Wallet,
    colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#2563eb', '#1d4ed8'],
    emptyMessage: 'Nenhuma despesa essencial encontrada',
  },
  superfluous: {
    title: 'Despesas Supérfluas',
    icon: ShoppingBag,
    colors: ['#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#9333ea', '#7e22ce'],
    emptyMessage: 'Nenhuma despesa supérflua encontrada',
  },
  fixed: {
    title: 'Despesas Fixas',
    icon: RefreshCw,
    colors: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#0284c7', '#0369a1'],
    emptyMessage: 'Nenhuma despesa fixa encontrada',
  },
  variable: {
    title: 'Despesas Variáveis',
    icon: Shuffle,
    colors: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ea580c', '#c2410c'],
    emptyMessage: 'Nenhuma despesa variável encontrada',
  },
  long_term: {
    title: 'Longo Prazo',
    icon: Landmark,
    colors: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#dc2626', '#b91c1c'],
    emptyMessage: 'Nenhuma despesa de longo prazo encontrada',
  },
};

interface ExpenseClassification {
  type: string;       // essencial, superfluo, longo_prazo
  recurrence: string; // fixo, variavel
}

function classifyExpense(expense: ExpenseItem, metadata: Record<string, any>): ExpenseClassification {
  const catName = expense.categoryName || '';
  const meta = metadata[catName] as any;

  if (meta) {
    const classification = normalizeClassification(meta.classification);
    const recurrence = meta.recurrence === 'fixa' ? 'fixo' : 'variavel';
    return { type: classification, recurrence };
  }

  // Enhanced heuristic fallback based on category name
  const lower = catName.toLowerCase();
  
  let type = 'superfluo'; // default
  let recurrence = 'variavel'; // default

  // Essencial + Fixa
  if (lower.match(/moradia|aluguel|condomínio|condominio|conta|básica|basica|dependente|iptu|taxa.*admin|transporte/)) {
    type = 'essencial';
    recurrence = 'fixo';
  }
  // Essencial + Variável
  else if (lower.match(/mercado|supermercado|farmácia|farmacia|combustível|combustivel|alimentação|alimentacao|saúde|saude|benfeitoria|despesa.*apart/)) {
    type = 'essencial';
    recurrence = 'variavel';
  }
  // Longo Prazo
  else if (lower.match(/investimento|poupança|poupanca|reserva|chamada.*capital|fundo.*reserva|previdência|previdencia|consórcio|consorcio|longo.*prazo|capital/)) {
    type = 'longo_prazo';
    recurrence = 'variavel';
  }
  // Supérfluo + Fixa (subscriptions)
  else if (lower.match(/netflix|spotify|streaming|assinatura|academia|gym|clube/)) {
    type = 'superfluo';
    recurrence = 'fixo';
  }
  // Supérfluo + Variável
  else if (lower.match(/pessoal|cartão|cartao|lazer|doaç|jogos|restaurante|bar|viagem|outros.*gasto|presente/)) {
    type = 'superfluo';
    recurrence = 'variavel';
  }

  // Override recurrence if expense is marked recurring
  if (expense.isRecurring || (expense.installments && expense.installments > 1)) {
    recurrence = 'fixo';
  }

  return { type, recurrence };
}

function normalizeClassification(value?: string): string {
  if (!value) return 'variavel';
  if (value === 'essential' || value === 'essencial') return 'essencial';
  if (value === 'superfluous' || value === 'superfluo') return 'superfluo';
  if (value === 'long_term' || value === 'longo_prazo') return 'longo_prazo';
  if (value === 'fixed' || value === 'fixo') return 'fixo';
  if (value === 'variable' || value === 'variavel') return 'variavel';
  return value;
}

function matchesType(cl: ExpenseClassification, type: ClassificationType): boolean {
  switch (type) {
    case 'essential': return cl.type === 'essencial';
    case 'superfluous': return cl.type === 'superfluo';
    case 'fixed': return cl.recurrence === 'fixo';
    case 'variable': return cl.recurrence === 'variavel';
    case 'long_term': return cl.type === 'longo_prazo';
    default: return false;
  }
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ExpenseClassificationChart({ type, expenses }: ExpenseClassificationChartProps) {
  const config = CONFIG[type];
  const Icon = config.icon;

  const metadata = JSON.parse(localStorage.getItem('category_metadata') || '{}');

  // Filter expenses matching this classification
  const filtered = expenses.filter((exp) => {
    const classification = classifyExpense(exp, metadata);
    return matchesType(classification, type);
  });

  // Group by category
  const grouped: Record<string, { name: string; value: number }> = {};
  filtered.forEach((exp) => {
    const key = exp.categoryName || 'Sem categoria';
    if (!grouped[key]) grouped[key] = { name: key, value: 0 };
    grouped[key].value += exp.amount;
  });

  const chartData = Object.values(grouped).sort((a, b) => b.value - a.value);
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="w-5 h-5 text-muted-foreground" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground text-sm">
            <Icon className="w-10 h-10 mb-2 opacity-30" />
            {config.emptyMessage}
          </div>
        ) : (
          <>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={config.colors[index % config.colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-xs">{value}</span>}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pt-2 border-t text-center">
              <p className="text-sm font-semibold">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground">{filtered.length} despesa(s)</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
