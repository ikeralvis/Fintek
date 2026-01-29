'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Wallet,
  Activity,
  Bell,
  PieChart,
  Target,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useState } from 'react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

// Desktop Navigation Items
const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { name: 'Cuentas', href: '/dashboard/cuentas', icon: <CreditCard className="h-5 w-5" /> },
  { name: 'Transacciones', href: '/dashboard/transacciones', icon: <TrendingUp className="h-5 w-5" /> },
  { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: <PieChart className="h-5 w-5" /> }, // Consolidated
  { name: 'Presupuestos', href: '/dashboard/presupuestos', icon: <Target className="h-5 w-5" /> },
  { name: 'Configuración', href: '/dashboard/configuracion', icon: <Settings className="h-5 w-5" /> },
];

type Props = {
  readonly userName?: string;
  readonly userEmail?: string;
};

export default function DashboardNav({ userName, userEmail }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:block bg-white border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <img src="/logo.png" alt="FinTek Logo" className="h-8 w-8 rounded-xl object-cover" />
              <span className="text-xl font-bold text-primary-900">FinTek</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="flex items-center space-x-1">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${active
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                      }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* User Menu & Logout */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-900">
                  {userName || 'Usuario'}
                </p>
                <p className="text-xs text-neutral-500">{userEmail}</p>
              </div>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="p-2 text-neutral-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header - Simplified (No Hamburger) */}
      <nav className="md:hidden bg-white/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3 border-b border-neutral-100 transition-all">
        <div className="flex items-center justify-between relative">

          {/* Brand/Logo (Left) */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-neutral-900">FinTek</span>
          </div>

          {/* Notifications (Right) */}
          <div className="flex items-center gap-3">
            <button className="p-2.5 bg-white rounded-xl shadow-sm border border-neutral-100/50 relative active:scale-95 transition-transform">
              <Bell className="h-5 w-5 text-neutral-700" />
              <span className="absolute top-2 right-2.5 h-1.5 w-1.5 bg-rose-500 rounded-full border border-white"></span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}