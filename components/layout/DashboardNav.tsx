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
    <nav className="hidden md:block bg-white/80 backdrop-blur-xl border-b border-neutral-200/60 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="FinTek" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-base font-bold text-neutral-900 tracking-tight">FinTek</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-0.5">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${active
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* New Transaction + User */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/transacciones/nueva"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('previousPath', pathname);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo</span>
            </Link>

            <div className="h-6 w-px bg-neutral-200" />

            <div className="text-right">
              <p className="text-xs font-medium text-neutral-900 leading-tight">
                {userName || 'Usuario'}
              </p>
              <p className="text-[10px] text-neutral-400">{userEmail}</p>
            </div>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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
