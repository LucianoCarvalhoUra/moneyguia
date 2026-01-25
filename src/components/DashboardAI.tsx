import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, X, Bot, User, Search, TrendingDown, Calendar } from 'lucide-react';
import { useFinancialData } from '@/hooks/useFinancialData';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export function DashboardAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: 'Olá! Sou seu Consultor Financeiro. Como posso ajudar a otimizar seu orçamento hoje?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { aiContextString, aiConsultantContext } = useFinancialData();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || input;
    
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // PASSO 3: Regra de Segurança Integrada
    if (textToSend.toLowerCase().includes('exclusão') || textToSend.toLowerCase().includes('excluir perfil')) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: '⚠️ AVISO DE SEGURANÇA: Ao excluir o perfil, todas as informações, incluindo fotos e álbuns, também serão excluídas permanentemente.'
        }]);
        setIsLoading(false);
      }, 500);
      return;
    }

    // Simulação da IA com Persona de Consultor
    setTimeout(() => {
      let response = '';
      const lowerInput = textToSend.toLowerCase();
      const { financialProfile, recurrenceAnalysis, criticalCategories } = aiConsultantContext;

      // Lógica da Persona (50/30/20 e Análise)
      if (lowerInput.includes('como estou') || lowerInput.includes('analise') || lowerInput.includes('análise')) {
        const fixedCostsRatio = (recurrenceAnalysis.totalRecurring / financialProfile.totalIncome) * 100;
        response = `Analisando seu perfil: Suas despesas fixas consomem ${fixedCostsRatio.toFixed(1)}% da sua receita. `;
        
        if (fixedCostsRatio > 50) {
          response += `🚨 Atenção: Isso está acima do ideal de 50%. Sugiro revisar: ${recurrenceAnalysis.recurringExpenses.slice(0, 2).map(e => e.description).join(', ')}. `;
        } else {
          response += `✅ Ótimo! Você está dentro da regra 50/30/20 para gastos fixos. `;
        }
        
        // Comparação Lazer vs Educação (se houver dados)
        // (Simplificado pois não temos categorias hardcoded garantidas, mas a lógica seria aqui)
        response += `\n\nSeu saldo projetado para o fim do mês é R$ ${aiConsultantContext.projections.projectedBalance.toFixed(2)}.`;

      } else if (lowerInput.includes('cortar gastos') || lowerInput.includes('onde posso cortar')) {
        if (criticalCategories.length > 0) {
          response = `🔍 Identifiquei tendências de alta em: ${criticalCategories.map(c => `${c.category} (R$ ${c.currentAmount.toFixed(2)})`).join(', ')}. Estas categorias estão gastando mais que a sua média dos últimos 3 meses. Tente reduzir aqui primeiro.`;
        } else {
          response = `🔍 Seus gastos estão estáveis em relação à média. Para economizar mais, olhe para suas despesas recorrentes: ${recurrenceAnalysis.recurringExpenses.map(e => e.description).join(', ')}.`;
        }

      } else if (lowerInput.includes('reduzir') && lowerInput.includes('categoria')) {
         if (criticalCategories.length > 0) {
             const top = criticalCategories[0];
             response = `📉 Sua categoria mais crítica é **${top.category}**. Você gastou R$ ${top.currentAmount.toFixed(2)}, o que é acima da sua média de R$ ${top.average3Months.toFixed(2)}. Defina um teto de gastos semanal para ela.`;
         } else {
             response = "📉 No momento, nenhuma categoria apresenta um aumento alarmante em relação à sua média histórica.";
         }

      } else if (lowerInput.includes('receita') && lowerInput.includes('cobre')) {
          const covers = financialProfile.totalIncome >= recurrenceAnalysis.totalRecurring;
          response = `📅 ${covers ? 'Sim, cobre com folga.' : 'Não, estamos no vermelho.'} Sua receita é R$ ${financialProfile.totalIncome.toFixed(2)} e suas contas fixas somam R$ ${recurrenceAnalysis.totalRecurring.toFixed(2)}. Sobram R$ ${(financialProfile.totalIncome - recurrenceAnalysis.totalRecurring).toFixed(2)} para gastos variáveis e investimentos.`;

      } else {
        // Fallback genérico com contexto
        response = `Como Consultor Financeiro, vejo que seu saldo atual é R$ ${financialProfile.totalBalance.toFixed(2)}. Posso analisar seus gastos fixos, categorias críticas ou projetar seu fechamento de mês. O que prefere?`;
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response
      }]);
      setIsLoading(false);
    }, 1200);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[9999] w-[340px] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="flex flex-col h-[600px] border-primary/20 overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Cabeçalho */}
            <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <div>
                  <span className="font-semibold block text-sm">KeepMoney AI</span>
                  <span className="text-[10px] opacity-90 font-light">Consultor Financeiro</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Área de Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-primary" /></div>}
                  <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none shadow-sm'}`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><User className="w-4 h-4" /></div>}
                </div>
              ))}
              {isLoading && <div className="flex gap-2 justify-start"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-primary" /></div><div className="bg-muted p-3 rounded-lg rounded-tl-none"><span className="animate-pulse">Digitando...</span></div></div>}
            </div>

            {/* Quick Actions */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                <Button variant="outline" size="sm" className="text-xs whitespace-nowrap h-8" onClick={() => handleSendMessage(undefined, '🔍 Onde posso cortar gastos este mês?')}>
                    <Search className="w-3 h-3 mr-1" /> Cortar Gastos
                </Button>
                <Button variant="outline" size="sm" className="text-xs whitespace-nowrap h-8" onClick={() => handleSendMessage(undefined, '📉 Como reduzir minha categoria mais cara?')}>
                    <TrendingDown className="w-3 h-3 mr-1" /> Reduzir Top 1
                </Button>
                <Button variant="outline" size="sm" className="text-xs whitespace-nowrap h-8" onClick={() => handleSendMessage(undefined, '📅 Minha receita cobre minhas contas fixas?')}>
                    <Calendar className="w-3 h-3 mr-1" /> Contas Fixas
                </Button>
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-background/50">
              <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte sobre suas finanças..." className="flex-1" />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}><Send className="w-4 h-4" /></Button>
              </form>
            </div>
          </Card>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white transition-transform hover:scale-105 active:scale-95"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </Button>
      </div>
    </>
  );
}