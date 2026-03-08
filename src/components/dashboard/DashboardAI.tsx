import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sparkles, X, Send, Loader2, Trash2 } from 'lucide-react';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-chat`;

const QUICK_QUESTIONS = [
  '📊 Resumo do mês',
  '💡 Dicas de economia',
  '📈 Onde gasto mais?',
  '⚠️ Contas a vencer',
];

export function DashboardAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { expenses, categories, cards, accounts } = useFinance();
  const { incomes, incomeCategories } = useIncome();
  const summary = useFinancialSummary();

  // Build financial context string for the AI
  const financialContext = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const currentMonth = format(now, 'MMMM yyyy', { locale: ptBR });

    const monthlyExpenses = expenses.filter(e => {
      try {
        return isWithinInterval(parseISO(e.dueDate as unknown as string), { start: monthStart, end: monthEnd });
      } catch { return false; }
    });
    const monthlyIncomes = incomes.filter(i => {
      try {
        return isWithinInterval(parseISO(i.receiveDate as unknown as string), { start: monthStart, end: monthEnd });
      } catch { return false; }
    });

    const fmt = (v: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    // Category breakdown
    const catBreakdown = categories
      .map(c => {
        const total = monthlyExpenses
          .filter(e => e.categoryId === c.id)
          .reduce((s, e) => s + Number(e.amount), 0);
        return { name: c.name, total };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);

    // Income category breakdown
    const incCatBreakdown = incomeCategories
      .map(c => {
        const total = monthlyIncomes
          .filter(i => i.categoryId === c.id)
          .reduce((s, i) => s + Number(i.amount), 0);
        return { name: c.name, total };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);

    // Upcoming unpaid bills
    const unpaidBills = expenses
      .filter(e => !e.isPaid)
      .sort((a, b) => new Date(a.dueDate as unknown as string).getTime() - new Date(b.dueDate as unknown as string).getTime())
      .slice(0, 10);

    // Paid vs unpaid stats
    const paidExpenses = monthlyExpenses.filter(e => e.isPaid);
    const unpaidExpenses = monthlyExpenses.filter(e => !e.isPaid);
    const receivedIncomes = monthlyIncomes.filter(i => i.isReceived);
    const pendingIncomes = monthlyIncomes.filter(i => !i.isReceived);

    return `
MÊS ATUAL: ${currentMonth}
DATA DE HOJE: ${format(now, 'dd/MM/yyyy')}

=== RESUMO DO MÊS ===
Total de Receitas: ${fmt(summary.totalIncome)} (${monthlyIncomes.length} lançamentos)
  - Recebidas: ${fmt(receivedIncomes.reduce((s, i) => s + Number(i.amount), 0))} (${receivedIncomes.length})
  - Pendentes: ${fmt(pendingIncomes.reduce((s, i) => s + Number(i.amount), 0))} (${pendingIncomes.length})
Total de Despesas: ${fmt(summary.totalExpenses)} (${monthlyExpenses.length} lançamentos)
  - Pagas: ${fmt(paidExpenses.reduce((s, e) => s + Number(e.amount), 0))} (${paidExpenses.length})
  - A pagar: ${fmt(unpaidExpenses.reduce((s, e) => s + Number(e.amount), 0))} (${unpaidExpenses.length})
Saldo do Mês: ${fmt(summary.balance)}

=== GASTOS POR CATEGORIA (mês atual) ===
${catBreakdown.map(c => `- ${c.name}: ${fmt(c.total)}`).join('\n') || 'Nenhum gasto registrado'}

=== RECEITAS POR CATEGORIA (mês atual) ===
${incCatBreakdown.map(c => `- ${c.name}: ${fmt(c.total)}`).join('\n') || 'Nenhuma receita registrada'}

=== PRÓXIMAS CONTAS A PAGAR ===
${unpaidBills.map(b => `- ${b.description}: ${fmt(Number(b.amount))} (vence ${format(new Date(b.dueDate as unknown as string), 'dd/MM/yyyy')})`).join('\n') || 'Nenhuma conta pendente'}

=== DESPESAS DO MÊS (detalhado) ===
${monthlyExpenses.slice(0, 30).map(e => {
  const cat = categories.find(c => c.id === e.categoryId)?.name || 'Sem categoria';
  return `- ${e.description} | ${cat} | ${fmt(Number(e.amount))} | ${e.isPaid ? 'Pago' : 'Pendente'} | Venc: ${format(new Date(e.dueDate as unknown as string), 'dd/MM/yyyy')}${e.isRecurring ? ' | Recorrente' : ''}${e.installments ? ` | Parcela ${e.currentInstallment}/${e.installments}` : ''}`;
}).join('\n') || 'Nenhuma despesa'}

=== RECEITAS DO MÊS (detalhado) ===
${monthlyIncomes.slice(0, 20).map(i => {
  const cat = incomeCategories.find(c => c.id === i.categoryId)?.name || 'Sem categoria';
  return `- ${i.title} | ${cat} | ${fmt(Number(i.amount))} | ${i.isReceived ? 'Recebido' : 'Pendente'} | Data: ${format(new Date(i.receiveDate as unknown as string), 'dd/MM/yyyy')}`;
}).join('\n') || 'Nenhuma receita'}

=== CONTAS E CARTÕES ===
Contas bancárias: ${accounts.length} cadastrada(s)
${accounts.map(a => `- ${a.bankName} (Ag: ${a.agency})`).join('\n') || 'Nenhuma'}
Cartões de crédito: ${cards.length} cadastrado(s)
${cards.map(c => `- ${c.brand} •••• ${c.lastFourDigits}`).join('\n') || 'Nenhum'}

TOTAL GERAL DE DESPESAS NO SISTEMA: ${expenses.length}
TOTAL GERAL DE RECEITAS NO SISTEMA: ${incomes.length}
`;
  }, [expenses, incomes, categories, incomeCategories, accounts, cards, summary]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          financialContext,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(err.error || 'Erro ao se comunicar com a IA');
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error('Chat error:', e);
      toast.error('Erro ao se comunicar com a IA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all duration-300 hover:scale-110"
          >
            <Sparkles className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 sm:w-[420px] p-0 mr-4 mb-2 shadow-2xl border-purple-100 dark:border-purple-900 rounded-2xl"
          side="top"
          align="end"
        >
          <div className="flex flex-col h-[540px] max-h-[80vh] bg-background/95 backdrop-blur-sm rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-purple-100 dark:bg-purple-900/50 p-1.5 rounded-md">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">KeepMoney AI</h3>
                  <p className="text-[10px] text-muted-foreground">Assistente Financeiro Inteligente</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-background/50"
                    onClick={clearChat}
                    title="Limpar conversa"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 p-3 rounded-xl rounded-tl-none text-sm text-foreground">
                    Olá! 👋 Sou o assistente financeiro do <strong>KeepMoney</strong>. Tenho acesso aos seus dados e posso te ajudar com análises, dicas e dúvidas sobre suas finanças. O que gostaria de saber?
                  </div>
                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-xs text-left p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/50 transition-colors text-foreground"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-muted/50 text-foreground rounded-bl-none'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 p-3 rounded-xl rounded-bl-none">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-background/50">
              <form className="relative flex items-center gap-2" onSubmit={handleSubmit}>
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="pr-10 bg-muted/30 border-muted-foreground/20 focus-visible:ring-purple-500 rounded-xl"
                  placeholder="Pergunte sobre suas finanças..."
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1 h-8 w-8 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                </Button>
              </form>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
