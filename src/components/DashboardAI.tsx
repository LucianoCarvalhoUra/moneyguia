import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, X, Bot, User, Search, TrendingDown, Calendar, Loader2 } from 'lucide-react';
import { useFinancialData } from '@/hooks/useFinancialData';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

interface AnalysisContext {
  topic: string;
  data: any;
}

export function DashboardAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: 'Olá! Sou seu Consultor Financeiro. Como posso ajudar a otimizar seu orçamento hoje?' }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const { aiContextString, aiConsultantContext } = useFinancialData();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentAnalysisContext, setCurrentAnalysisContext] = useState<AnalysisContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Generate Dynamic Suggestions based on context
  useEffect(() => {
    if (!aiConsultantContext) return;
    const { financialProfile, recurrenceAnalysis, criticalCategories, anomalies } = aiConsultantContext;
    const newSuggestions = [];

    if (financialProfile.totalExpenses > financialProfile.totalIncome) {
      newSuggestions.push('🚨 Por que gastei mais este mês?');
    }
    if (criticalCategories.length > 0) {
      newSuggestions.push(`📉 Reduzir ${criticalCategories[0].category}`);
    }
    if (anomalies.length > 0) {
      newSuggestions.push('🔍 Ver gastos atípicos');
    }
    if (recurrenceAnalysis.totalRecurring > 0) {
      newSuggestions.push('📅 Quais contas vencem logo?');
    }
    // Fallback suggestions
    if (newSuggestions.length < 3) newSuggestions.push('💰 Como economizar?');
    
    setSuggestions(newSuggestions.slice(0, 3));
  }, [aiConsultantContext]);

  const isMandatory = (description: string, category: string) => {
    const mandatoryKeywords = ['aluguel', 'condomínio', 'luz', 'água', 'energia', 'internet', 'ipva', 'iptu', 'escola', 'faculdade', 'plano', 'seguro', 'financiamento', 'habitacao', 'moradia', 'saude', 'transporte', 'educacao', 'mercado'];
    const text = (description + ' ' + category).toLowerCase();
    return mandatoryKeywords.some(k => text.includes(k));
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || input;
    
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsThinking(true);

    // PASSO 3: Regra de Segurança Integrada
    if (textToSend.toLowerCase().includes('exclusão') || textToSend.toLowerCase().includes('excluir perfil')) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: '⚠️ AVISO DE SEGURANÇA: Ao excluir o perfil, todas as informações, incluindo fotos e álbuns, também serão excluídas permanentemente.'
        }]);
        setIsThinking(false);
      }, 500);
      return;
    }

    try {
      const systemMessage = {
        role: 'system',
        content: `Instrução de Sistema: Você é um consultor financeiro.
        Dados atuais: ${JSON.stringify(aiConsultantContext)}
        PERGUNTA DO USUÁRIO: "${textToSend}"
        
        Você tem acesso a uma lista detalhada de transações (detailedBreakdown.topExpenses).
        
        Regras:
        1. Quando o usuário pedir uma lista (ex: "3 maiores gastos", "vilões"), você DEVE obrigatoriamente retornar uma lista numerada contendo o Nome e o Valor de cada item. Não resuma a resposta apenas ao maior item.
        2. Só mencione o saldo bancário se o usuário perguntar especificamente por ele ou se for relevante para uma análise de risco (saldo negativo).
        3. Regra de Segurança Inviolável: Se o tema for exclusão de conta, a resposta deve ser: "Ao excluir o perfil, todas as informações, incluindo fotos e álbuns, também serão excluídas."`
      };

      // Habilitação de Memória (Chat History): Last 5 messages
      const recentHistory = updatedMessages.slice(-5).map(m => ({ role: m.role, content: m.content }));

      // Call Lovable AI Edge Function
      const { data, error } = await supabase.functions.invoke('financial-consultant', {
        body: {
          query: textToSend,
          context: aiConsultantContext,
          history: [systemMessage, ...recentHistory]
        }
      });

      if (error) throw error;

      if (data?.response) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'ai',
          content: data.response
        }]);
        setIsThinking(false);
        return;
      }
    } catch (error) {
      console.log('Edge function not available, falling back to local logic', error);
    }

    // Fallback: Simulação da IA com Persona de Consultor (Local)
    setTimeout(() => {
      let response = '';
      const lowerInput = textToSend.toLowerCase();
      const { financialProfile, recurrenceAnalysis, criticalCategories, detailedBreakdown, variableAnalysis, projections, anomalies } = aiConsultantContext;
      const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

      // Check for context follow-up
      if (currentAnalysisContext && (lowerInput.includes('e agora') || lowerInput.includes('como fazer') || lowerInput.includes('plano'))) {
         if (currentAnalysisContext.topic === 'compensation') {
             const { expense, deficit } = currentAnalysisContext.data;
             response = `Continuando sobre o **${expense.description}**: Como é um gasto obrigatório, o plano é reduzir R$ ${fmt(deficit)} em categorias variáveis. \n\nSugestão prática: Corte 50% dos gastos com **${variableAnalysis.variableExpenses[0]?.category || 'Lazer'}** nas próximas semanas.`;
             setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: response }]);
             setIsThinking(false);
             return;
         }
      }

      // Lógica da Persona (Insight > Ação)
      if (lowerInput.includes('como estou') || lowerInput.includes('analise') || lowerInput.includes('análise') || lowerInput.includes('resumo')) {
        const isCriticalBalance = projections.projectedBalance < 0;
        
        if (isCriticalBalance) {
            const deficit = Math.abs(projections.projectedBalance);
            const topExpense = detailedBreakdown.topExpenses[0];
            const impact = financialProfile.totalIncome > 0 ? (topExpense.amount / financialProfile.totalIncome) * 100 : 0;
            const isTopMandatory = topExpense ? isMandatory(topExpense.description, topExpense.category) : false;
            
            response = `🚨 **Alerta Crítico:** Notei um desequilíbrio este mês. Seu saldo projetado está negativo em ${fmt(deficit)}.\n\n`;
            
            if (topExpense && impact > 10) {
                if (isTopMandatory) {
                    response += `📉 **Diagnóstico:** O gasto obrigatório com "**${topExpense.description}**" (${fmt(topExpense.amount)}) consumiu ${impact.toFixed(1)}% da sua receita, desestabilizando o fluxo.\n\n`;
                    
                    const cutCandidates = variableAnalysis.variableExpenses.slice(0, 2);
                    if (cutCandidates.length > 0) {
                        response += `⚖️ **Estratégia de Compensação:** Como o ${topExpense.description} é indispensável, identifiquei que você pode compensar reduzindo gastos em **${cutCandidates.map(c => c.category).join(' e ')}**.\n\n`;
                    } else {
                        response += `⚖️ **Estratégia:** Precisamos cortar gastos variáveis imediatamente para compensar.\n\n`;
                    }

                    // Projection
                    const monthsToRecover = financialProfile.savingsRate > 0 ? Math.ceil(deficit / (financialProfile.totalIncome * 0.1)) : 3;
                    response += `📅 **Previsão de Caixa:** Com ajustes, o saldo deve se estabilizar em cerca de ${monthsToRecover} meses.`;

                    setCurrentAnalysisContext({ topic: 'compensation', data: { expense: topExpense, deficit } });
                } else {
                    response += `📉 **Contexto:** O gasto com "**${topExpense.description}**" (${fmt(topExpense.amount)}) foi alto e parece ser discricionário.\n\n`;
                    response += `✂️ **Ação:** Considere cortar este tipo de gasto nos próximos meses.`;
                }
            } else {
                response += `🛡️ **Plano de Recuperação:** Corte gastos variáveis imediatamente para cobrir o rombo.`;
            }
        } else {
            response = `✅ **Saúde Financeira:** Seu saldo projetado é positivo (${fmt(projections.projectedBalance)}).\n\n`;
            response += `📊 **Insight:** Suas despesas fixas estão em ${(recurrenceAnalysis.totalRecurring / financialProfile.totalIncome * 100).toFixed(1)}% da receita. `;
            
            if (criticalCategories.length > 0) {
                response += `Porém, a categoria **${criticalCategories[0].category}** está com tendência de alta.\n\n`;
                response += `🎯 **Recomendação:** Monitore esta categoria para não comprometer a economia do próximo mês.`;
            } else {
                response += `Tudo sob controle.\n\n🚀 **Recomendação:** Aproveite o saldo positivo para aportar em sua reserva de emergência.`;
            }
        }

      } else if (lowerInput.includes('cortar') || lowerInput.includes('gastei mais') || lowerInput.includes('por que')) {
        if (criticalCategories.length > 0) {
          const topCrit = criticalCategories[0];
          response = `📉 **Análise de Tendência:** Identifiquei que **${topCrit.category}** está crescendo e superou sua média em ${fmt(topCrit.currentAmount - topCrit.average3Months)}.\n\n`;
          response += `✂️ **Ação Imediata:** Revise os gastos desta categoria. O maior item foi "${detailedBreakdown.topExpenses.find(e => e.category === topCrit.category)?.description || 'diversos'}". Corte excessos aqui.`;
        } else {
          const topVar = variableAnalysis.variableExpenses[0];
          response = `🔍 **Análise:** Seus gastos recorrentes estão estáveis. O aumento vem de despesas variáveis como **${topVar?.category}**.\n\n`;
          response += `💡 **Sugestão:** Tente reduzir o consumo em ${topVar?.category} em 20% na próxima semana para ver resultado imediato.`;
        }

      } else if (lowerInput.includes('reduzir') && lowerInput.includes('categoria')) {
          if (criticalCategories.length > 0) {
              const top = criticalCategories[0];
              response = `📉 **Foco no Problema:** Sua categoria **${top.category}** é a mais crítica no momento (R$ ${fmt(top.currentAmount)}).\n\n`;
              response += `🎯 **Meta:** Estabeleça um teto de ${fmt(top.average3Months)} para o próximo mês e acompanhe semanalmente.`;
          } else {
              response = `📉 **Observação:** Nenhuma categoria apresenta desvio alarmante hoje. Mantenha a disciplina nos gastos variáveis como **${variableAnalysis.variableExpenses[0]?.category}**.`;
          }

      } else if (lowerInput.includes('receita') && lowerInput.includes('cobre')) {
          const fixedRatio = (recurrenceAnalysis.totalRecurring / financialProfile.totalIncome) * 100;
          const covers = financialProfile.totalIncome >= recurrenceAnalysis.totalRecurring;
          
          response = `📅 **Diagnóstico:** ${covers ? 'Sim, sua receita cobre as fixas.' : 'Não, suas contas fixas excedem a receita.'}\n\n`;
          response += `📊 **Dados:** Comprometimento de ${fixedRatio.toFixed(1)}% da renda.\n\n`;
          
          if (fixedRatio > 50) {
              response += `⚠️ **Ação Necessária:** Este índice é alto (Ideal: <50%). Planeje reduzir custos fixos como ${recurrenceAnalysis.recurringExpenses[0]?.description} para ter folga.`;
          } else {
              response += `✅ **Conclusão:** Você tem margem para investir. Priorize a quitação de dívidas ou aportes financeiros.`;
          }

      } else if (lowerInput.includes('vencem') || lowerInput.includes('contas')) {
          const nextBills = recurrenceAnalysis.recurringExpenses.slice(0, 3);
          response = `📅 **Agenda Financeira:** Próximos vencimentos identificados:\n${nextBills.map(b => `- ${b.description}: ${fmt(b.amount)}`).join('\n')}.\n\n`;
          response += `💼 **Recomendação:** Agende esses pagamentos hoje para evitar multas e juros.`;

      } else {
        // Fallback direto com dados
        const topAnomaly = anomalies[0];
        response = `🤖 **Consultoria:** Analisando seu perfil, vejo um saldo de ${fmt(financialProfile.totalBalance)}. `;
        
        if (topAnomaly) {
            response += `Notei um gasto atípico de ${fmt(topAnomaly.amount)} em "${topAnomaly.description}".\n\n`;
            response += `⚠️ **Atenção:** Verifique se isso foi planejado. Se não, ajuste o orçamento das outras categorias para compensar.`;
        } else {
            const top3 = detailedBreakdown.topExpenses.slice(0, 3);
            if (top3.length > 0) {
                 response += `Seus 3 maiores gastos este mês foram:\n`;
                 response += top3.map((e, i) => `${i + 1}. **${e.description}**: ${fmt(e.amount)}`).join('\n');
                 response += `\n\nIsso está dentro do planejado?`;
            } else {
                 response += `Não identifiquei grandes gastos atípicos. Continue monitorando o orçamento.`;
            }
        }
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response
      }]);
      setIsThinking(false);
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
              {isThinking && (
                <div className="flex gap-2 justify-start items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-primary" /></div>
                  <div className="bg-muted p-3 rounded-lg rounded-tl-none flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Analisando suas finanças...</div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                {suggestions.map((suggestion, index) => (
                  <Button key={index} variant="outline" size="sm" className="text-xs whitespace-nowrap h-8" onClick={() => handleSendMessage(undefined, suggestion)}>
                      {suggestion.includes('cortar') || suggestion.includes('gastei') ? <Search className="w-3 h-3 mr-1" /> : 
                       suggestion.includes('Reduzir') ? <TrendingDown className="w-3 h-3 mr-1" /> : 
                       <Calendar className="w-3 h-3 mr-1" />} 
                      {suggestion}
                  </Button>
                ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-background/50">
              <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte sobre suas finanças..." className="flex-1" />
                <Button type="submit" size="icon" disabled={isThinking || !input.trim()}><Send className="w-4 h-4" /></Button>
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