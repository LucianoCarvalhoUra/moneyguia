import {
  GraduationCap, Stethoscope, Dog, Cpu, Heart, Car, Home, ShoppingBag, Palmtree,
  Wallet, Smartphone, Utensils, Plane, Dumbbell, Briefcase, Gift, Music, Film, Gamepad2,
  LayoutGrid, CircleDollarSign, Landmark, Baby, BookOpen, Coffee, Shirt, Hammer,
  Bus, Zap, Wifi, Phone, Droplets, Tag, AlertCircle, Lightbulb, Anchor, Bike, FileText, Users, User, Building,
  CreditCard, DollarSign, Euro, Flag, Gem, Glasses, Key, Map, Medal, Package,
  Rocket, Scissors, Trophy, Umbrella, Watch, Wrench, CarFront, Pizza, HeartPulse, TrendingUp, Coins, UtensilsCrossed, Banknote, Sparkles, PartyPopper, BookOpenCheck
} from 'lucide-react';

export const iconMap: Record<string, any> = {
  GraduationCap, Stethoscope, Dog, Cpu, Heart, Car, Home, ShoppingBag, Palmtree,
  Wallet, Smartphone, Utensils, Plane, Dumbbell, Briefcase, Gift, Music, Film, Gamepad2,
  LayoutGrid, CircleDollarSign, Landmark, Baby, BookOpen, Coffee, Shirt, Hammer,
  Bus, Zap, Wifi, Phone, Droplets, Tag, AlertCircle, Lightbulb, Anchor, Bike, FileText, Users, User, Building,
  CreditCard, DollarSign, Euro, Flag, Gem, Glasses, Key, Map, Medal, Package,
  Rocket, Scissors, Trophy, Umbrella, Watch, Wrench,
  CarFront, Pizza, HeartPulse, TrendingUp, Coins,
  UtensilsCrossed, Banknote, Sparkles, PartyPopper, BookOpenCheck
};

export function CategoryIcon({ iconName, className }: { iconName: string, className?: string }) {
  const Icon = iconMap[iconName];
  if (Icon) {
    const extraProps = iconName === 'Heart' ? { fill: 'currentColor' } : {};
    return <Icon className={className} {...extraProps} />;
  }
  // Fallback for emoji or unknown
  return <span className={className}>{iconName}</span>;
}