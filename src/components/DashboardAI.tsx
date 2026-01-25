import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, X, Bot, User } from 'lucide-react';
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
    { id: '1', role: 'ai', content: 'Olá! Sou seu assistente financeiro. Como posso ajudar hoje?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { aiContextString } = useFinancialData();
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
    if (userMessage.content.toLowerCase().includes('exclusão') || userMessage.content.toLowerCase().includes('excluir perfil')) {
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

      if (lowerInput.includes('resumo') || lowerInput.includes('geral') || lowerInput.includes('saldo')) {
        response = aiContextString;
      } else {
        // Simple fallback using context data if available
        response = `Com base nos seus dados: ${aiContextString.split('\n')[1] || ''}. Posso ajudar com mais detalhes sobre suas finanças.`;
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
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[9999] w-[320px] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="flex flex-col h-[500px] border-primary/20 overflow-hidden">
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