import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { Sparkles, X, Send } from 'lucide-react';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { Input } from '@/components/ui/input';

export function DashboardAI() {
  const [isOpen, setIsOpen] = useState(false);
  const summary = useFinancialSummary();

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
        <PopoverContent className="w-80 sm:w-96 p-0 mr-4 mb-2 shadow-2xl border-purple-100 dark:border-purple-900" side="top" align="end">
          <div className="flex flex-col h-[500px] max-h-[80vh] bg-background/95 backdrop-blur-sm">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 flex items-center justify-between rounded-t-lg">
              <div className="flex items-center gap-2">
                <div className="bg-purple-100 dark:bg-purple-900/50 p-1.5 rounded-md">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistente IA</h3>
                  <p className="text-[10px] text-muted-foreground">KeepMoney Intelligence</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg rounded-tl-none text-sm">
                Olá! Analisei suas finanças. Aqui está um resumo rápido:
              </div>

              {/* Insights Cards */}
              <div className="grid gap-3">
                <Card className="p-3 border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-900/10">
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Saldo Atual</h4>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.balance)}
                  </p>
                </Card>

                {summary.upcomingBills.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Próximos Vencimentos
                    </h4>
                    <div className="space-y-2">
                      {summary.upcomingBills.slice(0, 2).map(bill => (
                        <div key={bill.id} className="flex justify-between items-center text-sm p-2.5 bg-card border rounded-md shadow-sm">
                          <span className="truncate max-w-[120px]">{bill.description}</span>
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-red-500">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(bill.dueDate).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Input Area */}
            <div className="p-3 border-t bg-background/50">
               <form className="relative flex items-center gap-2" onSubmit={(e) => e.preventDefault()}>
                  <Input 
                    className="pr-10 bg-muted/30 border-muted-foreground/20 focus-visible:ring-purple-500"
                    placeholder="Pergunte sobre seus gastos..."
                  />
                  <Button size="icon" type="submit" className="absolute right-1 h-8 w-8 bg-purple-600 hover:bg-purple-700 text-white rounded-md">
                    <Send className="w-3 h-3" />
                  </Button>
               </form>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}