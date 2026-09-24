import {
  Activity,
  Archive,
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  CalendarDays,
  Building2,
  Calculator,
  ClipboardCheck,
  Cloud,
  Code2,
  Database,
  Factory,
  FileText,
  FileSpreadsheet,
  FolderKanban,
  Globe2,
  HandCoins,
  Handshake,
  HardHat,
  Headset,
  HeartPulse,
  Landmark,
  Layers3,
  Megaphone,
  Network,
  Package,
  Palette,
  PieChart,
  Rocket,
  Scale,
  Server,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Target,
  Terminal,
  TrendingUp,
  Truck,
  Users,
  UsersRound,
  Warehouse,
  Wrench,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/**
 * The API stores an area's icon as a lucide-react name. The catalog is kept in
 * one place so the renderer and the admin picker always expose the same set of
 * icons. It is intentionally curated instead of importing lucide's complete
 * icon map, which would ship every icon to the browser.
 */
const AREA_ICONS: Record<string, LucideIcon> = {
  Activity,
  Archive,
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  CalendarDays,
  Building2,
  Calculator,
  ClipboardCheck,
  Cloud,
  Code2,
  Database,
  Factory,
  FileText,
  FileSpreadsheet,
  FolderKanban,
  Globe2,
  HandCoins,
  Handshake,
  HardHat,
  Headset,
  HeartPulse,
  Landmark,
  Layers3,
  Megaphone,
  Network,
  Package,
  Palette,
  PieChart,
  Rocket,
  Scale,
  Server,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Target,
  Terminal,
  TrendingUp,
  Truck,
  Users,
  UsersRound,
  Warehouse,
  Wrench,
  Workflow,
};

export const AREA_ICON_OPTIONS = Object.entries(AREA_ICONS).map(
  ([name, icon]) => ({ name, icon })
);

export const DEFAULT_AREA_ICON = "Building2";

export const FALLBACK_AREA_ICON: LucideIcon = Briefcase;

export function resolveAreaIcon(name: string | null): LucideIcon {
  return (name && AREA_ICONS[name]) || FALLBACK_AREA_ICON;
}
