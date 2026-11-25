import {
  Home, List, PieChart, RefreshCw, Settings, Sparkles, Target, TrendingUp, Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * Única lista de secciones de la app: la usan el menú de escritorio (DashboardNav) y el de
 * móvil (BottomNav), así los dos enseñan siempre lo mismo y con el mismo nombre.
 *   - `bar`: en la barra principal (escritorio arriba, móvil abajo).
 *   - `more`: en el desplegable / hoja "Más".
 */
export type NavItem = {
  key: string;
  name: string;
  href: string;
  icon: LucideIcon;
  /** Solo activo en la ruta exacta (Inicio), no en sus subrutas. */
  exact?: boolean;
  desktop: 'bar' | 'more';
  mobile: 'bar' | 'more';
};

export const NAV_ITEMS: NavItem[] = [
  { key: 'home', name: 'Inicio', href: '/dashboard', icon: Home, exact: true, desktop: 'bar', mobile: 'bar' },
  { key: 'tx', name: 'Movimientos', href: '/dashboard/transacciones', icon: List, desktop: 'bar', mobile: 'bar' },
  { key: 'accounts', name: 'Cuentas', href: '/dashboard/cuentas', icon: Wallet, desktop: 'bar', mobile: 'bar' },
  { key: 'budgets', name: 'Presupuestos', href: '/dashboard/presupuestos', icon: Target, desktop: 'bar', mobile: 'more' },
  { key: 'subs', name: 'Pagos automáticos', href: '/dashboard/suscripciones', icon: RefreshCw, desktop: 'bar', mobile: 'more' },
  { key: 'stats', name: 'Estadísticas', href: '/dashboard/estadisticas', icon: PieChart, desktop: 'bar', mobile: 'more' },
  { key: 'invest', name: 'Inversiones', href: '/dashboard/inversiones', icon: TrendingUp, desktop: 'bar', mobile: 'more' },
  { key: 'ai', name: 'Predicción IA', href: '/dashboard/analisis', icon: Sparkles, desktop: 'more', mobile: 'more' },
  { key: 'settings', name: 'Configuración', href: '/dashboard/configuracion', icon: Settings, desktop: 'more', mobile: 'more' },
];

export const NEW_TRANSACTION_HREF = '/dashboard/transacciones/nueva';

export function isNavActive(pathname: string, item: Pick<NavItem, 'href' | 'exact'>): boolean {
  if (pathname.startsWith(NEW_TRANSACTION_HREF)) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
