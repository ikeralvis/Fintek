'use client';

import { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    List
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';

const FREQUENCY_STYLES: Record<string, string> = {
    'monthly': 'text-[#F97316] bg-orange-50 ring-1 ring-orange-100',
    'yearly': 'text-[#3B82F6] bg-blue-50 ring-1 ring-blue-100',
    'weekly': 'text-[#10B981] bg-emerald-50 ring-1 ring-emerald-100',
    'bi-weekly': 'text-[#10B981] bg-emerald-50 ring-1 ring-emerald-100'
};

const FREQUENCY_LABELS: Record<string, string> = {
    'monthly': 'Mensual',
    'yearly': 'Anual',
    'weekly': 'Semanal',
    'bi-weekly': 'Quincenal'
};

export default function SubscriptionCalendar({ subscriptions, onClose }: any) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Calendar Grid Generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start as per spec "Sun, Mon..."
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Calculate Payments for the Month
    // We need to project recurring payments onto the current month grid
    // Logic: If sub.next_payment_date day matches grid day (simplified for monthly).
    // REAL WORLD LOGIC: You need to calculate recurrences properly. This is a frontend simulation for "Regular Monthly/Yearly".
    // For this prototype, we'll assume monthly subs repeat on the same day.

    const getPaymentsForDay = (date: Date) => {
        return subscriptions.filter((sub: any) => {
            const subDate = parseISO(sub.next_payment_date);
            const cycle = sub.billing_cycle;

            if (cycle === 'monthly') {
                return subDate.getDate() === date.getDate();
            } else if (cycle === 'yearly') {
                return subDate.getDate() === date.getDate() && subDate.getMonth() === date.getMonth();
            } else {
                // Weekly/Bi-weekly: harder to calc without loop, fallback to exact date match for now or simple mod
                return isSameDay(subDate, date);
            }
        });
    };

    const monthlyTotal = subscriptions.reduce((acc: number, sub: any) => {
        // Estimate monthly total for this view
        const subDate = parseISO(sub.next_payment_date);
        if (sub.billing_cycle === 'monthly') return acc + sub.amount;
        if (sub.billing_cycle === 'yearly' && subDate.getMonth() === currentMonth.getMonth()) return acc + sub.amount;
        return acc;
    }, 0);

    const selectedPayments = selectedDate ? getPaymentsForDay(selectedDate) : [];

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">

            {/* Header Vibrant */}
            <div className="bg-neutral-900 rounded-b-[40px] shadow-lg text-white pt-6 pb-8 sticky top-0 z-20">
                <div className="px-6 flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 border border-white/10 backdrop-blur-md">
                        <button onClick={prevMonth} className="p-1 hover:bg-white/20 rounded-full">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-bold capitalize w-32 text-center">
                            {format(currentMonth, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button onClick={nextMonth} className="p-1 hover:bg-white/20 rounded-full">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <button onClick={onClose} className="p-3 bg-white text-neutral-900 rounded-full shadow-md active:scale-95 transition-all">
                        <List className="w-5 h-5" />
                    </button>
                </div>

                {/* Monthly Total Summary */}
                <div className="px-6 text-center">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Mensual</p>
                    <h2 className="text-5xl font-black tracking-tight">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyTotal)}
                    </h2>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8">

                {/* CALENDAR GRID */}
                <div className="bg-white rounded-[32px] p-4 shadow-sm border border-neutral-100">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-4">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-neutral-400 uppercase">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days Cells */}
                    <div className="grid grid-cols-7 gap-y-4">
                        {calendarDays.map((day, i) => {
                            const isCurrent = isSameMonth(day, currentMonth);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const payments = getPaymentsForDay(day);
                            const hasPayments = payments.length > 0;

                            return (
                                <div key={i} className="flex flex-col items-center">
                                    <button
                                        onClick={() => setSelectedDate(day)}
                                        disabled={!isCurrent}
                                        className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center relative transition-all ${isSelected
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110 z-10'
                                                : isCurrent
                                                    ? 'text-neutral-900 hover:bg-neutral-50'
                                                    : 'text-neutral-300'
                                            }`}
                                    >
                                        <span className="text-sm font-bold leading-none">{format(day, 'd')}</span>

                                        {/* Dots */}
                                        {hasPayments && !isSelected && (
                                            <div className="flex gap-0.5 mt-1">
                                                {payments.slice(0, 3).map((p: any, idx: number) => (
                                                    <div key={idx} className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* DAY DETAILS PANEL (Expandable) */}
                {selectedDate && (
                    <div className="mt-6 animate-slide-up">
                        <div className="flex items-center gap-4 mb-4">
                            <h3 className="text-xl font-bold text-neutral-900">
                                {format(selectedDate, 'EEEE d', { locale: es })}
                            </h3>
                            <div className="h-px flex-1 bg-neutral-200"></div>
                        </div>

                        <div className="space-y-3 pb-20">
                            {selectedPayments.length > 0 ? (
                                selectedPayments.map((sub: any) => (
                                    <div key={sub.id} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-neutral-100">
                                        <div className="flex items-center gap-3">
                                            {/* Small fallback logo */}
                                            <div className="w-10 h-10 bg-neutral-50 rounded-lg flex items-center justify-center p-1">
                                                {sub.logo_url ? <img src={sub.logo_url} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-indigo-100 rounded-md"></div>}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-neutral-900">{sub.name}</p>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${FREQUENCY_STYLES[sub.billing_cycle]}`}>
                                                    {FREQUENCY_LABELS[sub.billing_cycle]}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-base font-black text-neutral-900">{sub.amount}€</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-sm text-neutral-400 py-4">No hay pagos este día.</p>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
