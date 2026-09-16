type CategoryLike = { id: string; name: string };

/**
 * Agrupación heurística por palabras clave: las categorías son texto libre creado por el
 * usuario (sin campo de grupo en BD), así que se clasifican por coincidencia de nombre.
 * Cualquier categoría que no encaje en ningún grupo cae en "Otras".
 */
const GROUP_KEYWORDS: { group: string; keywords: string[] }[] = [
  { group: 'Hogar', keywords: ['hogar', 'vivienda', 'alquiler', 'hipoteca', 'muebles', 'decoración', 'mascota', 'limpieza'] },
  { group: 'Alimentación', keywords: ['alimentaci', 'supermercado', 'restaur', 'bar', 'comida', 'café', 'cena', 'pintxo'] },
  { group: 'Transporte', keywords: ['transporte', 'gasolina', 'coche', 'taxi', 'parking', 'tren', 'bus', 'metro', 'uber', 'cabify'] },
  { group: 'Ocio', keywords: ['ocio', 'cine', 'viaje', 'hotel', 'deporte', 'gimnasio', 'suscripcion', 'hobby', 'juego'] },
  { group: 'Suministros', keywords: ['servicio', 'suministro', 'luz', 'agua', 'gas', 'internet', 'fibra', 'teléfono', 'telefono'] },
  { group: 'Finanzas', keywords: ['ahorro', 'inversi', 'aportacion', 'seguro', 'impuesto', 'nomina', 'nómina', 'interes', 'bizum', 'transferencia'] },
  { group: 'Salud', keywords: ['salud', 'farmacia', 'médico', 'medico', 'dentista'] },
  { group: 'Compras', keywords: ['ropa', 'compra', 'tecnolog', 'pelu'] },
];

export function categoryGroupOf(name: string): string {
  const lower = name.toLowerCase();
  const match = GROUP_KEYWORDS.find(g => g.keywords.some(k => lower.includes(k)));
  return match?.group || 'Otras';
}

const GROUP_ORDER = [...GROUP_KEYWORDS.map(g => g.group), 'Otras'];

/** Filtra por búsqueda de texto y agrupa el resultado en un orden estable de grupos lógicos. */
export function groupCategories<T extends CategoryLike>(categories: T[], query = ''): { group: string; items: T[] }[] {
  const q = query.trim().toLowerCase();
  const filtered = q ? categories.filter(c => c.name.toLowerCase().includes(q)) : categories;

  const buckets = new Map<string, T[]>();
  for (const cat of filtered) {
    const group = categoryGroupOf(cat.name);
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group)!.push(cat);
  }

  return GROUP_ORDER
    .filter(group => buckets.has(group))
    .map(group => ({ group, items: buckets.get(group)! }));
}
