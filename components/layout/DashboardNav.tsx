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
  Menu,
  X,
  PieChart
} from 'lucide-react';
import { useState } from 'react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { name: 'Cuentas', href: '/dashboard/cuentas', icon: <CreditCard className="h-5 w-5" /> },
  { name: 'Transacciones', href: '/dashboard/transacciones', icon: <TrendingUp className="h-5 w-5" /> },
  { name: 'Presupuestos', href: '/dashboard/presupuestos', icon: <PieChart className="h-5 w-5" /> },
  { name: 'Resumen', href: '/dashboard/resumen', icon: <FileText className="h-5 w-5" /> },
  { name: 'Configuración', href: '/dashboard/configuracion', icon: <Settings className="h-5 w-5" /> },
];

type Props = {
  userName?: string;
  userEmail?: string;
};

export default function DashboardNav({ userName, userEmail }: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Wallet className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-primary-900">FinTek</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${active
                        ? 'bg-primary-50 text-primary-700'
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
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-900">
                  {userName || 'Usuario'}
                </p>
                <p className="text-xs text-neutral-500">{userEmail}</p>
              </div>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="p-2 text-neutral-600 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-200 shadow-lg">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Mobile User Info */}
            <div className="pt-4 mt-4 border-t border-neutral-200">
              <div className="px-4 py-2">
                <p className="text-sm font-medium text-neutral-900">
                  {userName || 'Usuario'}
                </p>
                <p className="text-xs text-neutral-500">{userEmail}</p>
              </div>
              <form action="/api/auth/signout" method="post" className="mt-2">
                <button
                  type="submit"
                  className="w-full flex items-center space-x-3 px-4 py-3 text-accent-600 hover:bg-accent-50 rounded-lg font-medium transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Cerrar Sesión</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}