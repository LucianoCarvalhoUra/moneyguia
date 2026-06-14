import { useState, useRef, useCallback, useId } from 'react';
import {
  Upload, ScanLine, Plus, Trash2, Sparkles, Save, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReceiptItem {
  id: string;
  category: string;
  value: string; // string for input binding
  reference: string;
}

interface ReceiptForm {
  beneficiary: string;
  email: string;
  paymentMethod: string;
  dueDate: string;
  paymentDate: string;
  notes: string;
  items: ReceiptItem[];
}

type Step = 'upload' | 'processing' | 'form';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECEIPT_CATEGORIES = [
  'Aluguel', 'Condomínio', 'IPTU', 'Água', 'Luz/Energia', 'Gás',
  'Internet', 'Telefone', 'Salário', '13º Salário', 'Férias',
  'Hora Extra', 'Plano de Saúde', 'Seguro', 'Serviço', 'Manutenção',
  'Material', 'Produto', 'Taxa Bancária', 'Imposto', 'Multa',
  'Juros', 'Desconto', 'Outros',
];

const PIE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#64748b',
];

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

const EMPTY_FORM: ReceiptForm = {
  beneficiary: '', email: '', paymentMethod: '',
  dueDate: '', paymentDate: '', notes: '', items: [],
};

