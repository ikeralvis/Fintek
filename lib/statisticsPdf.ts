import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CategoryRow, PeriodStats } from '@/lib/statistics';

type RGB = [number, number, number];
type PdfAccount = { name: string; current_balance: number; banks?: { name?: string } | null };

const INK: RGB = [24, 24, 27];
const MUTED: RGB = [113, 113, 122];
const FAINT: RGB = [161, 161, 170];
const LINE: RGB = [228, 228, 231];
const PANEL: RGB = [244, 244, 245];
const GREEN: RGB = [16, 185, 129];
const RED: RGB = [244, 63, 94];

const eur = (n: number, digits = 2) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
const pct = (r: number) => `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1).replace('.', ',')} %`;
const hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  return h.length === 6 ? [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] : MUTED;
};

/**
 * Informe PDF del periodo dibujado con primitivas de jsPDF (texto vectorial, nítido y ligero):
 * cabecera, cifras clave con comparativa, categorías con barras, evolución, comercios, ingresos
 * y saldos. jsPDF se carga solo al exportar para no engordar la página.
 */
export async function downloadStatisticsPdf(stats: PeriodStats, accounts: PdfAccount[], periodType: 'month' | 'year') {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 15;
  const CW = W - M * 2;
  let y = 0;

  const text = (t: string, x: number, yy: number, o: { size?: number; bold?: boolean; color?: RGB; align?: 'left' | 'right' | 'center' } = {}) => {
    pdf.setFontSize(o.size ?? 9);
    pdf.setFont('helvetica', o.bold ? 'bold' : 'normal');
    pdf.setTextColor(...(o.color ?? INK));
    pdf.text(t, x, yy, { align: o.align ?? 'left' });
  };
  const fill = (c: RGB) => pdf.setFillColor(...c);
  const ensure = (h: number) => { if (y + h > H - 18) { pdf.addPage(); y = 18; } };
  const section = (title: string, subtitle?: string) => {
    ensure(18);
    text(title, M, y, { size: 12, bold: true });
    if (subtitle) text(subtitle, W - M, y, { size: 8, color: MUTED, align: 'right' });
    y += 3;
    pdf.setDrawColor(...LINE);
    pdf.line(M, y, W - M, y);
    y += 6;
  };
  const changeText = (c: number | null, inverse = false) => {
    if (c === null) return { t: 'sin datos previos', color: FAINT };
    const good = inverse ? c <= 0 : c >= 0;
    return { t: `${pct(c)} vs ${stats.prevLabel}`, color: good ? GREEN : RED };
  };

  // ------------------------------------------------------------------ cabecera
  fill(INK);
  pdf.rect(0, 0, W, 34, 'F');
  text('Fintek', M, 15, { size: 20, bold: true, color: [255, 255, 255] });
  text(`Informe financiero · ${stats.label.charAt(0).toUpperCase()}${stats.label.slice(1)}`, M, 24, { size: 11, color: [212, 212, 216] });
  text(`Generado el ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, W - M, 24, { size: 8, color: FAINT, align: 'right' });
  y = 44;

  // ------------------------------------------------------------------ cifras clave
  const kpis: { label: string; value: string; color: RGB; sub: { t: string; color: RGB } }[] = [
    { label: 'Ingresos', value: eur(stats.income), color: GREEN, sub: changeText(stats.incomeChange) },
    { label: 'Gastos', value: eur(stats.expense), color: RED, sub: changeText(stats.expenseChange, true) },
    { label: 'Balance', value: `${stats.balance >= 0 ? '+' : ''}${eur(stats.balance)}`, color: stats.balance >= 0 ? GREEN : RED, sub: { t: `${stats.txCount} movimientos`, color: MUTED } },
    { label: 'Tasa de ahorro', value: `${(stats.savingsRate * 100).toFixed(1).replace('.', ',')} %`, color: INK, sub: { t: 'de lo ingresado', color: MUTED } },
  ];
  const gap = 4;
  const bw = (CW - gap * 3) / 4;
  kpis.forEach((k, i) => {
    const x = M + i * (bw + gap);
    fill(PANEL);
    pdf.roundedRect(x, y, bw, 24, 2.5, 2.5, 'F');
    text(k.label, x + 4, y + 6, { size: 8, color: MUTED });
    text(k.value, x + 4, y + 14, { size: 12, bold: true, color: k.color });
    text(k.sub.t, x + 4, y + 20, { size: 7, color: k.sub.color });
  });
  y += 34;

  // ------------------------------------------------------------------ evolución
  if (periodType === 'month') {
    section('Gasto diario', `Acumulado ${eur(stats.expense)} · ${stats.prevLabel}: ${eur(stats.prevExpense)}`);
    const chartH = 34;
    ensure(chartH + 8);
    const max = Math.max(1, ...stats.series.map(d => d.expense));
    const slot = CW / stats.series.length;
    stats.series.forEach((d, i) => {
      const h = (d.expense / max) * chartH;
      if (h > 0) {
        fill(RED);
        pdf.rect(M + i * slot + slot * 0.18, y + chartH - h, slot * 0.64, h, 'F');
      }
      if (i % 5 === 0 || i === stats.series.length - 1) text(d.label, M + i * slot + slot / 2, y + chartH + 4, { size: 6, color: FAINT, align: 'center' });
    });
    y += chartH + 10;
  } else {
    section('Mes a mes');
    const max = Math.max(1, ...stats.months.map(m => Math.max(m.income, m.expense)));
    text('Mes', M, y, { size: 7, bold: true, color: MUTED });
    text('Ingresos', M + 30, y, { size: 7, bold: true, color: MUTED });
    text('Gastos', M + 90, y, { size: 7, bold: true, color: MUTED });
    text('Balance', W - M, y, { size: 7, bold: true, color: MUTED, align: 'right' });
    y += 5;
    for (const m of stats.months) {
      ensure(7);
      text(m.label.charAt(0).toUpperCase() + m.label.slice(1), M, y, { size: 8 });
      fill(GREEN); pdf.rect(M + 30, y - 2.6, Math.max(0.3, (m.income / max) * 34), 2.6, 'F');
      text(eur(m.income, 0), M + 66, y, { size: 7, color: MUTED });
      fill(RED); pdf.rect(M + 90, y - 2.6, Math.max(0.3, (m.expense / max) * 34), 2.6, 'F');
      text(eur(m.expense, 0), M + 126, y, { size: 7, color: MUTED });
      text(`${m.balance >= 0 ? '+' : ''}${eur(m.balance, 0)}`, W - M, y, { size: 8, bold: true, color: m.balance >= 0 ? GREEN : RED, align: 'right' });
      y += 6;
    }
    y += 4;
  }

  // ------------------------------------------------------------------ categorías
  const categoryTable = (rows: CategoryRow[], inverse: boolean) => {
    const max = Math.max(1, ...rows.map(r => r.amount));
    for (const r of rows.slice(0, 14)) {
      ensure(8);
      fill(hexToRgb(r.color));
      pdf.circle(M + 1.5, y - 1.2, 1.4, 'F');
      text(r.name.length > 26 ? `${r.name.slice(0, 25)}…` : r.name, M + 5, y, { size: 8.5 });
      fill(PANEL); pdf.rect(M + 62, y - 2.8, 50, 2.8, 'F');
      fill(hexToRgb(r.color)); pdf.rect(M + 62, y - 2.8, Math.max(0.4, (r.amount / max) * 50), 2.8, 'F');
      text(`${Math.round(r.share * 100)} %`, M + 120, y, { size: 7.5, color: MUTED, align: 'right' });
      text(eur(r.amount), M + 150, y, { size: 8.5, bold: true, align: 'right' });
      const c = r.change;
      text(c === null ? 'nuevo' : pct(c), W - M, y, {
        size: 7.5, align: 'right',
        color: c === null ? FAINT : (inverse ? c <= 0 : c >= 0) ? GREEN : RED,
      });
      y += 6.5;
    }
    y += 4;
  };
  if (stats.expenseCategories.length) {
    section('Gastos por categoría', `variación vs ${stats.prevLabel}`);
    categoryTable(stats.expenseCategories, true);
  }

  // ------------------------------------------------------------------ comercios
  if (stats.topMerchants.length) {
    section('Dónde más gastas');
    for (const m of stats.topMerchants) {
      ensure(7);
      text(m.name.length > 40 ? `${m.name.slice(0, 39)}…` : m.name, M, y, { size: 8.5 });
      text(`${m.count} ${m.count === 1 ? 'compra' : 'compras'}`, M + 120, y, { size: 7.5, color: MUTED, align: 'right' });
      text(eur(m.amount), W - M, y, { size: 8.5, bold: true, align: 'right' });
      y += 6;
    }
    if (stats.micro.count > 0) {
      ensure(8);
      text(`Gasto hormiga (compras de menos de 10 €): ${eur(stats.micro.total)} en ${stats.micro.count} compras, el ${Math.round(stats.micro.share * 100)} % del gasto.`, M, y + 1, { size: 8, color: MUTED });
      y += 8;
    }
    y += 2;
  }

  // ------------------------------------------------------------------ ingresos
  if (stats.incomeCategories.length) {
    section('Ingresos por categoría');
    categoryTable(stats.incomeCategories, false);
  }

  // ------------------------------------------------------------------ saldos
  if (accounts.length) {
    section('Saldos actuales', eur(accounts.reduce((a, c) => a + Number(c.current_balance), 0)));
    for (const a of [...accounts].sort((x, z) => Number(z.current_balance) - Number(x.current_balance))) {
      ensure(7);
      text(a.name, M, y, { size: 8.5 });
      if (a.banks?.name) text(a.banks.name, M + 90, y, { size: 7.5, color: MUTED });
      text(eur(Number(a.current_balance)), W - M, y, { size: 8.5, bold: true, align: 'right' });
      y += 6;
    }
  }

  // ------------------------------------------------------------------ pie de página
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(...LINE);
    pdf.line(M, H - 12, W - M, H - 12);
    text('Fintek · informe generado automáticamente', M, H - 7, { size: 7, color: FAINT });
    text(`Página ${p} de ${pages}`, W - M, H - 7, { size: 7, color: FAINT, align: 'right' });
  }

  const fileLabel = periodType === 'month' ? stats.start.slice(0, 7) : stats.start.slice(0, 4);
  pdf.save(`Fintek_Informe_${fileLabel}.pdf`);
}
