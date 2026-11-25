'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut, Plus } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NAV_ITEMS, NEW_TRANSACTION_HREF, isNavActive } from '@/lib/navigation';
import { cn } from '@/lib/utils';

type Props = {
  readonly userName?: string;
  readonly userEmail?: string;
};

const barItems = NAV_ITEMS.filter(i => i.desktop === 'bar');
const moreItems = NAV_ITEMS.filter(i => i.desktop === 'more');

export default function DashboardNav({ userName, userEmail }: Props) {
  const pathname = usePathname();
  const activeMore = moreItems.find(i => isNavActive(pathname, i));

  return (
    <nav className="hidden md:block glass-nav border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Fintek" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-base font-bold text-foreground tracking-tight hidden lg:inline">Fintek</span>
          </Link>

          {/* Secciones principales + "Más". Scroll interno antes que empujar el perfil fuera. */}
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            {barItems.map(item => {
              const active = isNavActive(pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors outline-none',
                  activeMore ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {activeMore ? activeMore.name : 'Más'}
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-48">
                {moreItems.map(item => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item);
                  return (
                    <DropdownMenuItem key={item.key} asChild>
                      <Link href={item.href} className={cn('flex items-center gap-2 cursor-pointer', active && 'font-semibold text-foreground')}>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {item.name}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nueva transacción + usuario */}
          <div className="flex items-center gap-2 xl:gap-3 shrink-0">
            <Link
              href={NEW_TRANSACTION_HREF}
              onClick={() => sessionStorage.setItem('previousPath', pathname + window.location.search)}
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
