import {
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  Calculator,
  ClipboardCheck,
  FileText,
  HandCoins,
  Handshake,
  HardHat,
  Headset,
  Landmark,
  Megaphone,
  Package,
  Scale,
  Server,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

/**
 * The API stores an area's icon as a lucide-react name. Importing lucide's
 * whole `icons` map would ship every icon to the browser for eight squares,
 * so the names an area may use are listed here. An unknown name falls back
 * to a neutral mark instead of breaking the switcher: a new area in the
 * database still renders, and adding its icon here is a one-line follow-up.
 */
const AREA_ICONS: Record<string, LucideIcon> = {
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  Calculator,
  ClipboardCheck,
  FileText,
  HandCoins,
  Handshake,
  HardHat,
  Headset,
  Landmark,
  Megaphone,
  Package,
  Scale,
  Server,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
};

export const FALLBACK_AREA_ICON: LucideIcon = Briefcase;

export function resolveAreaIcon(name: string | null): LucideIcon {
  return (name && AREA_ICONS[name]) || FALLBACK_AREA_ICON;
}
