type TxLike = { category_id?: string | null; type: string; transaction_date: string };

/**
 * Top N categorías más usadas/recientes para un tipo de movimiento dado, a partir del
 * historial de transacciones ya cargado en el DashboardContext (sin llamadas extra al server).
 * Empata por frecuencia y desempata por la fecha de uso más reciente.
 */
export function getFrequentCategoryIds(transactions: TxLike[], type: 'expense' | 'income', limit = 5): string[] {
  const stats = new Map<string, { count: number; lastDate: string }>();

  for (const t of transactions) {
    if (t.type !== type || !t.category_id) continue;
    const existing = stats.get(t.category_id);
    if (existing) {
      existing.count += 1;
      if (t.transaction_date > existing.lastDate) existing.lastDate = t.transaction_date;
    } else {
      stats.set(t.category_id, { count: 1, lastDate: t.transaction_date });
    }
  }

  return Array.from(stats.entries())
    .sort((a, b) => b[1].count - a[1].count || b[1].lastDate.localeCompare(a[1].lastDate))
    .slice(0, limit)
    .map(([categoryId]) => categoryId);
}
