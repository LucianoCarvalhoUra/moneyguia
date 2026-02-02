import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Trash2, Plus, CreditCard, Zap, CarFront, Home, Heart, Users, ShoppingBag, Utensils, Stethoscope, GraduationCap, Plane, Banknote, Dumbbell, Gamepad, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Icon configuration with specific colors
const ICONS = [
  { name: 'CreditCard', icon: CreditCard, color: 'indigo', label: 'Crédito' },
  { name: 'Zap', icon: Zap, color: 'amber', label: 'Contas' },
  { name: 'CarFront', icon: CarFront, color: 'slate', label: 'Transporte' },
  { name: 'Home', icon: Home, color: 'blue', label: 'Moradia' },
  { name: 'Heart', icon: Heart, color: 'pink', label: 'Saúde' },
  { name: 'Users', icon: Users, color: 'cyan', label: 'Pessoal' },
  { name: 'ShoppingBag', icon: ShoppingBag, color: 'purple', label: 'Compras' },
  { name: 'Utensils', icon: Utensils, color: 'orange', label: 'Alimentação' },
  { name: 'Stethoscope', icon: Stethoscope, color: 'red', label: 'Médico' },
  { name: 'GraduationCap', icon: GraduationCap, color: 'blue', label: 'Educação' },
  { name: 'Plane', icon: Plane, color: 'teal', label: 'Viagem' },
  { name: 'Banknote', icon: Banknote, color: 'emerald', label: 'Dinheiro' },
  { name: 'Dumbbell', icon: Dumbbell, color: 'rose', label: 'Lazer' },
  { name: 'Gamepad', icon: Gamepad, color: 'violet', label: 'Jogos' },
  { name: 'Coffee', icon: Coffee, color: 'brown', label: 'Outros' },
];

export default function UnifiedCategoryManager() {
  const { categories, addCategory, removeCategory } = useFinance();
  const { incomeCategories, addIncomeCategory, removeIncomeCategory } = useIncome();

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [icon, setIcon] = useState('CreditCard');
  const [color, setColor] = useState('indigo');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    try {
      if (type === 'expense') {
        await addCategory({ name, icon, color });
      } else {
        await addIncomeCategory({ name, icon, color });
      }
      toast.success('Categoria criada com sucesso!');
      setName('');
      setIcon('CreditCard');
      setColor('indigo');
    } catch (error) {
      toast.error('Erro ao criar categoria');
    }
  };

  const handleDelete = async (id: string, type: 'expense' | 'income') => {
    try {
      if (type === 'expense') {
        await removeCategory(id);
      } else {
        await removeIncomeCategory(id);
      }
      toast.success('Categoria removida');
    } catch (error) {
      toast.error('Erro ao remover categoria');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Categorias</CardTitle>
        <CardDescription>Crie e gerencie suas categorias de receitas e despesas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg bg-muted/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alimentação" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v: 'expense' | 'income') => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone e Cor</Label>
            <div className="grid grid-cols-5 gap-4 p-4 border rounded-lg bg-muted/10">
              {ICONS.map(({ name: iconName, icon: Icon, color: iconColor }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => {
                    setIcon(iconName);
                    setColor(iconColor);
                  }}
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full transition-all relative group",
                    `bg-${iconColor}-500/15 hover:bg-${iconColor}-500/25`,
                    icon === iconName ? `ring-2 ring-${iconColor}-500 ring-offset-2` : "hover:scale-110"
                  )}
                  title={iconName}
                >
                  <Icon className={cn("w-6 h-6 transition-colors", `text-${iconColor}-500`)} />
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Criar Categoria
          </Button>
        </form>

        {/* Lists */}
        <Tabs defaultValue="expense">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">Despesas</TabsTrigger>
            <TabsTrigger value="income">Receitas</TabsTrigger>
          </TabsList>
          
          {['expense', 'income'].map((tabType) => (
            <TabsContent key={tabType} value={tabType} className="space-y-2 mt-4">
              {(tabType === 'expense' ? categories : incomeCategories).map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", `bg-${cat.color}/10`)}>
                      <CategoryIcon iconName={cat.icon} className={cn("w-4 h-4", `text-${cat.color}`)} />
                    </div>
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id, tabType as 'expense' | 'income')}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}