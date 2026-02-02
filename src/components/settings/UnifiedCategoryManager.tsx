import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Trash2, Plus, X, ChevronDown, Pencil, 
  CreditCard, Banknote, Receipt, Wallet, TrendingUp, Gem, Coins,
  Home, Zap, Droplets, Wifi, Phone, ShieldCheck, Key,
  CarFront, Fuel, Bus, Truck, Plane,
  UserRound, Heart, Stethoscope, Pill, Dumbbell, Sparkles, Baby, PawPrint,
  GraduationCap, School, Briefcase, Laptop,
  ShoppingBasket, Utensils, Coffee, Gift, Shirt, Tv, Gamepad2, Camera, Music
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Icon configuration with groups
const ICON_GROUPS = [
  {
    label: 'Financeiro',
    icons: [
      { name: 'CreditCard', icon: CreditCard, color: 'indigo', label: 'Crédito' },
      { name: 'Banknote', icon: Banknote, color: 'emerald', label: 'Dinheiro' },
      { name: 'Wallet', icon: Wallet, color: 'green', label: 'Carteira' },
      { name: 'Receipt', icon: Receipt, color: 'slate', label: 'Comprovante' },
      { name: 'TrendingUp', icon: TrendingUp, color: 'blue', label: 'Investimento' },
      { name: 'Gem', icon: Gem, color: 'purple', label: 'Renda Extra' },
      { name: 'Coins', icon: Coins, color: 'amber', label: 'Diversos' },
    ]
  },
  {
    label: 'Casa & Serviços',
    icons: [
      { name: 'Home', icon: Home, color: 'blue', label: 'Casa' },
      { name: 'Zap', icon: Zap, color: 'amber', label: 'Energia' },
      { name: 'Droplets', icon: Droplets, color: 'cyan', label: 'Água' },
      { name: 'Trash2', icon: Trash2, color: 'gray', label: 'Lixo' },
      { name: 'Wifi', icon: Wifi, color: 'sky', label: 'Internet' },
      { name: 'Phone', icon: Phone, color: 'indigo', label: 'Celular' },
      { name: 'ShieldCheck', icon: ShieldCheck, color: 'emerald', label: 'Seguros' },
      { name: 'Key', icon: Key, color: 'amber', label: 'Aluguel' },
    ]
  },
  {
    label: 'Transporte',
    icons: [
      { name: 'CarFront', icon: CarFront, color: 'slate', label: 'Carro' },
      { name: 'Fuel', icon: Fuel, color: 'orange', label: 'Combustível' },
      { name: 'Bus', icon: Bus, color: 'blue', label: 'Ônibus' },
      { name: 'Truck', icon: Truck, color: 'slate', label: 'Entregas' },
      { name: 'Plane', icon: Plane, color: 'teal', label: 'Viagem' },
    ]
  },
  {
    label: 'Pessoal & Saúde',
    icons: [
      { name: 'UserRound', icon: UserRound, color: 'cyan', label: 'Pessoal' },
      { name: 'Heart', icon: Heart, color: 'rose', label: 'Saúde' },
      { name: 'Stethoscope', icon: Stethoscope, color: 'red', label: 'Médico' },
      { name: 'Pill', icon: Pill, color: 'pink', label: 'Farmácia' },
      { name: 'Dumbbell', icon: Dumbbell, color: 'rose', label: 'Treino' },
      { name: 'Sparkles', icon: Sparkles, color: 'purple', label: 'Beleza' },
      { name: 'Baby', icon: Baby, color: 'pink', label: 'Filhos' },
      { name: 'PawPrint', icon: PawPrint, color: 'amber', label: 'Pets' },
    ]
  },
  {
    label: 'Educação & Trabalho',
    icons: [
      { name: 'GraduationCap', icon: GraduationCap, color: 'blue', label: 'Estudos' },
      { name: 'School', icon: School, color: 'indigo', label: 'Escola' },
      { name: 'Briefcase', icon: Briefcase, color: 'slate', label: 'Trabalho' },
      { name: 'Laptop', icon: Laptop, color: 'zinc', label: 'Tecnologia' },
    ]
  },
  {
    label: 'Lazer & Compras',
    icons: [
      { name: 'ShoppingBasket', icon: ShoppingBasket, color: 'emerald', label: 'Mercado' },
      { name: 'Utensils', icon: Utensils, color: 'orange', label: 'Comida' },
      { name: 'Coffee', icon: Coffee, color: 'brown', label: 'Café' },
      { name: 'Gift', icon: Gift, color: 'red', label: 'Presentes' },
      { name: 'Shirt', icon: Shirt, color: 'violet', label: 'Roupas' },
      { name: 'Tv', icon: Tv, color: 'sky', label: 'Streaming' },
      { name: 'Gamepad2', icon: Gamepad2, color: 'violet', label: 'Games' },
      { name: 'Camera', icon: Camera, color: 'pink', label: 'Hobby' },
      { name: 'Music', icon: Music, color: 'fuchsia', label: 'Música' },
    ]
  }
];

const ICONS = ICON_GROUPS.flatMap(group => group.icons);