const fmtMoney = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function makeItem(overrides: Partial<ReceiptItem> = {}): ReceiptItem {
  return {
    id: crypto.randomUUID(),
    category: '',
    value: '',
    reference: '',
    ...overrides,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReceiptUploader() {
  const [step, setStep]         = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [form, setForm]         = useState<ReceiptForm>(EMPTY_FORM);
  const [error, setError]       = useState<string | null>(null);
  const fileInputRef            = useRef<HTMLInputElement>(null);
  const uid                     = useId();

  const { categories, addExpense } = useFinance();

  // All category options: user's categories + predefined receipt categories
  const categoryOptions = [
    ...RECEIPT_CATEGORIES,
    ...categories
      .map(c => c.name)
      .filter(n => !RECEIPT_CATEGORIES.includes(n)),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // ── Derived values ─────────────────────────────────────────────────────────
  const total = form.items.reduce((s, item) => s + (parseFloat(item.value) || 0), 0);

  const chartData = form.items
    .filter(i => parseFloat(i.value) > 0)
    .map(i => ({
      name: i.category || i.reference || 'Item',
      value: parseFloat(i.value),
    }));

  // ── File processing ────────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setStep('processing');

    try {
      const base64   = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';

      const { data, error: fnError } = await supabase.functions.invoke('process-receipt', {
        body: { fileBase64: base64, mimeType },
      });

      if (fnError) throw new Error(fnError.message ?? 'Erro na leitura do comprovante');
      if (!data)   throw new Error('Resposta vazia da IA');
      if (data.error) throw new Error(data.error);

      // Map AI response to form state
      const items: ReceiptItem[] = Array.isArray(data.items) && data.items.length > 0
        ? data.items.map((it: { category?: string; value?: number; reference?: string }) =>
            makeItem({
              category:  it.category  ?? '',
              value:     String(it.value ?? ''),
              reference: it.reference ?? '',
            })
          )
        : [makeItem()];

      setForm({
        beneficiary:   data.beneficiary   ?? '',
        email:         data.email         ?? '',
        paymentMethod: data.paymentMethod ?? '',
        dueDate:       data.dueDate       ?? '',
        paymentDate:   data.paymentDate   ?? '',
        notes:         data.notes         ?? '',
        items,
      });

      setStep('form');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar o arquivo');
      setStep('upload');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const setField = <K extends keyof Omit<ReceiptForm, 'items'>>(
    key: K, value: ReceiptForm[K],
  ) => setForm(f => ({ ...f, [key]: value }));

  const updateItem = (id: string, patch: Partial<ReceiptItem>) =>
    setForm(f => ({
      ...f,
      items: f.items.map(it => it.id === id ? { ...it, ...patch } : it),
    }));

  const addItem = () =>
    setForm(f => ({ ...f, items: [...f.items, makeItem()] }));

  const removeItem = (id: string) =>
    setForm(f => ({ ...f, items: f.items.filter(it => it.id !== id) }));

  // ── Save expenses ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (form.items.length === 0) {
      toast.error('Adicione ao menos um item antes de salvar.');
      return;
    }

    const paymentDate = form.paymentDate || form.dueDate || new Date().toISOString().split('T')[0];

    try {
      for (const item of form.items) {
        const value = parseFloat(item.value);
        if (!value || value <= 0) continue;

        // Try to match a user category by name
        const matchedCat = categories.find(
          c => c.name.toLowerCase() === item.category.toLowerCase()
        );

        await addExpense({
          description:   item.reference || item.category || form.beneficiary || 'Comprovante',
          amount:        value,
          expenseDate:   new Date(paymentDate),
          dueDate:       new Date(form.dueDate || paymentDate),
          paymentMethod: 'pix',
          isPaid:        true,
          isRecurring:   false,
          categoryId:    matchedCat?.id ?? '',
          observation:   form.notes ?? undefined,
        });
      }

      toast.success(`${form.items.length} despesa(s) salva(s) com sucesso!`);
      setForm(EMPTY_FORM);
      setStep('upload');
      setFileName('');
    } catch (e) {
      toast.error('Erro ao salvar despesas.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // STEP: Upload
  if (step === 'upload') {
    return (
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed
            p-12 text-center cursor-pointer transition-colors
            ${dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'}
          `}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              Arraste o comprovante aqui
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ou <span className="text-primary font-medium underline underline-offset-2">clique para selecionar</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Suporta: JPEG, PNG, WebP, PDF
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    );
  }

  // STEP: Processing
  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <ScanLine className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Scanner de IA lendo o documento…</p>
          <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // STEP: Form
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Comprovante lido: <span className="font-normal text-muted-foreground">{fileName}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verifique e edite os campos antes de salvar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setStep('upload'); setFileName(''); }}>
            Novo arquivo
          </Button>
          <Button size="sm" className="gradient-primary" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1.5" />
            Salvar Despesas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Form ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section A: Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                A — Metadados do Lançamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`${uid}-benef`}>Locador / Beneficiário</Label>
                  <Input
                    id={`${uid}-benef`}
                    value={form.beneficiary}
                    onChange={e => setField('beneficiary', e.target.value)}
                    placeholder="Nome do beneficiário"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${uid}-email`}>Contato (E-mail)</Label>
                  <Input
                    id={`${uid}-email`}
                    type="email"
                    value={form.email}
                    onChange={e => setField('email', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${uid}-method`}>Forma de Pagamento</Label>
                  <Input
                    id={`${uid}-method`}
                    value={form.paymentMethod}
                    onChange={e => setField('paymentMethod', e.target.value)}
                    placeholder="Ex: PIX, Transferência Bancária"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1" />
                <div className="space-y-1.5">
                  <Label htmlFor={`${uid}-due`}>Vencimento</Label>
                  <Input
                    id={`${uid}-due`}
                    type="date"
                    value={form.dueDate}
                    onChange={e => setField('dueDate', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${uid}-paid`}>Data do Pagamento</Label>
                  <Input
                    id={`${uid}-paid`}
                    type="date"
                    value={form.paymentDate}
                    onChange={e => setField('paymentDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-notes`}>Observações</Label>
                <Textarea
                  id={`${uid}-notes`}
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Notas adicionais do comprovante…"
                  className="min-h-[72px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section B: Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                B — Desmembramento do Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_1fr_120px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Subcategoria</span>
                <span>Referência / Descrição</span>
                <span className="text-right">Valor (R$)</span>
                <span />
              </div>

              {form.items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-[1fr_1fr_120px_36px] gap-2 items-start">
                  <Select
                    value={item.category}
                    onValueChange={v => updateItem(item.id, { category: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Categoria…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    className="h-9 text-sm"
                    value={item.reference}
                    onChange={e => updateItem(item.id, { reference: e.target.value })}
                    placeholder="Descrição…"
                  />

                  <Input
                    className="h-9 text-sm text-right tabular-nums"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.value}
                    onChange={e => updateItem(item.id, { value: e.target.value })}
                    placeholder="0,00"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                    disabled={form.items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-1 border-dashed"
                onClick={addItem}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar item
              </Button>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-sm font-semibold text-foreground">TOTAL DEPOSITADO</span>
                <span className="text-xl font-bold text-foreground tabular-nums">
                  {fmtMoney(total)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Chart ─────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                C — Impacto Orçamentário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full border-4 border-dashed border-muted-foreground/20" />
                  <p className="text-xs">Preencha os valores para<br />visualizar a distribuição</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [fmtMoney(v), '']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div className="space-y-1.5">
                    {chartData.map((item, i) => {
                      const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            <span className="truncate text-muted-foreground">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="font-medium text-foreground tabular-nums">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-foreground tabular-nums">{fmtMoney(total)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
