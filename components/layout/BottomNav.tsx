'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home, List, Plus, Wallet, Menu, X, Calendar,
    Target, Sparkles, PieChart, Settings, Download,
    HelpCircle, LogOut, ChevronRight, User, CreditCard
} from 'lucide-react';
import { useState } from 'react';

export default function BottomNav() {
    const pathname = usePathname();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const isActive = (path: string) => {
        return pathname === path || (path !== '/dashboard' && pathname.startsWith(path));
    };

    const toggleMore = () => setIsMoreOpen(!isMoreOpen);

    // Menu as requested: Config (Profile), Accounts, Transactions, Stats, IA, Subs, Budgets
    const menuItems = [
        { name: 'Mi Perfil', href: '/dashboard/configuracion', icon: User },
        { name: 'Cuentas', href: '/dashboard/cuentas', icon: Wallet },
        { name: 'Transacciones', href: '/dashboard/transacciones', icon: List },
        { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: PieChart },
        { name: 'Predicción IA', href: '/dashboard/analisis', icon: Sparkles },
        { name: 'Suscripciones', href: '/dashboard/suscripciones', icon: Calendar },
        { name: 'Presupuestos', href: '/dashboard/presupuestos', icon: Target },
        { name: 'Mi Cartera', href: '/dashboard/cartera', icon: CreditCard }, // Keeping Cartera accessible here too
    ];

    return (
        <>
            {/* More Menu Drawer */}
            {isMoreOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setIsMoreOpen(false)}
                    ></div>
                    <div className="absolute bottom-0 left-0 right-0 bg-neutral-50 rounded-t-[32px] p-6 max-h-[85vh] overflow-y-auto animate-slide-up pb-28">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-neutral-900">Menú Completo</h3>
                            <button onClick={() => setIsMoreOpen(false)} className="p-2 bg-neutral-200 rounded-full">
                                <X className="w-5 h-5 text-neutral-700" />
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-8">
                            {menuItems.slice(0, 4).map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMoreOpen(false)}
                                    className="flex flex-col items-center gap-2 text-center group"
                                >
                                    <div className={`w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center border border-neutral-100 group-active:scale-95 transition-all ${isActive(item.href) ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700'
                                        }`}>
                                        <item.icon className="w-6 h-6" strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter leading-tight">{item.name}</span>
                                </Link>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {menuItems.slice(4).map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMoreOpen(false)}
                                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-neutral-50 rounded-xl">
                                            <item.icon className="w-5 h-5 text-neutral-700" strokeWidth={1.5} />
                                        </div>
                                        <span className="font-bold text-neutral-900 text-sm">{item.name}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-neutral-300" />
                                </Link>
                            ))}

                            <form action="/api/auth/signout" method="post">
                                <button type="submit" className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm mt-3 text-rose-500 font-medium active:scale-[0.98] transition-all">
                                    <div className="p-2 bg-rose-50 rounded-xl">
                                        <LogOut className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm">Cerrar Sesión</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Bar - RESTORED: [Home, Trans, (+), Accounts, More] */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-neutral-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 px-6 py-2 pb-6">
                <div className="flex items-center justify-between h-16">
                    <Link
                        href="/dashboard"
                        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/dashboard') && pathname === '/dashboard' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
                    >
                        <Home className="w-6 h-6" strokeWidth={isActive('/dashboard') && pathname === '/dashboard' ? 2 : 1.5} />
                        <span className="text-[10px] font-bold tracking-tighter uppercase">Inicio</span>
                    </Link>

                    <Link
                        href="/dashboard/transacciones"
                        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/dashboard/transacciones') ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
                    >
                        <List className="w-6 h-6" strokeWidth={isActive('/dashboard/transacciones') ? 2 : 1.5} />
                        <span className="text-[10px] font-bold tracking-tighter uppercase">Transacciones</span>
                    </Link>

                    {/* Center Action Button */}
                    <div className="relative -top-6">
                        <button
                            onClick={() => {
                                sessionStorage.setItem('previousPath', pathname);
                                window.location.href = '/dashboard/transacciones/nueva';
                            }}
                            className="flex items-center justify-center w-14 h-14 bg-neutral-900 rounded-full shadow-lg shadow-neutral-900/30 active:scale-90 transition-transform hover:bg-neutral-800"
                        >
                            <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </button>
                    </div>

                    <Link
                        href="/dashboard/cuentas"
                        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/dashboard/cuentas') ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
                    >
                        <Wallet className="w-6 h-6" strokeWidth={isActive('/dashboard/cuentas') ? 2 : 1.5} />
                        <span className="text-[10px] font-bold tracking-tighter uppercase">Cuentas</span>
                    </Link>

                    <button
                        onClick={toggleMore}
                        className={`flex flex-col items-center gap-1 transition-colors ${isMoreOpen ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
                    >
                        <Menu className="w-6 h-6" strokeWidth={isMoreOpen ? 2 : 1.5} />
                        <span className="text-[10px] font-bold tracking-tighter uppercase">Más</span>
                    </button>
                </div>
            </div>
        </>
    );
}
