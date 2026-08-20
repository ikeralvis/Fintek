import { format, parseISO, eachMonthOfInterval, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================
// ADVANCED STATISTICAL PREDICTION ENGINE
// (extraído de lib/actions/analysis.ts para poder reutilizarlo también desde los cron jobs)
// ============================================

function holtExponentialSmoothing(data: number[], alpha = 0.3, beta = 0.1): { prediction: number; trend: number } {
    if (data.length === 0) return { prediction: 0, trend: 0 };
    if (data.length === 1) return { prediction: data[0], trend: 0 };

    let level = data[0];
    let trend = data[1] - data[0];

    for (let i = 1; i < data.length; i++) {
        const prevLevel = level;
        level = alpha * data[i] + (1 - alpha) * (level + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    const prediction = level + trend;
    const trendPercent = level > 0 ? (trend / level) * 100 : 0;

    return { prediction: Math.max(0, prediction), trend: trendPercent };
}

function calculateVariance(data: number[], mean: number): { variance: number; stdDev: number } {
    if (data.length < 2) return { variance: 0, stdDev: 0 };

    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (data.length - 1);
    const stdDev = Math.sqrt(variance);

    return { variance, stdDev };
}

function median(data: number[]): number {
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function analyzeWeeklyPattern(transactions: any[]): { weekendRatio: number; peakDay: string } {
    const dayTotals: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    transactions.forEach(t => {
        const date = parseISO(t.transaction_date);
        const day = getDay(date);
        dayTotals[day] += t.amount;
        dayCounts[day]++;
    });

    const dayAvgs = Object.keys(dayTotals).map(d => ({
        day: Number(d),
        avg: dayCounts[Number(d)] > 0 ? dayTotals[Number(d)] / dayCounts[Number(d)] : 0
    }));

    const weekdayAvg = dayAvgs.filter(d => d.day >= 1 && d.day <= 5).reduce((a, b) => a + b.avg, 0) / 5;
    const weekendAvg = (dayAvgs[0].avg + dayAvgs[6].avg) / 2;
    const weekendRatio = weekdayAvg > 0 ? weekendAvg / weekdayAvg : 1;

    const peakDay = dayAvgs.reduce((max, curr) => curr.avg > max.avg ? curr : max, dayAvgs[0]);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return { weekendRatio, peakDay: dayNames[peakDay.day] };
}

function detectVelocityChange(history: number[]): { accelerating: boolean; velocity: number } {
    if (history.length < 3) return { accelerating: false, velocity: 0 };

    const velocities: number[] = [];
    for (let i = 1; i < history.length; i++) {
        velocities.push(history[i] - history[i - 1]);
    }

    const recentVel = velocities.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const olderVel = velocities.slice(0, -2).reduce((a, b) => a + b, 0) / Math.max(1, velocities.length - 2);

    return {
        accelerating: recentVel > olderVel,
        velocity: recentVel
    };
}

function generateDynamicInsights(
    categoryData: any[],
    weeklyPattern: { weekendRatio: number; peakDay: string },
    totalPrediction: number,
    lastMonthTotal: number
): string[] {
    const insights: string[] = [];

    if (weeklyPattern.weekendRatio > 1.3) {
        const pct = Math.round((weeklyPattern.weekendRatio - 1) * 100);
        insights.push(`📊 Gastas un ${pct}% más los fines de semana. Un "día sin gasto" semanal podría ahorrarte ~${Math.round(totalPrediction * 0.05)}€/mes.`);
    }

    if (weeklyPattern.peakDay) {
        insights.push(`📅 Tu día de mayor gasto es el ${weeklyPattern.peakDay}. Planifica compras grandes para otros días.`);
    }

    const acceleratingCategories = categoryData.filter(c => c.accelerating && c.trend > 10);
    if (acceleratingCategories.length > 0) {
        const topAccel = acceleratingCategories[0];
        insights.push(`⚠️ ${topAccel.name} está creciendo rápidamente (+${topAccel.trend.toFixed(0)}%). Revisa si es necesario.`);
    }

    const decreasingCategories = categoryData.filter(c => c.trend < -5 && c.prediction > 50);
    if (decreasingCategories.length > 0) {
        const topDecrease = decreasingCategories[0];
        insights.push(`✅ Buen trabajo en ${topDecrease.name}: está bajando un ${Math.abs(topDecrease.trend).toFixed(0)}%.`);
    }

    const overallChange = lastMonthTotal > 0 ? ((totalPrediction - lastMonthTotal) / lastMonthTotal) * 100 : 0;
    if (overallChange > 10) {
        insights.push(`📈 Se prevé un aumento del ${overallChange.toFixed(0)}% respecto al mes pasado.`);
    } else if (overallChange < -10) {
        insights.push(`📉 Se prevé una reducción del ${Math.abs(overallChange).toFixed(0)}% respecto al mes pasado. ¡Sigue así!`);
    }

    if (categoryData.length > 0) {
        const largest = categoryData.reduce((max, c) => c.prediction > max.prediction ? c : max, categoryData[0]);
        if (largest && largest.prediction > totalPrediction * 0.3) {
            insights.push(`💡 ${largest.name} representa el ${((largest.prediction / totalPrediction) * 100).toFixed(0)}% de tu gasto. Pequeños ajustes aquí tienen gran impacto.`);
        }
    }

    return insights.slice(0, 4);
}

/**
 * Cálculo puro (sin acceso a red/BD) de la predicción de gasto por categoría.
 * `transactions` deben ser gastos ('expense') de los últimos 12 meses (incluido el actual).
 */
export function computeSpendingAnalysis(transactions: any[], categories: any[], now: Date) {
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    if (!transactions || transactions.length === 0) {
        return {
            categories: [],
            totalPrediction: 0,
            confidenceInterval: { low: 0, high: 0 },
            monthName: format(now, 'MMMM', { locale: es }),
            insights: ['Añade transacciones para ver predicciones personalizadas.']
        };
    }

    const monthlyData: Record<string, Record<string, number>> = {};
    const monthlyTotals: Record<string, number> = {};

    const months = eachMonthOfInterval({ start: startDate, end: now }).map(d => format(d, 'yyyy-MM'));
    months.forEach(m => {
        monthlyData[m] = {};
        monthlyTotals[m] = 0;
    });

    transactions.forEach((t: any) => {
        const m = format(parseISO(t.transaction_date), 'yyyy-MM');
        if (monthlyData[m]) {
            const catId = t.category_id || 'unknown';
            monthlyData[m][catId] = (monthlyData[m][catId] || 0) + t.amount;
            monthlyTotals[m] += t.amount;
        }
    });

    const weeklyPattern = analyzeWeeklyPattern(transactions);

    const analysisResults = (categories || []).map((cat: any) => {
        const id = cat.id;
        const history = months.slice(0, -1).map(m => monthlyData[m][id] || 0);
        const currentMonthSpent = monthlyData[months.at(-1)!][id] || 0;

        if (history.length < 2 || history.every(h => h === 0)) {
            return null;
        }

        const { prediction, trend } = holtExponentialSmoothing(history);
        const { accelerating, velocity } = detectVelocityChange(history);

        const mean = history.reduce((a, b) => a + b, 0) / history.length;
        const { stdDev } = calculateVariance(history, mean);

        const dayOfMonth = now.getDate();
        const daysInMonth = 30;
        const projectedCurrent = dayOfMonth > 5
            ? (currentMonthSpent / dayOfMonth) * daysInMonth
            : prediction;

        const blendedPrediction = dayOfMonth > 15
            ? projectedCurrent * 0.7 + prediction * 0.3
            : prediction;

        // Últimos 3 meses cerrados (excluye el mes en curso) para min/mediana/máx "reales"
        const last3Months = history.slice(-3);

        return {
            categoryId: id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            history,
            average: mean,
            median: median(last3Months),
            min: last3Months.length ? Math.min(...last3Months) : 0,
            max: last3Months.length ? Math.max(...last3Months) : 0,
            current: currentMonthSpent,
            prediction: Math.round(blendedPrediction),
            confidenceLow: Math.round(Math.max(0, blendedPrediction - stdDev)),
            confidenceHigh: Math.round(blendedPrediction + stdDev),
            trend: trend,
            accelerating,
            velocity: Math.round(velocity)
        };
    }).filter((r: any) => r !== null && (r.prediction > 0 || r.current > 0))
      .sort((a: any, b: any) => b.prediction - a.prediction);

    const totalPrediction = analysisResults.reduce((acc: number, r: any) => acc + r.prediction, 0);
    const totalHistory = months.slice(0, -1).map(m => monthlyTotals[m] || 0);
    const totalMean = totalHistory.reduce((a, b) => a + b, 0) / Math.max(1, totalHistory.length);
    const { stdDev: totalStdDev } = calculateVariance(totalHistory, totalMean);

    const lastMonthTotal = monthlyTotals[months.at(-2)!] || 0;

    const insights = generateDynamicInsights(analysisResults, weeklyPattern, totalPrediction, lastMonthTotal);

    return {
        categories: analysisResults,
        totalPrediction,
        confidenceInterval: {
            low: Math.round(Math.max(0, totalPrediction - totalStdDev)),
            high: Math.round(totalPrediction + totalStdDev)
        },
        monthName: format(now, 'MMMM', { locale: es }),
        insights,
        weeklyPattern: {
            peakDay: weeklyPattern.peakDay,
            weekendRatio: weeklyPattern.weekendRatio
        },
        methodology: 'Holt Double Exponential Smoothing + Variance Analysis'
    };
}
