'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, NEW_TRANSACTION_HREF, isNavActive, type NavItem } from '@/lib/navigation';

// Misma lista que el menú de escritorio (lib/navigation.ts).
const barItems = NAV_ITEMS.filter(i => i.mobile === 'bar');
const menuItems = NAV_ITEMS.filter(i => i.mobile === 'more');

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const toggleMore = () => setIsMoreOpen(!isMoreOpen);
    // Si estás en una sección del menú "Más", el botón "Más" se marca como activo.
    const moreActive = isMoreOpen || menuItems.some(i => isNavActive(pathname, i));

    const barLink = (item: NavItem) => {
        const active = isNavActive(pathname, item);
        const Icon = item.icon;
        return (
            <Link
                key={item.key}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center gap-1 px-3 py-1 -my-1 rounded-xl"
            >
                {active && (
                    <span className="absolute inset-0 rounded-xl bg-primary/10 animate-in fade-in-0 zoom-in-95 duration-200" />
                )}
                <Icon className={cn('relative w-6 h-6 transition-colors', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={active ? 2 : 1.5} />
                <span className={cn('relative text-[10px] font-semibold transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
                    {item.name}
                </span>
            </Link>
        );
    };

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
                                    key={item.key}
                                    href={item.href}
                                    onClick={() => setIsMoreOpen(false)}
                                    className="flex flex-col items-center gap-2 text-center"
                                >
                                    <div className={cn(
                                        'w-14 h-14 rounded-2xl flex items-center justify-center border transition-all active:scale-95',
                                        isNavActive(pathname, item)
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
                    {barItems.slice(0, 2).map(barLink)}

                    {/* Center Action Button: siempre visible, en cualquier pantalla del bottom nav */}
                    <div className="relative -top-5">
                        <button
                            onClick={() => {
                                sessionStorage.setItem('previousPath', pathname + window.location.search);
                                router.push(NEW_TRANSACTION_HREF);
                            }}
                            className="flex items-center justify-center w-14 h-14 bg-primary rounded-full shadow-lg active:scale-90 transition-transform"
                        >
                            <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
                        </button>
                    </div>

                    {barItems.slice(2).map(barLink)}

                    <button
                        onClick={toggleMore}
                        aria-expanded={isMoreOpen}
                        className="relative flex flex-col items-center gap-1 px-3 py-1 -my-1 rounded-xl"
                    >
                        {moreActive && (
                            <span className="absolute inset-0 rounded-xl bg-primary/10 animate-in fade-in-0 zoom-in-95 duration-200" />
                        )}
                        <Menu className={cn('relative w-6 h-6 transition-colors', moreActive ? 'text-primary' : 'text-muted-foreground')} strokeWidth={moreActive ? 2 : 1.5} />
                        <span className={cn('relative text-[10px] font-semibold transition-colors', moreActive ? 'text-primary' : 'text-muted-foreground')}>Más</span>
                    </button>
                </div>
            </div>
        </>
    );
}
