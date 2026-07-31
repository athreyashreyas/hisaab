import {
  Baby, Banknote, BookOpen, Bus, Car, Circle, CircleDashed, CircleParking, Clapperboard,
  Cloud, CloudOff, Coffee, Coins, Dumbbell, Fuel, Gift, GraduationCap, HandCoins, HandHeart,
  Heart, HeartPulse, Home, House, Landmark, Laptop, Layers, List, NotebookPen, PartyPopper,
  PawPrint, PieChart, PiggyBank, Plane, Plus, Receipt, ReceiptText, RefreshCw, Repeat,
  Scissors, Settings, Shield, ShieldCheck, Shirt, ShoppingBag, ShoppingBasket, Smartphone,
  Sofa, Sparkles, Stethoscope, Target, TrendingUp, Users, Utensils, Wallet, Wine, Wrench, Zap,
  type LucideIcon, type LucideProps,
} from 'lucide-react';

/**
 * Render a lucide icon by its kebab-case name (as stored on categories, goals,
 * investments, nav, and the guide). Importing the whole lucide set — as `import
 * { icons }` does — drags ~1,500 icons (100kB+ gzip) into the cold-start bundle,
 * so instead we register only the icons the app can actually reference (the fixed
 * picker sets + everything used in code). Tree-shaking then keeps the icon chunk
 * tiny. An unknown name falls back to a neutral circle, so a stale/bad name never
 * crashes a row. Adding a new pickable icon = one import + one map entry.
 */
const REGISTRY: Record<string, LucideIcon> = {
  baby: Baby,
  banknote: Banknote,
  'book-open': BookOpen,
  bus: Bus,
  car: Car,
  'circle-dashed': CircleDashed,
  'circle-parking': CircleParking,
  clapperboard: Clapperboard,
  cloud: Cloud,
  'cloud-off': CloudOff,
  coffee: Coffee,
  coins: Coins,
  dumbbell: Dumbbell,
  fuel: Fuel,
  gift: Gift,
  'graduation-cap': GraduationCap,
  'hand-coins': HandCoins,
  'hand-heart': HandHeart,
  heart: Heart,
  'heart-pulse': HeartPulse,
  home: Home,
  house: House,
  landmark: Landmark,
  laptop: Laptop,
  layers: Layers,
  list: List,
  'notebook-pen': NotebookPen,
  'party-popper': PartyPopper,
  'paw-print': PawPrint,
  'pie-chart': PieChart,
  'piggy-bank': PiggyBank,
  plane: Plane,
  plus: Plus,
  receipt: Receipt,
  'receipt-text': ReceiptText,
  'refresh-cw': RefreshCw,
  repeat: Repeat,
  scissors: Scissors,
  settings: Settings,
  shield: Shield,
  'shield-check': ShieldCheck,
  shirt: Shirt,
  'shopping-bag': ShoppingBag,
  'shopping-basket': ShoppingBasket,
  smartphone: Smartphone,
  sofa: Sofa,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  target: Target,
  'trending-up': TrendingUp,
  users: Users,
  utensils: Utensils,
  wallet: Wallet,
  wine: Wine,
  wrench: Wrench,
  zap: Zap,
};

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = REGISTRY[name] ?? Circle;
  return <Cmp {...props} />;
}