export default function UnifiedCategoryManager() {
  const { categories, subcategories, addCategory, updateCategory, removeCategory, addSubcategory, removeSubcategory } = useFinance();
  const { incomeCategories, incomeSubcategories, addIncomeCategory, updateIncomeCategory, removeIncomeCategory, addIncomeSubcategory, removeIncomeSubcategory } = useIncome();

  // Create Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [icon, setIcon] = useState('CreditCard');
  const [color, setColor] = useState('indigo');
  const [isIconOpen, setIsIconOpen] = useState(false);

  // Management State
  const [subcatInputs, setSubcatInputs] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string, name: string, icon: string, color: string, type: 'expense' | 'income' } | null>(null);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

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

  const handleOpenEdit = (cat: any, type: 'expense' | 'income') => {
    setEditingCategory({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type
    });
    setEditDialogOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name) return;

    try {
      if (editingCategory.type === 'expense') {
        await updateCategory(editingCategory.id, {
          name: editingCategory.name,
          icon: editingCategory.icon,
          color: editingCategory.color
        });
      } else {
        await updateIncomeCategory(editingCategory.id, {
          name: editingCategory.name,
          icon: editingCategory.icon,
          color: editingCategory.color
        });
      }
      toast.success('Categoria atualizada');
      setEditDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao atualizar categoria');
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

  const editingIconObj = editingCategory ? (ICONS.find(i => i.name === editingCategory.icon) || ICONS[0]) : ICONS[0];
  const EditingIcon = editingIconObj.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Categorias</CardTitle>
        <CardDescription>Crie e gerencie suas categorias de receitas e despesas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg bg-muted/5">
          <div className="space-y-2">
            <Label>Nome da Categoria</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alimentação" />
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
              <PopoverContent className="w-[340px] p-0 max-h-[400px] overflow-y-auto" align="start">
                <div className="p-4 space-y-4">
                  {ICON_GROUPS.map((group) => (
                    <div key={group.label}>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">{group.label}</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {group.icons.map(({ name: iconName, icon: Icon, color: iconColor, label }) => (
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
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
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

          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Categoria
          </Button>
        </form>

        {/* Lists */}
        <div className="space-y-8 mt-6">
          {['expense', 'income'].map((sectionType) => (
            <div key={sectionType} className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1 border-b pb-2">
                {sectionType === 'expense' ? 'Despesas' : 'Receitas'}
              </h3>
              {/* 2. Layout de 3 Colunas (CSS Inline) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {(sectionType === 'expense' ? categories : incomeCategories).map(cat => {
                  const catSubcategories = sectionType === 'expense' 
                    ? subcategories.filter(s => s.categoryId === cat.id)
                    : incomeSubcategories.filter(s => s.categoryId === cat.id);
                  const isExpanded = expandedCategories.includes(cat.id);

                  return (
                    <Collapsible 
                      key={cat.id} 
                      open={isExpanded} 
                      onOpenChange={() => toggleCategory(cat.id)}
                      className={cn(
                        "border rounded-lg bg-card transition-all duration-200",
                        isExpanded ? "shadow-md ring-1 ring-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between p-3">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
                            <div className={cn("w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center", `bg-${cat.color}/10`)}>
                              <CategoryIcon iconName={cat.icon} className={cn("w-5 h-5", `text-${cat.color}`)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium block truncate text-sm">{cat.name}</span>
                              <span className="text-xs text-muted-foreground">{catSubcategories.length} sub</span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0", isExpanded && "rotate-180")} />
                          </div>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent>
                        <div className="p-3 pt-0 space-y-3 border-t bg-muted/10">
                          {/* Actions */}
                          <div className="flex justify-end gap-2 pt-3">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenEdit(cat, sectionType as 'expense' | 'income')}>
                              <Pencil className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleDelete(cat.id, sectionType as 'expense' | 'income')}>
                              <Trash2 className="w-3 h-3 mr-1" />
                              Excluir
                            </Button>
                          </div>

                          {/* Subcategories Section */}
                          <div className="space-y-2">
                            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Subcategorias</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {catSubcategories.length === 0 && (
                                <span className="text-xs text-muted-foreground italic">Vazio</span>
                              )}
                              {catSubcategories.map(sub => (
                                <Badge key={sub.id} variant="secondary" className="gap-1 pr-1 hover:bg-secondary/80 text-xs">
                                  {sub.name}
                                  <div 
                                    className="cursor-pointer hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                                    onClick={() => handleRemoveSubcategory(sub.id, sectionType as 'expense' | 'income')}
                                  >
                                    <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                  </div>
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Input 
                                placeholder="Nova sub..." 
                                className="h-7 text-xs"
                                value={subcatInputs[cat.id] || ''}
                                onChange={(e) => setSubcatInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSubcategory(cat.id, sectionType as 'expense' | 'income');
                                  }
                                }}
                              />
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 w-7 p-0"
                                onClick={() => handleAddSubcategory(cat.id, sectionType as 'expense' | 'income')}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input 
                  value={editingCategory.name} 
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Ícone e Cor</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-auto py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", `bg-${editingCategory.color}-500/15`)}>
                          <EditingIcon className={cn("w-4 h-4", `text-${editingCategory.color}-500`)} />
                        </div>
                        <div className="text-left">
                          <span className="block font-medium">{editingIconObj.label}</span>
                          <span className="text-xs text-muted-foreground">Toque para alterar</span>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-0 max-h-[400px] overflow-y-auto" align="start">
                    <div className="p-4 space-y-4">
                      {ICON_GROUPS.map((group) => (
                        <div key={group.label}>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">{group.label}</h4>
                          <div className="grid grid-cols-5 gap-2">
                            {group.icons.map(({ name: iconName, icon: Icon, color: iconColor, label }) => (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => {
                                  setEditingCategory({ ...editingCategory, icon: iconName, color: iconColor });
                                }}
                                className={cn(
                                  "flex items-center justify-center w-10 h-10 rounded-full transition-all relative",
                                  `bg-${iconColor}-500/15 hover:bg-${iconColor}-500/25`,
                                  editingCategory.icon === iconName ? `ring-2 ring-${iconColor}-500 ring-offset-2` : ""
                                )}
                                title={label}
                              >
                                <Icon className={cn("w-5 h-5", `text-${iconColor}-500`)} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateCategory}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}