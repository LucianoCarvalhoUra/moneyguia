import { useState, useRef, useCallback } from 'react';
import {
  Upload, ScanLine, Plus, Trash2, Sparkles, Save,
  AlertCircle, KeyRound, ExternalLink, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useFinance } from '@/contexts/FinanceContext';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReceiptItem {
  id: string;
  category: string;
  value: string;
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

type Step = 'setup' | 'upload' | 'processing' | 'form';

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'moneyguia_google_ai_key';

const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

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

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';

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
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function makeItem(overrides: Partial<ReceiptItem> = {}): ReceiptItem {
  return { id: crypto.randomUUID(), category: '', value: '', reference: '', ...overrides };
}

function getStoredKey(): string {
  return localStorage.getItem(LS_KEY) ?? '';
}

function saveKey(key: string) {
  localStorage.setItem(LS_KEY, key.trim());
}

// ─── OCR via Google Gemini (direto do browser, sem edge function) ─────────────

async function callGeminiOCR(apiKey: string, fileBase64: string, mimeType: string) {
  const prompt = `Você é um especialista em leitura de comprovantes financeiros brasileiros.
Analise o arquivo e retorne APENAS um JSON válido, sem markdown, sem texto extra.

Estrutura obrigatória:
{
  "beneficiary": "Nome do beneficiário ou null",
  "email": "E-mail encontrado ou null",
  "paymentMethod": "Forma de pagamento (PIX, Transferência, Boleto, etc.) ou null",
  "dueDate": "YYYY-MM-DD ou null",
  "paymentDate": "YYYY-MM-DD ou null",
  "items": [
    { "category": "Categoria (Aluguel, Condomínio, IPTU, Salário, Serviço, etc.)", "value": 1234.56, "reference": "Descrição do item" }
  ],
  "notes": "Observações adicionais ou null"
}

Regras: se houver múltiplos componentes de valor, crie um item por componente. Datas em YYYY-MM-DD. Valores como número float.`;

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: fileBase64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { temperature: 0.1 },
  };

  const response = await fetch(GEMINI_URL(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 400) throw new Error('Chave de API inválida. Verifique e tente novamente.');
    if (response.status === 429) throw new Error('Limite de requisições atingido. Aguarde e tente novamente.');
    throw new Error(err?.error?.message ?? `Erro Gemini: ${response.status}`);
  }

  const result = await response.json();
  const rawText: string = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const cleaned = rawText
    .replace(/^```json\s*/im, '').replace(/^```\s*/im, '')
    .replace(/\s*```$/im, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('A IA não retornou um JSON válido. Tente novamente.');
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReceiptUploader() {
  const hasKey = Boolean(getStoredKey());

  const [step, setStep]         = useState<Step>(hasKey ? 'upload' : 'setup');
  const [apiKeyInput, setApiKey] = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [form, setForm]         = useState<ReceiptForm>(EMPTY_FORM);
  const [error, setError]       = useState<string | null>(null);
  const fileInputRef            = useRef<HTMLInputElement>(null);

  const { categories, addExpense } = useFinance();

  const categoryOptions = [
    ...RECEIPT_CATEGORIES,
    ...categories.map(c => c.name).filter(n => !RECEIPT_CATEGORIES.includes(n)),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const total = form.items.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
  const chartData = form.items
    .filter(i => parseFloat(i.value) > 0)
    .map(i => ({ name: i.category || i.reference || 'Item', value: parseFloat(i.value) }));

  // ── Save key ──────────────────────────────────────────────────────────────
  const handleSaveKey = () => {
    const k = apiKeyInput.trim();
    if (!k.startsWith('AIza')) {
      toast.error('Chave inválida. Chaves do Google AI começam com "AIza".');
      return;
    }
    saveKey(k);
    setStep('upload');
    toast.success('Chave configurada com sucesso!');
  };

  // ── Process file ──────────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    const apiKey = getStoredKey();
    if (!apiKey) { setStep('setup'); return; }

    setError(null);
    setFileName(file.name);
    setStep('processing');

    try {
      const base64   = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';
      const data     = await callGeminiOCR(apiKey, base64, mimeType);

      const items: ReceiptItem[] = Array.isArray(data.items) && data.items.length > 0
        ? data.items.map((it: { category?: string; value?: number; reference?: string }) =>
            makeItem({ category: it.category ?? '', value: String(it.value ?? ''), reference: it.reference ?? '' }))
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
      setError(e instanceof Error ? e.message : 'Erro ao processar o arquivo.');
      // If key is invalid, go back to setup
      if (e instanceof Error && e.message.includes('inválida')) {
        localStorage.removeItem(LS_KEY);
        setStep('setup');
      } else {
        setStep('upload');
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const setField = <K extends keyof Omit<ReceiptForm, 'items'>>(k: K, v: ReceiptForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));
  const updateItem = (id: string, patch: Partial<ReceiptItem>) =>
    setForm(f => ({ ...f, items: f.items.map(it => it.id === id ? { ...it, ...patch } : it) }));
  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, makeItem()] }));
  const removeItem = (id: string) => setForm(f => ({ ...f, items: f.items.filter(it => it.id !== id) }));

  // ── Save expenses ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validItems = form.items.filter(i => parseFloat(i.value) > 0);
    if (!validItems.length) { toast.error('Adicione ao menos um item com valor.'); return; }

    const payDate = form.paymentDate || form.dueDate || new Date().toISOString().split('T')[0];
    try {
      for (const item of validItems) {
        const matchedCat = categories.find(c => c.name.toLowerCase() === item.category.toLowerCase());
        await addExpense({
          description:   item.reference || item.category || form.beneficiary || 'Comprovante',
          amount:        parseFloat(item.value),
          expenseDate:   new Date(payDate),
          dueDate:       new Date(form.dueDate || payDate),
          paymentMethod: 'pix',
          isPaid:        true,
          isRecurring:   false,
          categoryId:    matchedCat?.id ?? '',
          observation:   form.notes || undefined,
        });
      }
      toast.success(`${validItems.length} despesa(s) salva(s)!`);
      setForm(EMPTY_FORM);
      setStep('upload');
      setFileName('');
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: Setup — configure Google AI key
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'setup') {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Configurar Chave de IA
          </CardTitle>
          <CardDescription>
            A leitura de comprovantes usa o Google Gemini diretamente no seu navegador.
            Você precisa de uma chave gratuita do Google AI Studio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Instructions */}
          <div className="rounded-lg bg-muted/60 p-4 space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Como obter a chave (grátis):</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse <strong>aistudio.google.com</strong></li>
              <li>Clique em <strong>"Get API key"</strong> → <strong>"Create API key"</strong></li>
              <li>Copie a chave gerada (começa com <code className="bg-muted px-1 rounded">AIza...</code>)</li>
              <li>Cole abaixo e clique em Salvar</li>
            </ol>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary font-medium hover:underline mt-1"
            >
              Abrir Google AI Studio <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ai-key">Chave do Google AI Studio</Label>
            <div className="relative">
              <Input
                id="ai-key"
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="pr-10 font-mono text-sm"
                onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
              />
              <button
                type="button"
                onClick={() => setShowKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              A chave fica salva apenas no seu navegador (localStorage). Não é enviada a terceiros.
            </p>
          </div>

          <Button className="w-full gradient-primary" onClick={handleSaveKey} disabled={!apiKeyInput.trim()}>
            Salvar e Continuar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: Upload
  // ════════════════════════════════════════════════════════════════════════════
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
            <p className="text-base font-semibold text-foreground">Arraste o comprovante aqui</p>
            <p className="text-sm text-muted-foreground mt-1">
              ou <span className="text-primary font-medium underline underline-offset-2">clique para selecionar</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">JPEG, PNG, WebP, PDF</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => { localStorage.removeItem(LS_KEY); setStep('setup'); }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Alterar chave de IA
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: Processing
  // ════════════════════════════════════════════════════════════════════════════
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
          {[0, 1, 2].map(i => (
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

  // ════════════════════════════════════════════════════════════════════════════
  // STEP: Form
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Comprovante lido:{' '}
            <span className="font-normal text-muted-foreground">{fileName}</span>
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

          {/* Section A */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                A — Metadados do Lançamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Locador / Beneficiário</Label>
                  <Input value={form.beneficiary} onChange={e => setField('beneficiary', e.target.value)} placeholder="Nome do beneficiário" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contato (E-mail)</Label>
                  <Input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Forma de Pagamento</Label>
                  <Input value={form.paymentMethod} onChange={e => setField('paymentMethod', e.target.value)} placeholder="PIX, Transferência..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Vencimento</Label>
                  <Input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data do Pagamento</Label>
                  <Input type="date" value={form.paymentDate} onChange={e => setField('paymentDate', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Notas adicionais do comprovante…"
                  className="min-h-[72px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section B */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                B — Desmembramento do Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-[1fr_1fr_120px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Subcategoria</span>
                <span>Referência / Descrição</span>
                <span className="text-right">Valor (R$)</span>
                <span />
              </div>

              {form.items.map(item => (
                <div key={item.id} className="grid grid-cols-[1fr_1fr_120px_36px] gap-2 items-start">
                  <Select value={item.category} onValueChange={v => updateItem(item.id, { category: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Categoria…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="h-9 text-sm" value={item.reference} onChange={e => updateItem(item.id, { reference: e.target.value })} placeholder="Descrição…" />
                  <Input className="h-9 text-sm text-right tabular-nums" type="number" min="0" step="0.01" value={item.value} onChange={e => updateItem(item.id, { value: e.target.value })} placeholder="0,00" />
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)} disabled={form.items.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" size="sm" className="w-full mt-1 border-dashed" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1.5" /> Adicionar item
              </Button>

              <Separator />
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-sm font-semibold">TOTAL DEPOSITADO</span>
                <span className="text-xl font-bold tabular-nums">{fmtMoney(total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Chart ─────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                C — Impacto Orçamentário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full border-4 border-dashed border-muted-foreground/20" />
                  <p className="text-xs">Preencha os valores para visualizar a distribuição</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [fmtMoney(v), '']}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-1.5">
                    {chartData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="truncate text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-medium shrink-0 ml-2 tabular-nums">
                          {total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Total</span>
                    <span className="tabular-nums">{fmtMoney(total)}</span>
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
