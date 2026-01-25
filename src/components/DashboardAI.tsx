import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, X, Bot, User } from 'lucide-react';
import { useFinancialAnalysis } from '@/hooks/useFinancialAnalysis';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export function DashboardAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: 'Olá! Sou seu assistente financeiro. Como posso ajudar hoje?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const analysis = useFinancialAnalysis();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // PASSO 3: Regra de Segurança Integrada
    if (userMessage.content.toLowerCase().includes('exclusão')) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: 'Ao excluir o perfil, todas as informações, incluindo fotos e álbuns, também serão excluídas.'
        }]);
        setIsLoading(false);
      }, 500);
      return;
    }

    // Simulação de resposta da IA com contexto financeiro (Passo 1)
    setTimeout(() => {
      let response = '';
      const lowerInput = userMessage.content.toLowerCase();

      if (lowerInput.includes('saldo')) {
        response = `Seu saldo atual é de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(analysis.balance)}.`;
      } else if (lowerInput.includes('gasto') || lowerInput.includes('despesa')) {
        response = `Você gastou um total de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(analysis.totalExpenses)}. Sua maior categoria de gastos é ${analysis.topCategory}.`;
      } else if (lowerInput.includes('receita') || lowerInput.includes('ganho')) {
        response = `Suas receitas totais somam ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(analysis.totalIncomes)}.`;
      } else if (lowerInput.includes('pendente') || lowerInput.includes('conta')) {
        response = `Você tem ${analysis.pendingBillsCount} contas pendentes.`;
      } else {
        response = 'Posso ajudar com informações sobre seu saldo, gastos, receitas ou contas pendentes.';
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response
      }]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white transition-transform hover:scale-105"
          >
            <Sparkles className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0 mr-4 mb-2 border-none shadow-2xl" side="top" align="end">
          <div className="flex flex-col h-[500px] bg-background rounded-lg border overflow-hidden">
            {/* Cabeçalho */}
            <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">KeepMoney AI</span>
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
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><User className="w-4 h-4" /></div>}
                </div>
              ))}
              {isLoading && <div className="flex gap-2 justify-start"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-primary" /></div><div className="bg-muted p-3 rounded-lg rounded-tl-none"><span className="animate-pulse">...</span></div></div>}
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-background">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte sobre suas finanças..." className="flex-1" />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}><Send className="w-4 h-4" /></Button>
              </form>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}