import { useState } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, ChevronDown, TrendingUp, FolderTree, Search } from 'lucide-react';
import { IncomeCategory, IncomeSubcategory } from '@/types/income';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CategoryIcon, iconMap } from '@/components/CategoryIcon';

const AVAILABLE_COLORS = [
  'slate-500', 'red-500', 'orange-500', 'amber-500', 'yellow-500', 'lime-500',
  'green-500', 'emerald-500', 'teal-500', 'cyan-500', 'sky-500', 'blue-500',
  'indigo-500', 'violet-500', 'purple-500', 'fuchsia-500', 'pink-500', 'rose-500'
];

const AVAILABLE_ICONS = Object.keys(iconMap);

export default function IncomeCategoryManager() {
  const {
    incomeCategories,
    incomeSubcategories,
    addIncomeCategory,
    updateIncomeCategory,
    removeIncomeCategory,
    addIncomeSubcategory,
    updateIncomeSubcategory,
    removeIncomeSubcategory,
    getIncomeSubcategoriesByCategory,
  } = useIncome();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<IncomeCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<IncomeSubcategory | null>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'category' | 'subcategory'; id: string } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Category form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('Wallet');
  const [categoryColor, setCategoryColor] = useState('emerald-500');

  // Subcategory form state
  const [subcategoryName, setSubcategoryName] = useState('');

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const openCategoryDialog = (category?: IncomeCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryIcon(category.icon);
      setCategoryColor(category.color);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryIcon('Wallet');
      setCategoryColor('emerald-500');
    }
    setCategoryDialogOpen(true);
  };

  const openSubcategoryDialog = (categoryId: string, subcategory?: IncomeSubcategory) => {
    setParentCategoryId(categoryId);
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setSubcategoryName(subcategory.name);
    } else {
      setEditingSubcategory(null);
      setSubcategoryName('');
    }
    setSubcategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Informe o nome da categoria');
      return;
    }

    if (editingCategory) {
      await updateIncomeCategory(editingCategory.id, {
        name: categoryName,
        icon: categoryIcon,
        color: categoryColor,
      });
      toast.success('Categoria atualizada!');
    } else {
      await addIncomeCategory({
        name: categoryName,
        icon: categoryIcon,
        color: categoryColor,
      });
      toast.success('Categoria criada!');
    }
    setCategoryDialogOpen(false);
  };

  const handleSaveSubcategory = async () => {
    if (!subcategoryName.trim() || !parentCategoryId) {
      toast.error('Informe o nome da subcategoria');
      return;
    }

    if (editingSubcategory) {
      await updateIncomeSubcategory(editingSubcategory.id, { name: subcategoryName });
      toast.success('Subcategoria atualizada!');
    } else {
      await addIncomeSubcategory({
        name: subcategoryName,
        categoryId: parentCategoryId,
      });
      toast.success('Subcategoria criada!');
    }
    setSubcategoryDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'category') {
      await removeIncomeCategory(itemToDelete.id);
      toast.success('Categoria removida!');
    } else {
      await removeIncomeSubcategory(itemToDelete.id);
      toast.success('Subcategoria removida!');
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const confirmDelete = (type: 'category' | 'subcategory', id: string) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Categorias de Receitas
            </CardTitle>
            <CardDescription>
              Gerencie categorias e subcategorias de ganhos
            </CardDescription>
          </div>
          <Button onClick={() => openCategoryDialog()} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nova Categoria
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {incomeCategories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderTree className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma categoria de receita criada</p>
          </div>
        ) : (
          incomeCategories.map((category) => {
            const subs = getIncomeSubcategoriesByCategory(category.id);
            const isExpanded = expandedCategories.includes(category.id);

            return (
              <Collapsible key={category.id} open={isExpanded}>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                    <CollapsibleTrigger
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        `bg-${category.color}/20`
                      )}>
                        <CategoryIcon iconName={category.icon} className={`w-5 h-5 text-${category.color}`} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-foreground truncate">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {subs.length} subcategoria{subs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronDown className={cn(
                        'w-4 h-4 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-180'
                      )} />
                    </CollapsibleTrigger>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        className="hover:bg-accent hover:text-accent-foreground"
                        onClick={() => openCategoryDialog(category)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="hover:bg-accent hover:text-accent-foreground"
                        onClick={() => confirmDelete('category', category.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/30 p-3 space-y-2">
                      {subs.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between pl-6 py-2"
                        >
                          <span className="text-sm text-foreground">↳ {sub.name}</span>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                              onClick={() => openSubcategoryDialog(category.id, sub)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                              onClick={() => confirmDelete('subcategory', sub.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        className="ml-6 hover:bg-accent hover:text-accent-foreground"
                        onClick={() => openSubcategoryDialog(category.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar Subcategoria
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        )}
      </CardContent>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria de Receita' : 'Nova Categoria de Receita'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Salário"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-1 border rounded-md">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setCategoryIcon(icon)}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-muted',
                      categoryIcon === icon
                        ? 'bg-primary/20 text-primary ring-2 ring-primary'
                        : 'text-muted-foreground'
                    )}
                  >
                    <CategoryIcon iconName={icon} className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="grid grid-cols-6 gap-2">
                {AVAILABLE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCategoryColor(color)}
                    className={cn(
                      'w-10 h-10 rounded-lg border-2 transition-colors',
                      `bg-${color}`,
                      categoryColor === color
                        ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20'
                        : 'border-transparent'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground" onClick={() => setCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory ? 'Editar Subcategoria' : 'Nova Subcategoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Empresa X"
                value={subcategoryName}
                onChange={(e) => setSubcategoryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground" onClick={() => setSubcategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSubcategory}>
              {editingSubcategory ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'category'
                ? 'Tem certeza que deseja excluir esta categoria? Todas as subcategorias serão removidas.'
                : 'Tem certeza que deseja excluir esta subcategoria?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
