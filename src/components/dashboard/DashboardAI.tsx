import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sparkles, X, Send, Loader2, Trash2, Square, MessageCircle, ArrowRight } from 'lucide-react';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-chat`;

const STARTER_SUGGESTIONS = [
  { emoji: '📊', text: 'Como estão minhas finanças este mês?' },
  { emoji: '💡', text: 'Onde posso economizar?' },
  { emoji: '⚠️', text: 'Quais contas vencem em breve?' },
  { emoji: '➕', text: 'Quero registrar um gasto' },
];

function getFollowUpSuggestions(lastAssistantMsg: string): string[] {
  const suggestions: string[] = [];
  const lower = lastAssistantMsg.toLowerCase();

  if (lower.includes('despesa') || lower.includes('gasto') || lower.includes('criada com sucesso')) {
    suggestions.push('Qual meu saldo atualizado?');
    suggestions.push('Registrar outra despesa');
  }
  if (lower.includes('receita') || lower.includes('ganho') || lower.includes('recebimento')) {
    suggestions.push('Quanto já recebi este mês?');
    suggestions.push('Registrar outra receita');
  }
  if (lower.includes('categoria') || lower.includes('alimentação') || lower.includes('transporte')) {
    suggestions.push('Detalhar gastos dessa categoria');
    suggestions.push('Comparar com o mês passado');
  }
  if (lower.includes('economia') || lower.includes('dica') || lower.includes('economizar')) {
    suggestions.push('Como aplicar essa dica?');
    suggestions.push('Outras formas de economizar');
  }
  if (lower.includes('vencimento') || lower.includes('pendente') || lower.includes('a pagar')) {
    suggestions.push('Marcar alguma como paga');
    suggestions.push('Quanto devo no total?');
  }
  if (lower.includes('saldo') || lower.includes('balanço') || lower.includes('resumo')) {
    suggestions.push('Como melhorar meu saldo?');
    suggestions.push('Projeção para o fim do mês');
  }

  // Always add a generic fallback if few suggestions
  if (suggestions.length < 2) {
    suggestions.push('Me dê um resumo geral');
    suggestions.push('Quero registrar algo');
  }

  return suggestions.slice(0, 3);
}

export function DashboardAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { user } = useAuth();
  const { expenses, categories, subcategories, cards, accounts, refreshData: refreshFinance } = useFinance();
  const { incomes, incomeCategories, refreshData: refreshIncome } = useIncome();
  const summary = useFinancialSummary();

  const refreshAllData = useCallback(async () => {
    await Promise.all([refreshFinance(), refreshIncome()]);
  }, [refreshFinance, refreshIncome]);

  const categoriesMap = useMemo(() => {
    return categories.map(c => ({
      id: c.id,
      name: c.name,
      subcategories: subcategories
        .filter(s => s.categoryId === c.id)
        .map(s => ({ id: s.id, name: s.name })),
    }));
  }, [categories, subcategories]);

  const financialContext = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const currentMonth = format(now, 'MMMM yyyy', { locale: ptBR });

    const safeParseDate = (d: any): Date => {
      if (d instanceof Date) return d;
      if (typeof d === 'string') return parseISO(d);
      return new Date(d);
    };

    const monthlyExpenses = expenses.filter(e => {
      try {
        return isWithinInterval(safeParseDate(e.dueDate), { start: monthStart, end: monthEnd });
      } catch { return false; }
    });
    const monthlyIncomes = incomes.filter(i => {
      try {
        return isWithinInterval(safeParseDate(i.receiveDate), { start: monthStart, end: monthEnd });
      } catch { return false; }
    });

    const fmt = (v: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const catBreakdown = categories
      .map(c => {
        const total = monthlyExpenses
          .filter(e => e.categoryId === c.id)
          .reduce((s, e) => s + Number(e.amount), 0);
        return { name: c.name, total };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);

    const incCatBreakdown = incomeCategories
      .map(c => {
        const total = monthlyIncomes
          .filter(i => i.categoryId === c.id)
          .reduce((s, i) => s + Number(i.amount), 0);
        return { name: c.name, total };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);

    const unpaidBills = expenses
      .filter(e => !e.isPaid)
      .sort((a, b) => new Date(a.dueDate as unknown as string).getTime() - new Date(b.dueDate as unknown as string).getTime())
      .slice(0, 10);

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
${unpaidBills.map(b => `- [id:${b.id}] ${b.description}: ${fmt(Number(b.amount))} (vence ${format(new Date(b.dueDate as unknown as string), 'dd/MM/yyyy')})`).join('\n') || 'Nenhuma conta pendente'}

=== DESPESAS DO MÊS (detalhado, com IDs para edição/exclusão) ===
${monthlyExpenses.slice(0, 30).map(e => {
  const cat = categories.find(c => c.id === e.categoryId)?.name || 'Sem categoria';
  const subcat = e.subcategoryId ? subcategories.find(s => s.id === e.subcategoryId)?.name : null;
  return `- [id:${e.id}] ${e.description} | ${cat}${subcat ? ' > ' + subcat : ''} | ${fmt(Number(e.amount))} | ${e.isPaid ? 'Pago' : 'Pendente'} | Venc: ${format(new Date(e.dueDate as unknown as string), 'dd/MM/yyyy')}${e.isRecurring ? ' | Recorrente' : ''}${e.installments ? ` | Parcela ${e.currentInstallment}/${e.installments}` : ''}`;
}).join('\n') || 'Nenhuma despesa'}

=== RECEITAS DO MÊS (detalhado, com IDs para edição/exclusão) ===
${monthlyIncomes.slice(0, 20).map(i => {
  const cat = incomeCategories.find(c => c.id === i.categoryId)?.name || 'Sem categoria';
  return `- [id:${i.id}] ${i.title} | ${cat} | ${fmt(Number(i.amount))} | ${i.isReceived ? 'Recebido' : 'Pendente'} | Data: ${format(new Date(i.receiveDate as unknown as string), 'dd/MM/yyyy')}`;
}).join('\n') || 'Nenhuma receita'}

=== CONTAS E CARTÕES ===
Contas bancárias: ${accounts.length} cadastrada(s)
${accounts.map(a => `- ${a.bankName} (Ag: ${a.agency})`).join('\n') || 'Nenhuma'}
Cartões de crédito: ${cards.length} cadastrado(s)
${cards.map(c => `- ${c.brand} •••• ${c.lastFourDigits}`).join('\n') || 'Nenhum'}

TOTAL GERAL DE DESPESAS NO SISTEMA: ${expenses.length}
TOTAL GERAL DE RECEITAS NO SISTEMA: ${incomes.length}
`;
  }, [expenses, incomes, categories, subcategories, incomeCategories, accounts, cards, summary]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
          userId: user?.id,
          categoriesMap,
          incomeCategoriesMap: incomeCategories.map(c => ({ id: c.id, name: c.name })),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        if (resp.status === 429) {
          toast.error('Muitas requisições. Aguarde um momento e tente novamente.');
        } else if (resp.status === 402) {
          toast.error('Créditos de IA esgotados. Adicione créditos para continuar.');
        } else {
          toast.error(err.error || 'Erro ao se comunicar com a IA');
        }
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
            if (parsed.refresh) {
              refreshAllData();
              continue;
            }
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
    } catch (e: any) {
      if (e.name === 'AbortError') {
        if (!assistantSoFar) {
          setMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || prev[prev.length - 1]?.role !== 'assistant'));
        }
        return;
      }
      console.error('Chat error:', e);
      toast.error('Erro ao se comunicar com a IA');
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const clearChat = () => {
    cancelRequest();
    setMessages([]);
  };

  // Get follow-up suggestions from last assistant message
  const followUpSuggestions = useMemo(() => {
    if (messages.length === 0 || isLoading) return [];
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role !== 'assistant') return [];
    return getFollowUpSuggestions(lastMsg.content);
  }, [messages, isLoading]);

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
          <div className="flex flex-col h-[580px] max-h-[80vh] bg-background/95 backdrop-blur-sm rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-purple-100 dark:bg-purple-900/50 p-1.5 rounded-md">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">KeepMoney AI</h3>
                  <p className="text-[10px] text-muted-foreground">Converse sobre suas finanças</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-background/50"
                    onClick={clearChat}
                    title="Nova conversa"
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
                <div className="space-y-5">
                  {/* Welcome */}
                  <div className="text-center space-y-3 py-4">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">Como posso te ajudar?</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
                        Pergunte qualquer coisa sobre suas finanças, peça análises ou registre gastos por texto.
                      </p>
                    </div>
                  </div>

                  {/* Starter suggestions */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Sugestões para começar</p>
                    <div className="space-y-1.5">
                      {STARTER_SUGGESTIONS.map((s) => (
                        <button
                          key={s.text}
                          onClick={() => sendMessage(s.text)}
                          className="w-full flex items-center gap-3 text-left p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/60 transition-all text-sm text-foreground group"
                        >
                          <span className="text-base shrink-0">{s.emoji}</span>
                          <span className="flex-1">{s.text}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
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
                  ))}

                  {/* Follow-up suggestions after assistant response */}
                  {followUpSuggestions.length > 0 && !isLoading && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {followUpSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => sendMessage(suggestion)}
                          className="text-xs px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 p-3 rounded-xl rounded-bl-none flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                    <span className="text-xs text-muted-foreground">Analisando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-3 border-t bg-background/50">
              <form className="relative flex items-end gap-2" onSubmit={handleSubmit}>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  className="min-h-[40px] max-h-[120px] resize-none pr-12 bg-muted/30 border-muted-foreground/20 focus-visible:ring-purple-500 rounded-xl text-sm"
                  placeholder="Digite sua pergunta ou comando..."
                  disabled={isLoading}
                  rows={1}
                />
                {isLoading ? (
                  <Button
                    size="icon"
                    type="button"
                    onClick={cancelRequest}
                    className="absolute right-2 bottom-1.5 h-8 w-8 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    title="Parar"
                  >
                    <Square className="w-3 h-3" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    type="submit"
                    disabled={!input.trim()}
                    className="absolute right-2 bottom-1.5 h-8 w-8 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                )}
              </form>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Shift+Enter para nova linha · Enter para enviar
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
