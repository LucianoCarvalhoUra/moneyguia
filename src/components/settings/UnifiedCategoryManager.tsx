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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, Plus, X, ChevronDown,
  CreditCard, Banknote, Receipt, Wallet, 
  Home, Zap, Droplets, 
  CarFront, Fuel, Bus, 
  Stethoscope, Dumbbell, Pill, 
  ShoppingBag, Utensils, Plane, Gift, Gamepad, Dog, Wifi 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Icon configuration with specific colors
const ICONS = [
  { name: 'CreditCard', icon: CreditCard, color: 'indigo', label: 'Crédito' },
  { name: 'Banknote', icon: Banknote, color: 'emerald', label: 'Dinheiro' },
  { name: 'Receipt', icon: Receipt, color: 'slate', label: 'Comprovante' },
  { name: 'Wallet', icon: Wallet, color: 'green', label: 'Carteira' },
  { name: 'Home', icon: Home, color: 'blue', label: 'Casa' },
  { name: 'Zap', icon: Zap, color: 'amber', label: 'Energia' },
  { name: 'Droplets', icon: Droplets, color: 'cyan', label: 'Água' },
  { name: 'Trash2', icon: Trash2, color: 'gray', label: 'Lixo' },
  { name: 'CarFront', icon: CarFront, color: 'slate', label: 'Carro' },
  { name: 'Fuel', icon: Fuel, color: 'orange', label: 'Combustível' },
  { name: 'Bus', icon: Bus, color: 'blue', label: 'Ônibus' },
  { name: 'Stethoscope', icon: Stethoscope, color: 'red', label: 'Saúde' },
  { name: 'Dumbbell', icon: Dumbbell, color: 'rose', label: 'Treino' },
  { name: 'Pill', icon: Pill, color: 'pink', label: 'Farmácia' },
  { name: 'ShoppingBag', icon: ShoppingBag, color: 'purple', label: 'Compras' },
  { name: 'Utensils', icon: Utensils, color: 'orange', label: 'Comida' },
  { name: 'Plane', icon: Plane, color: 'teal', label: 'Viagem' },
  { name: 'Gift', icon: Gift, color: 'red', label: 'Presente' },
  { name: 'Gamepad', icon: Gamepad, color: 'violet', label: 'Jogos' },
  { name: 'Dog', icon: Dog, color: 'amber', label: 'Pet' },
  { name: 'Wifi', icon: Wifi, color: 'sky', label: 'Internet' },
];

export default function UnifiedCategoryManager() {
  const { categories, subcategories, addCategory, removeCategory, addSubcategory, removeSubcategory } = useFinance();
  const { incomeCategories, incomeSubcategories, addIncomeCategory, removeIncomeCategory, addIncomeSubcategory, removeIncomeSubcategory } = useIncome();

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [icon, setIcon] = useState('CreditCard');
  const [color, setColor] = useState('indigo');
  const [subcatInputs, setSubcatInputs] = useState<Record<string, string>>({});
  const [isIconOpen, setIsIconOpen] = useState(false);

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

  const handleAddSubcategory = async (categoryId: string, type: 'expense' | 'income') => {
    const subName = subcatInputs[categoryId];
    if (!subName?.trim()) return;

    try {
      if (type === 'expense') {
        await addSubcategory({ name: subName, categoryId });
      } else {
        await addIncomeSubcategory({ name: subName, categoryId });
      }
      toast.success('Subcategoria adicionada');
      setSubcatInputs(prev => ({ ...prev, [categoryId]: '' }));
    } catch (error) {
      toast.error('Erro ao adicionar subcategoria');
    }
  };

  const handleRemoveSubcategory = async (id: string, type: 'expense' | 'income') => {
    if (type === 'expense') {
      await removeSubcategory(id);
    } else {
      await removeIncomeSubcategory(id);
    }
    toast.success('Subcategoria removida');
  };

  const selectedIconObj = ICONS.find(i => i.name === icon) || ICONS[0];
  const SelectedIcon = selectedIconObj.icon;

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
            <Popover open={isIconOpen} onOpenChange={setIsIconOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", `bg-${color}-500/15`)}>
                      <SelectedIcon className={cn("w-4 h-4", `text-${color}-500`)} />
                    </div>
                    <div className="text-left">
                      <span className="block font-medium">{selectedIconObj.label}</span>
                      <span className="text-xs text-muted-foreground">Toque para alterar</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-4" align="start">
                <div className="grid grid-cols-5 gap-2">
                  {ICONS.map(({ name: iconName, icon: Icon, color: iconColor, label }) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => {
                        setIcon(iconName);
                        setColor(iconColor);
                        setIsIconOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full transition-all relative",
                        `bg-${iconColor}-500/15 hover:bg-${iconColor}-500/25`,
                        icon === iconName ? `ring-2 ring-${iconColor}-500 ring-offset-2` : ""
                      )}
                      title={label}
                    >
                      <Icon className={cn("w-5 h-5", `text-${iconColor}-500`)} />
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
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
              {(tabType === 'expense' ? categories : incomeCategories).map(cat => {
                const catSubcategories = tabType === 'expense' 
                  ? subcategories.filter(s => s.categoryId === cat.id)
                  : incomeSubcategories.filter(s => s.categoryId === cat.id);

                return (
                  <div key={cat.id} className="border rounded-lg p-4 bg-card space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", `bg-${cat.color}/10`)}>
                          <CategoryIcon iconName={cat.icon} className={cn("w-5 h-5", `text-${cat.color}`)} />
                        </div>
                        <div>
                          <span className="font-medium block">{cat.name}</span>
                          <span className="text-xs text-muted-foreground">{catSubcategories.length} subcategorias</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id, tabType as 'expense' | 'income')}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Subcategories Section */}
                    <div className="space-y-2 pl-2 border-l-2 border-muted ml-4">
                      <div className="flex flex-wrap gap-2">
                        {catSubcategories.map(sub => (
                          <Badge key={sub.id} variant="secondary" className="gap-1 pr-1 hover:bg-secondary/80">
                            {sub.name}
                            <div 
                              className="cursor-pointer hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                              onClick={() => handleRemoveSubcategory(sub.id, tabType as 'expense' | 'income')}
                            >
                              <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                            </div>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 max-w-sm">
                        <Input 
                          placeholder="Nova subcategoria..." 
                          className="h-8 text-sm"
                          value={subcatInputs[cat.id] || ''}
                          onChange={(e) => setSubcatInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubcategory(cat.id, tabType as 'expense' | 'income');
                            }
                          }}
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleAddSubcategory(cat.id, tabType as 'expense' | 'income')}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}