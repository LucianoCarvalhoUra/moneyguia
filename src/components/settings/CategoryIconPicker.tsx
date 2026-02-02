import { CreditCard, Zap, CarFront, Home, Heart, Users, ShoppingBag, Utensils, Stethoscope, GraduationCap, Plane, Banknote, Dumbbell, Gamepad, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ICONS = [
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

interface CategoryIconPickerProps {
  selectedIcon: string;
  selectedColor: string;
  onSelect: (icon: string, color: string) => void;
}

export function CategoryIconPicker({ selectedIcon, selectedColor, onSelect }: CategoryIconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-4 p-4 border rounded-lg bg-muted/10">
      {ICONS.map(({ name, icon: Icon, color }) => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name, color)}
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full transition-all relative group",
            `bg-${color}-500/15 hover:bg-${color}-500/25`,
            selectedIcon === name ? `ring-2 ring-${color}-500 ring-offset-2` : "hover:scale-110"
          )}
          title={name}
        >
          <Icon className={cn("w-6 h-6 transition-colors", `text-${color}-500`)} />
        </button>
      ))}
    </div>
  );
}