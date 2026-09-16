'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home, List, Plus, Wallet, Menu, X, RefreshCw,
    Target, Sparkles, PieChart, Settings, CreditCard, TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
    const pathname = usePathname();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const isActive = (path: string) => {
        return pathname === path || (path !== '/dashboard' && pathname.startsWith(path));
    };

    // En "Mis Cuentas" el header ya tiene un único botón "+" para crear cuenta;
    // el FAB central (que crea una transacción) queda oculto ahí para no duplicar la acción.
    const showCenterFab = pathname !== '/dashboard/cuentas';

    const toggleMore = () => setIsMoreOpen(!isMoreOpen);

    // Menu items for "More" drawer - Only items not in main nav
    const menuItems = [
        { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: PieChart },
        { name: 'Inversiones', href: '/dashboard/inversiones', icon: TrendingUp },
        { name: 'Predicción IA', href: '/dashboard/analisis', icon: Sparkles },
        { name: 'Presupuestos', href: '/dashboard/presupuestos', icon: Target },
        { name: 'Suscripciones', href: '/dashboard/suscripciones', icon: RefreshCw },
        { name: 'Mi Cartera', href: '/dashboard/cartera', icon: CreditCard },
        { name: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
    ];

    const navItems = [
        { key: 'home', href: '/dashboard', icon: Home, label: 'Inicio', exact: true },
        { key: 'tx', href: '/dashboard/transacciones', icon: List, label: 'Movimientos', exact: false },
    ];

    return (
        <>
            {/* More Menu Drawer */}
            {isMoreOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200 ease-out"
                        onClick={() => setIsMoreOpen(false)}
                    ></div>
                    <div className="absolute bottom-0 left-0 right-0 glass-card border-x-0 border-b-0 rounded-t-3xl rounded-b-none p-5 max-h-[80vh] overflow-y-auto pb-28 animate-in slide-in-from-bottom duration-300 ease-out">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-semibold text-foreground">Menú</h3>
                            <button onClick={() => setIsMoreOpen(false)} className="p-2 bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Grid of main menu items */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMoreOpen(false)}
                                    className="flex flex-col items-center gap-2 text-center"
                                >
                                    <div className={cn(
                                        'w-14 h-14 rounded-2xl flex items-center justify-center border transition-all active:scale-95',
                                        isActive(item.href)
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-card text-muted-foreground border-border shadow-soft'
                                    )}>
                                        <item.icon className="w-6 h-6" strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[10px] font-semibold text-muted-foreground">{item.name}</span>
                                </Link>
                            ))}
                        </div>

                    </div>
                </div>
            )}

            {/* Bottom Bar - glass, tokens en sync con DashboardNav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 glass-nav border-t z-50 px-4 py-2 pb-6">
                <div className="flex items-center justify-between h-14">
                    {navItems.map(({ key, href, icon: Icon, label, exact }) => {
                        const active = exact ? (isActive(href) && pathname === href) : isActive(href);
                        return (
                            <Link
                                key={key}
                                href={href}
                                className="relative flex flex-col items-center gap-1 px-3 py-1 -my-1 rounded-xl"
                            >
                                {active && (
                                    <span className="absolute inset-0 rounded-xl bg-primary/10 animate-in fade-in-0 zoom-in-95 duration-200" />
                                )}
                                <Icon
                                    className={cn('relative w-6 h-6 transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
                                    strokeWidth={active ? 2 : 1.5}
                                />
                                <span className={cn('relative text-[10px] font-semibold transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
                                    {label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Center Action Button */}
                    {showCenterFab && (
                        <div className="relative -top-5">
                            <button
                                onClick={() => {
                                    sessionStorage.setItem('previousPath', pathname);
                                    window.location.href = '/dashboard/transacciones/nueva';
                                }}
                                className="flex items-center justify-center w-14 h-14 bg-primary rounded-full shadow-lg active:scale-90 transition-transform"
                            >
                                <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
                            </button>
                        </div>
                    )}

                    <Link
                        href="/dashboard/cuentas"
                        className="relative flex flex-col items-center gap-1 px-3 py-1 -my-1 rounded-xl"
                    >
                        {isActive('/dashboard/cuentas') && (
                            <span className="absolute inset-0 rounded-xl bg-primary/10 animate-in fade-in-0 zoom-in-95 duration-200" />
                        )}
                        <Wallet
                            className={cn('relative w-6 h-6 transition-colors', isActive('/dashboard/cuentas') ? 'text-primary' : 'text-muted-foreground')}
                            strokeWidth={isActive('/dashboard/cuentas') ? 2 : 1.5}
                        />
                        <span className={cn('relative text-[10px] font-semibold transition-colors', isActive('/dashboard/cuentas') ? 'text-primary' : 'text-muted-foreground')}>
                            Cuentas
                        </span>
                    </Link>

                    <button
                        onClick={toggleMore}
                        className="relative flex flex-col items-center gap-1 px-3 py-1 -my-1 rounded-xl"
                    >
                        {isMoreOpen && (
                            <span className="absolute inset-0 rounded-xl bg-primary/10 animate-in fade-in-0 zoom-in-95 duration-200" />
                        )}
                        <Menu className={cn('relative w-6 h-6 transition-colors', isMoreOpen ? 'text-primary' : 'text-muted-foreground')} strokeWidth={isMoreOpen ? 2 : 1.5} />
                        <span className={cn('relative text-[10px] font-semibold transition-colors', isMoreOpen ? 'text-primary' : 'text-muted-foreground')}>Más</span>
                    </button>
                </div>
            </div>
        </>
    );
}
