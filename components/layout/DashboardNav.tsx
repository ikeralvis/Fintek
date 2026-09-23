'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  Settings,
  LogOut,
  PieChart,
  Target,
  Plus,
  TrendingUp as InvestmentIcon
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { name: 'Cuentas', href: '/dashboard/cuentas', icon: <CreditCard className="h-4 w-4" /> },
  { name: 'Transacciones', href: '/dashboard/transacciones', icon: <TrendingUp className="h-4 w-4" /> },
  { name: 'Inversiones', href: '/dashboard/inversiones', icon: <InvestmentIcon className="h-4 w-4" /> },
  { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: <PieChart className="h-4 w-4" /> },
  { name: 'Presupuestos', href: '/dashboard/presupuestos', icon: <Target className="h-4 w-4" /> },
  { name: 'Configuración', href: '/dashboard/configuracion', icon: <Settings className="h-4 w-4" /> },
];

type Props = {
  readonly userName?: string;
  readonly userEmail?: string;
};

export default function DashboardNav({ userName, userEmail }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <nav className="hidden md:block glass-nav border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="Fintek" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-base font-bold text-foreground tracking-tight hidden lg:inline">Fintek</span>
          </Link>

          {/* Navigation — puede scrollear internamente en vez de empujar el perfil fuera del viewport */}
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* New Transaction + User */}
          <div className="flex items-center gap-2 xl:gap-3 shrink-0">
            <Link
              href="/dashboard/transacciones/nueva"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('previousPath', pathname);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors"
              title="Nueva transacción"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xl:inline">Nuevo</span>
            </Link>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <ThemeToggle />

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="text-right hidden lg:block">
              <p className="text-xs font-medium text-foreground leading-tight max-w-[140px] truncate">
                {userName || 'Usuario'}
              </p>
              <p className="text-[10px] text-muted-foreground max-w-[140px] truncate hidden xl:block">{userEmail}</p>
            </div>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="p-1.5 text-muted-foreground hover:text-accent-500 hover:bg-accent-50 dark:hover:bg-accent-900/30 rounded-lg transition-colors shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
