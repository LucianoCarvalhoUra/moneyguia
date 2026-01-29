import {
  GraduationCap, Stethoscope, Dog, Cpu, Heart, Car, Home, ShoppingBag, Palmtree,
  Wallet, Smartphone, Utensils, Plane, Dumbbell, Briefcase, Gift, Music, Film, Gamepad2,
  LayoutGrid, CircleDollarSign, Landmark, Baby, BookOpen, Coffee, Shirt, Hammer,
  Bus, Zap, Wifi, Phone, Droplets, Tag, AlertCircle, Lightbulb, Anchor, Bike,
  CreditCard, DollarSign, Euro, Flag, Gem, Glasses, Key, Map, Medal, Package,
  Rocket, Scissors, Trophy, Umbrella, Watch, Wrench
} from 'lucide-react';

export const iconMap: Record<string, any> = {
  GraduationCap, Stethoscope, Dog, Cpu, Heart, Car, Home, ShoppingBag, Palmtree,
  Wallet, Smartphone, Utensils, Plane, Dumbbell, Briefcase, Gift, Music, Film, Gamepad2,
  LayoutGrid, CircleDollarSign, Landmark, Baby, BookOpen, Coffee, Shirt, Hammer,
  Bus, Zap, Wifi, Phone, Droplets, Tag, AlertCircle, Lightbulb, Anchor, Bike,
  CreditCard, DollarSign, Euro, Flag, Gem, Glasses, Key, Map, Medal, Package,
  Rocket, Scissors, Trophy, Umbrella, Watch, Wrench
};

export function CategoryIcon({ iconName, className }: { iconName: string, className?: string }) {
  const Icon = iconMap[iconName];
  if (Icon) {
    return <Icon className={className} />;
  }
  // Fallback for emoji or unknown
  return <span className={className}>{iconName}</span>;
}