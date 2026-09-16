export type Suggestion = {
  label: string;
  description: string;
  category: string;
  amount?: number;
  type?: 'expense' | 'income';
};

export const SUGGESTIONS: Suggestion[] = [
  // Alimentación / Supermercado
  { label: 'Mercadona', description: 'Mercadona', category: 'Alimentación', type: 'expense' },
  { label: 'Lidl', description: 'Lidl', category: 'Alimentación', type: 'expense' },
  { label: 'Carrefour', description: 'Carrefour', category: 'Alimentación', type: 'expense' },
  { label: 'Eroski', description: 'Eroski', category: 'Alimentación', type: 'expense' },
  { label: 'Aldi', description: 'Aldi', category: 'Alimentación', type: 'expense' },
  { label: 'Dia', description: 'Dia', category: 'Alimentación', type: 'expense' },
  { label: 'BM', description: 'BM Supermercados', category: 'Supermercado', type: 'expense' },
  { label: 'Compra semanal', description: 'Compra semanal', category: 'Alimentación', type: 'expense' },

  // Restauración / Bar
  { label: 'Starbucks', description: 'Starbucks', category: 'Starbucks', type: 'expense' },
  { label: 'Café', description: 'Café', category: 'Bar', type: 'expense' },
  { label: 'Restaurante', description: 'Restaurante', category: 'Restaurantes', type: 'expense' },
  { label: 'Cena', description: 'Cena fuera', category: 'Restaurantes', type: 'expense' },
  { label: 'Comida', description: 'Comida fuera', category: 'Restauración', type: 'expense' },
  { label: 'Bar', description: 'Bar', category: 'Bar', type: 'expense' },
  { label: 'Pintxos', description: 'Pintxos', category: 'Bar', type: 'expense' },
  { label: 'McDonald\'s', description: 'McDonald\'s', category: 'Restauración', type: 'expense' },
  { label: 'Burger King', description: 'Burger King', category: 'Restauración', type: 'expense' },

  // Transporte
  { label: 'Gasolina', description: 'Gasolina', category: 'Transporte', type: 'expense' },
  { label: 'Gasolinera', description: 'Gasolinera', category: 'Transporte', type: 'expense' },
  { label: 'Bus', description: 'Autobús', category: 'Transporte', type: 'expense' },
  { label: 'Metro', description: 'Metro', category: 'Transporte', type: 'expense' },
  { label: 'Taxi', description: 'Taxi', category: 'Transporte', type: 'expense' },
  { label: 'Uber', description: 'Uber', category: 'Transporte', type: 'expense' },
  { label: 'Cabify', description: 'Cabify', category: 'Transporte', type: 'expense' },
  { label: 'Parking', description: 'Parking', category: 'Transporte', type: 'expense' },
  { label: 'Tren', description: 'Tren', category: 'Transporte', type: 'expense' },

  // Suscripciones
  { label: 'Netflix', description: 'Netflix', category: 'Suscripciones', amount: 17.99, type: 'expense' },
  { label: 'Spotify', description: 'Spotify', category: 'Suscripciones', amount: 10.99, type: 'expense' },
  { label: 'HBO', description: 'HBO Max', category: 'Suscripciones', amount: 8.99, type: 'expense' },
  { label: 'Amazon Prime', description: 'Amazon Prime', category: 'Suscripciones', amount: 4.99, type: 'expense' },
  { label: 'Disney+', description: 'Disney+', category: 'Suscripciones', amount: 8.99, type: 'expense' },
  { label: 'YouTube Premium', description: 'YouTube Premium', category: 'Suscripciones', amount: 11.99, type: 'expense' },
  { label: 'iCloud', description: 'iCloud', category: 'Suscripciones', amount: 0.99, type: 'expense' },
  { label: 'ChatGPT', description: 'ChatGPT Plus', category: 'Suscripciones', amount: 20.00, type: 'expense' },
  { label: 'Gimnasio', description: 'Gimnasio', category: 'Deportes', type: 'expense' },

  // Servicios
  { label: 'Luz', description: 'Factura luz', category: 'Servicios', type: 'expense' },
  { label: 'Agua', description: 'Factura agua', category: 'Servicios', type: 'expense' },
  { label: 'Gas', description: 'Factura gas', category: 'Servicios', type: 'expense' },
  { label: 'Internet', description: 'Internet/Fibra', category: 'Servicios', type: 'expense' },
  { label: 'Teléfono', description: 'Factura teléfono', category: 'Servicios', type: 'expense' },
  { label: 'Seguro', description: 'Seguro', category: 'Servicios', type: 'expense' },

  // Ocio
  { label: 'Cine', description: 'Cine', category: 'Ocio', type: 'expense' },

  // Salud
  { label: 'Farmacia', description: 'Farmacia', category: 'Salud', type: 'expense' },
  { label: 'Médico', description: 'Médico', category: 'Salud', type: 'expense' },
  { label: 'Dentista', description: 'Dentista', category: 'Salud', type: 'expense' },

  // Tecnología
  { label: 'Amazon', description: 'Amazon', category: 'Tecnología', type: 'expense' },
  { label: 'Apple', description: 'Apple', category: 'Tecnología', type: 'expense' },

  // Compras / Ropa
  { label: 'Zara', description: 'Zara', category: 'Ropa', type: 'expense' },
  { label: 'Primark', description: 'Primark', category: 'Ropa', type: 'expense' },
  { label: 'H&M', description: 'H&M', category: 'Ropa', type: 'expense' },
  { label: 'Compras', description: 'Compras', category: 'Compras', type: 'expense' },

  // Viajes / Hoteles
  { label: 'Hotel', description: 'Hotel', category: 'Hoteles', type: 'expense' },
  { label: 'Vuelo', description: 'Vuelo', category: 'Viajes', type: 'expense' },
  { label: 'Airbnb', description: 'Airbnb', category: 'Hoteles', type: 'expense' },

  // Peluquería
  { label: 'Peluquería', description: 'Peluquería', category: 'Pelu', type: 'expense' },
  { label: 'Pelu', description: 'Peluquería', category: 'Pelu', type: 'expense' },

  // Ingresos
  { label: 'Nómina', description: 'Nómina', category: 'Nomina', type: 'income' },
  { label: 'Bizum', description: 'Bizum recibido', category: 'Bizum', type: 'income' },
  { label: 'Transferencia', description: 'Transferencia recibida', category: 'Transferencia', type: 'income' },
  { label: 'Beca', description: 'Beca', category: 'Beca', type: 'income' },
  { label: 'Ingreso efectivo', description: 'Ingreso en efectivo', category: 'Ingreso efectivo', type: 'income' },
  { label: 'Intereses', description: 'Intereses cuenta', category: 'Intereses', type: 'income' },
  { label: 'Redondeo', description: 'Redondeo', category: 'Redondeo', type: 'income' },

  // Ahorro
  { label: 'Ahorro', description: 'Aportación ahorro', category: 'Ahorro', type: 'expense' },
  { label: 'Aportación', description: 'Aportación mensual', category: 'Aportacion mensual', type: 'expense' },
];

