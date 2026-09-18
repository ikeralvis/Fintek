'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CategoryDatum = {
    categoryId: string;
    name: string;
    color?: string;
    prediction: number;
};

type WeeklyPattern = {
    peakDay: string;
    weekendRatio: number;
};

type Props = {
    categories: CategoryDatum[];
    weeklyPattern?: WeeklyPattern;
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function TrendsChart({ categories, weeklyPattern }: Props) {
    const [view, setView] = useState<'categorias' | 'dias'>('categorias');

    const topCategories = [...categories]
        .sort((a, b) => b.prediction - a.prediction)
        .slice(0, 8)
        .map(c => ({ ...c, label: c.name.length > 10 ? `${c.name.slice(0, 9)}…` : c.name }));

    // La API solo expone el patrón semanal agregado (día pico + ratio finde/laborable),
    // no un desglose diario; reconstruimos una curva ilustrativa a partir de esos dos datos
    // sin inventar ninguna cifra de gasto nueva.
    const weekdayData = weeklyPattern
        ? DAYS.map(day => {
            const isWeekend = day === 'Sábado' || day === 'Domingo';
            const isPeak = day === weeklyPattern.peakDay;
            let level = isWeekend ? weeklyPattern.weekendRatio : 1;
            if (isPeak) level *= 1.15;
            return { day, short: day.slice(0, 3), level, isPeak };
        })
        : [];

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Patrones de gasto</h3>
                </div>
                <Tabs value={view} onValueChange={(v) => setView(v as 'categorias' | 'dias')}>
                    <TabsList>
                        <TabsTrigger value="categorias">Categorías</TabsTrigger>
                        <TabsTrigger value="dias">Días</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {view === 'categorias' ? (
                topCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={topCategories} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                            <Tooltip
                                cursor={{ fill: 'var(--muted)' }}
                                contentStyle={{ borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: '11px' }}
                                formatter={(val) => [`${new Intl.NumberFormat('es-ES').format(Number(val ?? 0))}€`, 'Previsto']}
                            />
                            <Bar dataKey="prediction" radius={[6, 6, 0, 0]} maxBarSize={32}>
                                {topCategories.map((c) => (
                                    <Cell key={c.categoryId} fill={c.color || 'var(--primary)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="py-10 text-center text-sm text-muted-foreground">Sin categorías suficientes todavía.</p>
                )
            ) : weekdayData.length > 0 ? (
                <>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={weekdayData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                            <XAxis dataKey="short" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                            <YAxis hide />
                            <Tooltip
                                cursor={{ fill: 'var(--muted)' }}
                                contentStyle={{ borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: '11px' }}
                                formatter={(_val, _name, item: any) => [item.payload.isPeak ? 'Día de mayor gasto' : 'Gasto relativo', item.payload.day]}
                            />
                            <Bar dataKey="level" radius={[6, 6, 0, 0]} maxBarSize={28}>
                                {weekdayData.map((d) => (
                                    <Cell key={d.day} fill={d.isPeak ? 'var(--primary)' : 'var(--muted-foreground)'} fillOpacity={d.isPeak ? 1 : 0.3} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                        Pico habitual: <span className="font-semibold text-foreground">{weeklyPattern!.peakDay}</span>
                        {weeklyPattern!.weekendRatio > 1.1 && <> · gastas un <span className="font-semibold text-foreground">{Math.round((weeklyPattern!.weekendRatio - 1) * 100)}%</span> más los findes</>}
                    </p>
                </>
            ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">Sin datos suficientes por día todavía.</p>
            )}
        </div>
    );
}
