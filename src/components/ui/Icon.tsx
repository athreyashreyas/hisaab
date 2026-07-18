import {
  Baby, Banknote, Bus, Car, Circle, CircleDashed, Clapperboard, Cloud, CloudOff,
  Coffee, Coins, Dumbbell, Gift, GraduationCap, Heart, HeartPulse, Home, House,
  Landmark, Layers, List, NotebookPen, PawPrint, PieChart, PiggyBank, Plane, Plus,
  Receipt, ReceiptText, RefreshCw, Repeat, Settings, ShieldCheck, ShoppingBag,
  ShoppingBasket, Target, TrendingUp, Utensils, Wallet,
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
  bus: Bus,
  car: Car,
  'circle-dashed': CircleDashed,
  clapperboard: Clapperboard,
  cloud: Cloud,
  'cloud-off': CloudOff,
  coffee: Coffee,
  coins: Coins,
  dumbbell: Dumbbell,
  gift: Gift,
  'graduation-cap': GraduationCap,
  heart: Heart,
  'heart-pulse': HeartPulse,
  home: Home,
  house: House,
  landmark: Landmark,
  layers: Layers,
  list: List,
  'notebook-pen': NotebookPen,
  'paw-print': PawPrint,
  'pie-chart': PieChart,
  'piggy-bank': PiggyBank,
  plane: Plane,
  plus: Plus,
  receipt: Receipt,
  'receipt-text': ReceiptText,
  'refresh-cw': RefreshCw,
  repeat: Repeat,
  settings: Settings,
  'shield-check': ShieldCheck,
  'shopping-bag': ShoppingBag,
  'shopping-basket': ShoppingBasket,
  target: Target,
  'trending-up': TrendingUp,
  utensils: Utensils,
  wallet: Wallet,
};

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = REGISTRY[name] ?? Circle;
  return <Cmp {...props} />;
}