type CategoryLike = { id: string; name: string };

/** Busca una categoría existente del usuario cuyo nombre coincide exactamente (case-insensitive). */
export function findCategoryByName<T extends CategoryLike>(categories: T[], name: string): T | undefined {
  const lower = name.toLowerCase();
  return categories.find(c => c.name.toLowerCase() === lower);
}

/**
 * Auto-categorización en tiempo real: intenta encontrar la categoría que mejor encaja con el
 * texto que el usuario está escribiendo en el título/concepto, sin necesidad de que elija
 * explícitamente una sugerencia del desplegable.
 *
 * Pensada para ser "ultra-rápida pero no invasiva": con muy poco texto (1-2 letras) es
 * fácil que muchas cosas "coincidan" por casualidad (ej. "ca" dentro de "Cabify"), así que
 * exige más señal cuanto más débil es la coincidencia:
 *   1) exacto o "empieza por" contra el listado de comercios/conceptos conocidos (rápido y fiable)
 *   2) exacto o "empieza por" contra el nombre real de una categoría del usuario
 *   3) solo como último recurso, y solo con 4+ caracteres, coincidencia de subcadena
 */
export function matchCategoryFromText<T extends CategoryLike>(text: string, categories: T[]): T | undefined {
  const query = text.trim().toLowerCase();
  if (query.length < 3) return undefined;

  const exactSuggestion = SUGGESTIONS.find(s => s.label.toLowerCase() === query || s.description.toLowerCase() === query);
  if (exactSuggestion) {
    const cat = findCategoryByName(categories, exactSuggestion.category);
    if (cat) return cat;
  }

  const prefixSuggestion = SUGGESTIONS.find(s => {
    const label = s.label.toLowerCase();
    return label.startsWith(query) || query.startsWith(label);
  });
  if (prefixSuggestion) {
    const cat = findCategoryByName(categories, prefixSuggestion.category);
    if (cat) return cat;
  }

  const exactCategory = categories.find(c => c.name.toLowerCase() === query);
  if (exactCategory) return exactCategory;

  const prefixCategory = categories.find(c => {
    const name = c.name.toLowerCase();
    return name.startsWith(query) || query.startsWith(name);
  });
  if (prefixCategory) return prefixCategory;

  if (query.length >= 4) {
    const substringSuggestion = SUGGESTIONS.find(s => {
      const label = s.label.toLowerCase();
      return query.includes(label) || label.includes(query);
    });
    if (substringSuggestion) {
      const cat = findCategoryByName(categories, substringSuggestion.category);
      if (cat) return cat;
    }
  }

  return undefined;
}
