import { useState, useMemo } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Trash2, Plus, X, ChevronDown, Pencil, Search,
  CreditCard, Banknote, Receipt, Wallet, TrendingUp, Gem, Coins,
  Home, Zap, Droplets, Wifi, Phone, ShieldCheck, Key,
  CarFront, Fuel, Bus, Truck, Plane,
  UserRound, Heart, Stethoscope, Pill, Dumbbell, Sparkles, Baby, PawPrint,
  GraduationCap, School, Briefcase, Laptop,
  ShoppingBasket, Utensils, Coffee, Gift, Shirt, Tv, Gamepad2, Camera, Music,
  Brain, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const CLASSIFICATION_LABELS: Record<string, { label: string; color: string }> = {
  essencial: { label: 'Essencial', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  superfluo: { label: 'Supérfluo', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  longo_prazo: { label: 'Longo Prazo', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
};

const RECURRENCE_LABELS: Record<string, { label: string; color: string }> = {
  fixa: { label: 'Fixa', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  variavel: { label: 'Variável', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
};

export default function UnifiedCategoryManager() {
  const { categories, subcategories, addCategory, updateCategory, removeCategory, addSubcategory, removeSubcategory } = useFinance();
  const { incomeCategories, incomeSubcategories, addIncomeCategory, updateIncomeCategory, removeIncomeCategory, addIncomeSubcategory, removeIncomeSubcategory } = useIncome();

  // Create Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [icon, setIcon] = useState('CreditCard');
  const [color, setColor] = useState('indigo');
  const [isIconOpen, setIsIconOpen] = useState(false);
  
  // AI Classification State
  const [classification, setClassification] = useState<'essencial' | 'superfluo' | 'longo_prazo'>('essencial');
  const [recurrence, setRecurrence] = useState<'fixa' | 'variavel'>('fixa');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string; type: 'expense' | 'income' } | null>(null);

  // AI Suggestion Logic - also suggests icon based on name
  const suggestFromName = (inputName: string) => {
    const lower = inputName.toLowerCase().trim();
    if (!lower) return;

    // Icon + color suggestion map
    const iconMap: Array<{ pattern: RegExp; icon: string; color: string }> = [
      { pattern: /aluguel|moradia|casa|apartamento/, icon: 'Home', color: 'blue' },
      { pattern: /luz|energia|eletric/, icon: 'Zap', color: 'amber' },
      { pattern: /agua|água/, icon: 'Droplets', color: 'cyan' },
      { pattern: /internet|wifi/, icon: 'Wifi', color: 'sky' },
      { pattern: /celular|telefone|phone/, icon: 'Phone', color: 'indigo' },
      { pattern: /seguro|proteção/, icon: 'ShieldCheck', color: 'emerald' },
      { pattern: /carro|veículo|veiculo|estacion/, icon: 'CarFront', color: 'slate' },
      { pattern: /combustível|combustivel|gasolina|etanol/, icon: 'Fuel', color: 'orange' },
      { pattern: /ônibus|onibus|metro|metrô|transporte/, icon: 'Bus', color: 'blue' },
      { pattern: /viagem|passagem|avião|aviao/, icon: 'Plane', color: 'teal' },
      { pattern: /saúde|saude|médico|medico|hospital|consulta/, icon: 'Stethoscope', color: 'red' },
      { pattern: /farmácia|farmacia|remédio|remedio/, icon: 'Pill', color: 'pink' },
      { pattern: /academia|treino|gym/, icon: 'Dumbbell', color: 'rose' },
      { pattern: /beleza|estética|estetica|salão|salao/, icon: 'Sparkles', color: 'purple' },
      { pattern: /filho|filha|criança|crianca|beb[êe]/, icon: 'Baby', color: 'pink' },
      { pattern: /pet|animal|cachorro|gato/, icon: 'PawPrint', color: 'amber' },
      { pattern: /escola|faculdade|curso|educação|educacao|estudo/, icon: 'GraduationCap', color: 'blue' },
      { pattern: /trabalho|emprego|empresa/, icon: 'Briefcase', color: 'slate' },
      { pattern: /tecnologia|software|app/, icon: 'Laptop', color: 'zinc' },
      { pattern: /mercado|supermercado|compras|feira/, icon: 'ShoppingBasket', color: 'emerald' },
      { pattern: /alimentação|alimentacao|comida|restaurante|refeição|refeicao/, icon: 'Utensils', color: 'orange' },
      { pattern: /café|cafe|lanche/, icon: 'Coffee', color: 'brown' },
      { pattern: /presente|gift/, icon: 'Gift', color: 'red' },
      { pattern: /roupa|vestuário|vestuario|moda/, icon: 'Shirt', color: 'violet' },
      { pattern: /streaming|netflix|disney|hbo|amazon|tv|televisão/, icon: 'Tv', color: 'sky' },
      { pattern: /jogo|game|playstation|xbox/, icon: 'Gamepad2', color: 'violet' },
      { pattern: /música|musica|spotify/, icon: 'Music', color: 'fuchsia' },
      { pattern: /cartão|cartao|crédito|credito/, icon: 'CreditCard', color: 'indigo' },
      { pattern: /investimento|ação|acao|bolsa|fundo|renda fixa/, icon: 'TrendingUp', color: 'blue' },
      { pattern: /poupança|poupanca|reserva|emergência|emergencia/, icon: 'Coins', color: 'amber' },
      { pattern: /salário|salario|renda|receita|ganho/, icon: 'Banknote', color: 'emerald' },
      { pattern: /freelance|extra|comiss/, icon: 'Gem', color: 'purple' },
      { pattern: /condomínio|condominio|taxa|iptu|ipva/, icon: 'Receipt', color: 'slate' },
      { pattern: /doação|doacao|caridade|ong/, icon: 'Heart', color: 'rose' },
      { pattern: /pessoal|higiene|cuidado/, icon: 'UserRound', color: 'cyan' },
    ];

    for (const { pattern, icon: sugIcon, color: sugColor } of iconMap) {
      if (lower.match(pattern)) {
        setIcon(sugIcon);
        setColor(sugColor);
        break;
      }
    }

    // Classification + recurrence suggestion
    // Essencial + Fixa
    if (lower.match(/aluguel|condomínio|condominio|luz|energia|agua|água|internet|escola|faculdade|plano|seguro|iptu|ipva|financiamento|prestação|prestacao|mensalidade|taxa|celular|telefone/)) {
      setClassification('essencial');
      setRecurrence('fixa');
    }
    // Essencial + Variável
    else if (lower.match(/mercado|supermercado|farmácia|farmacia|combustível|combustivel|gasolina|transporte|alimentação|alimentacao|feira|saúde|saude|médico|medico|remédio|remedio/)) {
      setClassification('essencial');
      setRecurrence('variavel');
    }
    // Supérfluo + Fixa
    else if (lower.match(/netflix|spotify|amazon|disney|hbo|streaming|academia|gym|assinatura|clube/)) {
      setClassification('superfluo');
      setRecurrence('fixa');
    }
    // Supérfluo + Variável
    else if (lower.match(/lazer|ifood|restaurante|bar|viagem|jogos|game|roupa|shopping|presente|café|cafe|hobby|cinema|festa|delivery|lanche|beleza|estética|estetica/)) {
      setClassification('superfluo');
      setRecurrence('variavel');
    }
    // Longo Prazo + Fixa
    else if (lower.match(/previdência|previdencia|consórcio|consorcio|seguro vida/)) {
      setClassification('longo_prazo');
      setRecurrence('fixa');
    }
    // Longo Prazo + Variável
    else if (lower.match(/investimento|poupança|poupanca|reserva|ação|acao|fundo|bolsa|renda fixa|tesouro|cdb|lci|lca|cripto|bitcoin/)) {
      setClassification('longo_prazo');
      setRecurrence('variavel');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (type === 'expense') suggestFromName(newName);
  };

  // Re-suggest when switching type to expense
  const handleTypeChange = (v: 'expense' | 'income') => {
    setType(v);
    if (v === 'expense' && name.trim()) suggestFromName(name);
  };

  // Management State
  const [subcatInputs, setSubcatInputs] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string, name: string, icon: string, color: string, type: 'expense' | 'income' } | null>(null);
  const [editClassification, setEditClassification] = useState<'essencial' | 'superfluo' | 'longo_prazo'>('essencial');
  const [editRecurrence, setEditRecurrence] = useState<'fixa' | 'variavel'>('fixa');

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Filtered categories
  const filteredExpenseCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const filteredIncomeCategories = useMemo(() => {
    if (!searchQuery.trim()) return incomeCategories;
    const q = searchQuery.toLowerCase();
    return incomeCategories.filter(c => c.name.toLowerCase().includes(q));
  }, [incomeCategories, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    try {
      if (type === 'expense') {
        await addCategory({ name: name.trim(), icon, color });
        const metadata = JSON.parse(localStorage.getItem('category_metadata') || '{}');
        metadata[name.trim()] = { classification, recurrence };
        localStorage.setItem('category_metadata', JSON.stringify(metadata));
      } else {
        await addIncomeCategory({ name: name.trim(), icon, color });
      }
      toast.success('Categoria criada com sucesso!');
      setName('');
      setIcon('CreditCard');
      setColor('indigo');
      setClassification('essencial');
      setRecurrence('fixa');
    } catch (error) {
      toast.error('Erro ao criar categoria');
    }
  };

  const handleRequestDelete = (id: string, name: string, type: 'expense' | 'income') => {
    setDeletingCategory({ id, name, type });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    try {
      if (deletingCategory.type === 'expense') {
        await removeCategory(deletingCategory.id);
      } else {
        await removeIncomeCategory(deletingCategory.id);
      }
      toast.success('Categoria removida');
    } catch (error) {
      toast.error('Erro ao remover categoria');
    } finally {
      setDeleteConfirmOpen(false);
      setDeletingCategory(null);
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
    // Load classification metadata
    if (type === 'expense') {
      const metadata = JSON.parse(localStorage.getItem('category_metadata') || '{}');
      const meta = metadata[cat.name];
      setEditClassification(meta?.classification || 'essencial');
      setEditRecurrence(meta?.recurrence || 'variavel');
    }
    setEditDialogOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;

    try {
      if (editingCategory.type === 'expense') {
        await updateCategory(editingCategory.id, {
          name: editingCategory.name.trim(),
          icon: editingCategory.icon,
          color: editingCategory.color
        });
        // Update classification metadata
        const metadata = JSON.parse(localStorage.getItem('category_metadata') || '{}');
        metadata[editingCategory.name.trim()] = { classification: editClassification, recurrence: editRecurrence };
        localStorage.setItem('category_metadata', JSON.stringify(metadata));
      } else {
        await updateIncomeCategory(editingCategory.id, {
          name: editingCategory.name.trim(),
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
        await addSubcategory({ name: subName.trim(), categoryId });
      } else {
        await addIncomeSubcategory({ name: subName.trim(), categoryId });
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

  const getCategoryMetadata = (catName: string) => {
    const metadata = JSON.parse(localStorage.getItem('category_metadata') || '{}');
    return metadata[catName] || null;
  };

  const renderCategoryList = (cats: any[], sectionType: 'expense' | 'income') => {
    const subs = sectionType === 'expense' ? subcategories : incomeSubcategories;

    if (cats.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Eye className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
          </p>
          {searchQuery && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setSearchQuery('')}>
              Limpar busca
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cats.map(cat => {
          const catSubcategories = subs.filter(s => s.categoryId === cat.id);
          const isExpanded = expandedCategories.includes(cat.id);
          const meta = sectionType === 'expense' ? getCategoryMetadata(cat.name) : null;

          return (
            <Collapsible 
              key={cat.id} 
              open={isExpanded} 
              onOpenChange={() => toggleCategory(cat.id)}
              className={cn(
                "border rounded-xl bg-card transition-all duration-200",
                isExpanded ? "shadow-md ring-1 ring-primary/10" : "hover:shadow-sm hover:border-border/80"
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
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{catSubcategories.length} sub</span>
                        {meta && (
                          <>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border", CLASSIFICATION_LABELS[meta.classification]?.color)}>
                              {CLASSIFICATION_LABELS[meta.classification]?.label}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border", RECURRENCE_LABELS[meta.recurrence]?.color)}>
                              {RECURRENCE_LABELS[meta.recurrence]?.label}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0", isExpanded && "rotate-180")} />
                  </div>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <div className="p-3 pt-0 space-y-3 border-t bg-muted/5">
                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-3">
                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => handleOpenEdit(cat, sectionType)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" className="h-7 text-xs rounded-lg" onClick={() => handleRequestDelete(cat.id, cat.name, sectionType)}>
                      <Trash2 className="w-3 h-3 mr-1" />
                      Excluir
                    </Button>
                  </div>

                  {/* Subcategories Section */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Subcategorias</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {catSubcategories.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">Nenhuma subcategoria</span>
                      )}
                      {catSubcategories.map(sub => (
                        <Badge key={sub.id} variant="secondary" className="gap-1 pr-1 hover:bg-secondary/80 text-xs rounded-lg">
                          {sub.name}
                          <div 
                            className="cursor-pointer hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                            onClick={() => handleRemoveSubcategory(sub.id, sectionType)}
                          >
                            <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                          </div>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input 
                        placeholder="Nome da subcategoria..." 
                        className="h-8 text-xs rounded-lg"
                        value={subcatInputs[cat.id] || ''}
                        onChange={(e) => setSubcatInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubcategory(cat.id, sectionType);
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-3 rounded-lg text-xs"
                        onClick={() => handleAddSubcategory(cat.id, sectionType)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          Gerenciar Categorias
        </CardTitle>
        <CardDescription>Crie e gerencie suas categorias de receitas e despesas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Form with Live Preview */}
        <form onSubmit={handleSubmit} className="space-y-4 border rounded-xl p-4 bg-muted/5">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Nova Categoria</span>
          </div>

          {/* Live Preview */}
          {name.trim() && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-dashed border-primary/20">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", `bg-${color}-500/15`)}>
                <SelectedIcon className={cn("w-5 h-5", `text-${color}-500`)} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm block truncate">{name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{type === 'expense' ? 'Despesa' : 'Receita'}</span>
                  {type === 'expense' && (
                    <>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border", CLASSIFICATION_LABELS[classification]?.color)}>
                        {CLASSIFICATION_LABELS[classification]?.label}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border", RECURRENCE_LABELS[recurrence]?.color)}>
                        {RECURRENCE_LABELS[recurrence]?.label}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground italic">Preview</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome da Categoria</Label>
              <Input value={name} onChange={handleNameChange} placeholder="Ex: Alimentação" className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo</Label>
              <Select value={type} onValueChange={(v: 'expense' | 'income') => handleTypeChange(v)}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">💸 Despesa</SelectItem>
                  <SelectItem value="income">💰 Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Ícone e Cor</Label>
            <Popover open={isIconOpen} onOpenChange={setIsIconOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3 px-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", `bg-${color}-500/15`)}>
                      <SelectedIcon className={cn("w-4 h-4", `text-${color}-500`)} />
                    </div>
                    <div className="text-left">
                      <span className="block font-medium text-sm">{selectedIconObj.label}</span>
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

          {type === 'expense' && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="col-span-2 flex items-center gap-2 text-xs font-medium text-primary">
                <Brain className="w-3 h-3" />
                Classificação Inteligente
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Classificação</Label>
                <Select value={classification} onValueChange={(v: any) => setClassification(v)}>
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essencial">🟢 Essencial</SelectItem>
                    <SelectItem value="superfluo">🟡 Supérfluo</SelectItem>
                    <SelectItem value="longo_prazo">🔵 Longo Prazo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Recorrência</Label>
                <Select value={recurrence} onValueChange={(v: any) => setRecurrence(v)}>
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">🔁 Fixa</SelectItem>
                    <SelectItem value="variavel">📊 Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full rounded-lg" disabled={!name.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Categoria
          </Button>
        </form>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar categorias..."
            className="pl-9 rounded-lg h-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Category Lists with Tabs */}
        <Tabs defaultValue="expense" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-lg h-9">
            <TabsTrigger value="expense" className="text-xs rounded-md">
              💸 Despesas ({filteredExpenseCategories.length})
            </TabsTrigger>
            <TabsTrigger value="income" className="text-xs rounded-md">
              💰 Receitas ({filteredIncomeCategories.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="expense" className="mt-4">
            {renderCategoryList(filteredExpenseCategories, 'expense')}
          </TabsContent>
          <TabsContent value="income" className="mt-4">
            {renderCategoryList(filteredIncomeCategories, 'income')}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4 py-2">
              {/* Edit Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", `bg-${editingCategory.color}-500/15`)}>
                  <EditingIcon className={cn("w-5 h-5", `text-${editingCategory.color}-500`)} />
                </div>
                <div>
                  <span className="font-medium text-sm">{editingCategory.name || 'Nome da categoria'}</span>
                  <span className="text-[10px] text-muted-foreground block">{editingCategory.type === 'expense' ? 'Despesa' : 'Receita'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Nome</Label>
                <Input 
                  value={editingCategory.name} 
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Ícone e Cor</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-auto py-3 px-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", `bg-${editingCategory.color}-500/15`)}>
                          <EditingIcon className={cn("w-4 h-4", `text-${editingCategory.color}-500`)} />
                        </div>
                        <div className="text-left">
                          <span className="block font-medium text-sm">{editingIconObj.label}</span>
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

              {/* Classification/Recurrence in Edit (expense only) */}
              {editingCategory.type === 'expense' && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="col-span-2 flex items-center gap-2 text-xs font-medium text-primary">
                    <Brain className="w-3 h-3" />
                    Classificação
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={editClassification} onValueChange={(v: any) => setEditClassification(v)}>
                      <SelectTrigger className="h-8 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essencial">🟢 Essencial</SelectItem>
                        <SelectItem value="superfluo">🟡 Supérfluo</SelectItem>
                        <SelectItem value="longo_prazo">🔵 Longo Prazo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Recorrência</Label>
                    <Select value={editRecurrence} onValueChange={(v: any) => setEditRecurrence(v)}>
                      <SelectTrigger className="h-8 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixa">🔁 Fixa</SelectItem>
                        <SelectItem value="variavel">📊 Variável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-lg">Cancelar</Button>
            <Button onClick={handleUpdateCategory} className="rounded-lg">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria <strong>"{deletingCategory?.name}"</strong>? 
              Essa ação não pode ser desfeita e pode afetar despesas/receitas vinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
