'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home, List, Plus, Wallet, Menu, X, Calendar,
    Target, Sparkles, PieChart, Settings, LogOut, CreditCard, TrendingUp
} from 'lucide-react';
import { useState } from 'react';

export default function BottomNav() {
    const pathname = usePathname();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const isActive = (path: string) => {
        return pathname === path || (path !== '/dashboard' && pathname.startsWith(path));
    };

    const toggleMore = () => setIsMoreOpen(!isMoreOpen);

    // Menu items for "More" drawer - Only items not in main nav
    const menuItems = [
        { name: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
        { name: 'Inversiones', href: '/dashboard/inversiones', icon: TrendingUp },
        { name: 'Predicción IA', href: '/dashboard/analisis', icon: Sparkles },
        { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: PieChart },
        { name: 'Suscripciones', href: '/dashboard/suscripciones', icon: Calendar },
        { name: 'Mi Cartera', href: '/dashboard/cartera', icon: CreditCard },
        { name: 'Presupuestos', href: '/dashboard/presupuestos', icon: Target },
    ];

    return (
        <>
            {/* More Menu Drawer */}
            {isMoreOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setIsMoreOpen(false)}
                    ></div>
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto pb-28">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-semibold text-neutral-900">Menú</h3>
                            <button onClick={() => setIsMoreOpen(false)} className="p-2 bg-neutral-100 rounded-full">
                                <X className="w-4 h-4 text-neutral-600" />
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
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all active:scale-95 ${isActive(item.href) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-100 shadow-sm'}`}>
                                        <item.icon className="w-6 h-6" strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[10px] font-semibold text-neutral-600">{item.name}</span>
                                </Link>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <form action="/api/auth/signout" method="post">
                                <button type="submit" className="w-full flex items-center gap-3 p-3 bg-rose-50 rounded-xl text-rose-600 active:scale-[0.98] transition-all">
                                    <LogOut className="w-5 h-5" />
                                    <span className="text-sm font-medium">Cerrar Sesión</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Bar - Clean minimal design */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 z-50 px-4 py-2 pb-6">
                <div className="flex items-center justify-between h-14">
                    <Link
                        href="/dashboard"
                        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/dashboard') && pathname === '/dashboard' ? 'text-neutral-900' : 'text-neutral-400'}`}
                    >
                        <Home className="w-6 h-6" strokeWidth={isActive('/dashboard') && pathname === '/dashboard' ? 2 : 1.5} />
                        <span className="text-[10px] font-semibold">Inicio</span>
                    </Link>

                    <Link
                        href="/dashboard/transacciones"
                        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/dashboard/transacciones') ? 'text-neutral-900' : 'text-neutral-400'}`}
                    >
                        <List className="w-6 h-6" strokeWidth={isActive('/dashboard/transacciones') ? 2 : 1.5} />
                        <span className="text-[10px] font-semibold">Movimientos</span>
                    </Link>

                    {/* Center Action Button */}
                    <div className="relative -top-5">
                        <button
                            onClick={() => {
                                sessionStorage.setItem('previousPath', pathname);
                                window.location.href = '/dashboard/transacciones/nueva';
                            }}
                            className="flex items-center justify-center w-14 h-14 bg-neutral-900 rounded-full shadow-lg active:scale-90 transition-transform"
                        >
                            <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </button>
                    </div>

                    <Link
                        href="/dashboard/cuentas"
                        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/dashboard/cuentas') ? 'text-neutral-900' : 'text-neutral-400'}`}
                    >
                        <Wallet className="w-6 h-6" strokeWidth={isActive('/dashboard/cuentas') ? 2 : 1.5} />
                        <span className="text-[10px] font-semibold">Cuentas</span>
                    </Link>

                    <button
                        onClick={toggleMore}
                        className={`flex flex-col items-center gap-1 transition-colors ${isMoreOpen ? 'text-neutral-900' : 'text-neutral-400'}`}
                    >
                        <Menu className="w-6 h-6" strokeWidth={isMoreOpen ? 2 : 1.5} />
                        <span className="text-[10px] font-semibold">Más</span>
                    </button>
                </div>
            </div>
        </>
    );
}
