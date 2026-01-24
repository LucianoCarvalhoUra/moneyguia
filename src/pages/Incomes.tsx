import { useState, useEffect } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

export default function Incomes() {
  const { incomes } = useIncome();
  
  // Estados básicos para satisfazer o TypeScript
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');

  // Lógica simplificada (Placeholders)
  const filteredIncomes = incomes || [];
  const sortedIncomes = filteredIncomes;

  // Regra de Ouro: Session Timeout (15 min)
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        window.location.href = '/auth';
      }, 15 * 60 * 1000); // 15 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie seus ganhos</p>
        </div>
        <Button className="bg-primary text-primary-foreground shadow hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Nova Receita
        </Button>
      </div>

      {/* Barra de Filtros Simplificada */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="received">Recebido</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista Simplificada */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Visualização simplificada de Receitas</p>
            <p className="text-sm mt-2">{sortedIncomes.length} registros encontrados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}