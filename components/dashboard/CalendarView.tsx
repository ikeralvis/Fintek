'use client';

import { useState, useMemo } from 'react';
import { useDashboard } from '@/lib/DashboardContext';
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, parseISO, addMonths, subMonths,
  getDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';

export default function CalendarView() {
  const { transactions } = useDashboard();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start to align with weekday
  const startDayOfWeek = (getDay(monthStart) + 6) % 7; // Monday = 0

  const dailyTotals = useMemo(() => {
    const totals: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const date = t.transaction_date.substring(0, 10);
      const d = parseISO(date);
      if (!isSameMonth(d, currentMonth)) return;
      if (!totals[date]) totals[date] = { income: 0, expense: 0 };
      if (t.type === 'income') totals[date].income += t.amount;
      else if (t.type === 'expense') totals[date].expense += t.amount;
    });
    return totals;
  }, [transactions, currentMonth]);

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return transactions.filter(t => t.transaction_date.substring(0, 10) === dateStr);
  }, [selectedDate, transactions]);

  const monthTotals = useMemo(() => {
    let income = 0, expense = 0;
    Object.values(dailyTotals).forEach(d => {
      income += d.income;
      expense += d.expense;
    });
    return { income, expense, balance: income - expense };
  }, [dailyTotals]);

  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Calendario</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-muted rounded-xl">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h2 className="text-base font-semibold text-foreground capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-muted rounded-xl">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Month Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary-500/10 rounded-xl p-3 text-center border border-secondary-500/20">
            <p className="text-[10px] text-secondary-600 dark:text-secondary-400 font-semibold uppercase">Ingresos</p>
            <p className="text-sm font-bold tabular-nums text-secondary-700 dark:text-secondary-400">+{monthTotals.income.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€</p>
          </div>
          <div className="bg-accent-500/10 rounded-xl p-3 text-center border border-accent-500/20">
            <p className="text-[10px] text-accent-600 dark:text-accent-400 font-semibold uppercase">Gastos</p>
            <p className="text-sm font-bold tabular-nums text-accent-700 dark:text-accent-400">-{monthTotals.expense.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Balance</p>
            <p className={`text-sm font-bold ${monthTotals.balance >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>
              {monthTotals.balance >= 0 ? '+' : ''}{monthTotals.balance.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
            </p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card rounded-2xl border border-border p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for padding */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}

            {daysInMonth.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const totals = dailyTotals[dateStr];
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const hasActivity = totals && (totals.income > 0 || totals.expense > 0);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center p-0.5 transition-all relative ${
                    isSelected ? 'bg-primary text-primary-foreground' :
                    isToday ? 'bg-muted' :
                    'hover:bg-muted/60'
                  }`}
                >
                  <span className={`text-xs font-medium ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  {hasActivity && !isSelected && (
                    <div className="flex gap-0.5 mt-0.5">
                      {totals.income > 0 && <div className="w-1 h-1 rounded-full bg-secondary-500" />}
                      {totals.expense > 0 && <div className="w-1 h-1 rounded-full bg-accent-500" />}
                    </div>
                  )}
                  {hasActivity && isSelected && (
                    <span className="text-[8px] font-bold text-primary-foreground/70 mt-0.5">
                      -{totals.expense.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Transactions */}
        {selectedDate && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {isSameDay(selectedDate, new Date()) ? 'Hoy' : format(selectedDate, "d 'de' MMMM", { locale: es })}
              {selectedDayTransactions.length > 0 && ` · ${selectedDayTransactions.length} movimiento${selectedDayTransactions.length > 1 ? 's' : ''}`}
            </h3>

            {selectedDayTransactions.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">Sin movimientos este día</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                {selectedDayTransactions.map(t => (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: t.categories?.color ? `${t.categories.color}15` : '#f5f5f5' }}
                    >
                      {t.categories?.icon ? (
                        <CategoryIcon name={t.categories.icon} className="w-4 h-4" style={{ color: t.categories.color || '#666' }} />
                      ) : t.type === 'income' ? (
                        <ArrowUpRight className="w-4 h-4 text-secondary-500 dark:text-secondary-400" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-accent-500 dark:text-accent-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.categories?.name || t.description || 'General'}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.description || ''}</p>
                    </div>
                    <p className={`text-sm font-semibold font-mono ${t.type === 'income' ? 'text-secondary-600 dark:text-secondary-400' : 'text-foreground'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('es-ES')}€
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
