/**
 * Reglas de auto-categorización para la importación de movimientos bancarios.
 * Ajustadas a las categorías reales del usuario (ver CategoriesManager / lista personal)
 * y a los patrones observados en extractos de Kutxabank y Laboral Kutxa.
 *
 * El matching por nombre es exacto (case/acento-insensible): si el usuario no tiene
 * una categoría con ese nombre exacto, la regla simplemente no aplica y la fila queda
 * sin categorizar para que la revise a mano — nunca se inventa ni crea una categoría.
 */

export type CategoryRule = {
    pattern: RegExp;
    category: string;
};

// Orden importa: la primera regla que matchea gana.
export const CATEGORY_RULES: CategoryRule[] = [
    // Ingresos
    { pattern: /\bnomina\b/i, category: 'Nomina' },
    { pattern: /\bbeca\b/i, category: 'Beca' },
    { pattern: /\bliq\.?\s*int\.?\s*cta\b/i, category: 'Intereses' },
    { pattern: /ingreso\s*efectivo|\bcajero\b|deposito\s*efectivo/i, category: 'Ingreso efectivo' },
    { pattern: /imposicion\s*libreta/i, category: 'Aportacion mensual' },

    // Bizum (categoría propia, no se fuerza a transferencia)
    { pattern: /\bbizum\b/i, category: 'Bizum' },

    // Suscripciones digitales
    { pattern: /netflix|spotify|\bhbo\b|disney\+?|amazon\s*prime|icloud|youtube\s*premium|apple\.?com\/bill|apple\s*bill|todoist|claude\.?ai|anthropic|xbox|playstation\s*plus/i, category: 'Suscripcion' },

    // Starbucks tiene categoría propia
    { pattern: /starbucks/i, category: 'Starbucks' },

    // Supermercado
    { pattern: /mercadona|carrefour|eroski|\bdia\b|lidl|\baldi\b|supermercado|hipercor|condis|alcampo/i, category: 'Supermercado' },

    // Bar / cafetería (distinto de restaurante)
    { pattern: /\bbar\b|cafeteria|\bcafe\b|cerveceria/i, category: 'Bar' },

    // Restaurantes / comida a domicilio
    { pattern: /mc\s*donalds|mcdonalds|burger\s*king|\bkfc\b|telepizza|restaurante|glovo|just\s*eat|uber\s*eats/i, category: 'Restaurantes' },

    // Peluquería
    { pattern: /peluqueria|barberia|\bpelu\b/i, category: 'Pelu' },

    // Hoteles / alojamiento
    { pattern: /\bhotel\b|booking\.com|airbnb|\bhostal\b/i, category: 'Hoteles' },

    // Ropa
    { pattern: /\bzara\b|h&m|\bmango\b|primark|decathlon/i, category: 'Ropa' },

    // Transporte
    { pattern: /uber\b(?!\s*eats)|cabify|renfe|euskotren|\bmetro\b|\bbarik\b|gasolinera|repsol|cepsa|\bbp\b|parking|\btaxi\b|autobus|\bemt\b/i, category: 'Transporte' },

    // Compras (grandes superficies / electrónica / retail genérico)
    { pattern: /el corte ingles|media\s*markt|\bfnac\b|pccomponentes|worten|amazon(?!\s*prime)|aliexpress/i, category: 'Compras' },

    // Traspasos internos: redondeo automático de Kutxabank
    { pattern: /ahorra\s*las\s*vueltas/i, category: 'Redondeo' },

    // Traspasos internos: aportación periódica a ahorro
    { pattern: /cuota\s*ahorro/i, category: 'Aportacion mensual' },

    // Traspasos genéricos entre cuentas
    { pattern: /traspaso|transferencia|\btrf\.?\s*de\b|\btrfi\.?\s*de\b/i, category: 'Transferencia' },
];

/**
 * Movimientos que representan un traspaso entre cuentas (propias o de terceros
 * vía el mismo banco) en vez de un gasto/ingreso real. Incluye el redondeo
 * automático y las aportaciones periódicas: aunque son cantidades pequeñas/fijas,
 * mueven dinero de una cuenta a otra y deben registrarse como `transfer`.
 */
const TRANSFER_PATTERNS = /traspaso|transferencia|\btrf\.?\s*de\b|\btrfi\.?\s*de\b|ahorra\s*las\s*vueltas|cuota\s*ahorro/i;

export function isLikelyTransfer(description: string): boolean {
    return TRANSFER_PATTERNS.test(description);
}

export function isBizum(description: string): boolean {
    return /bizum/i.test(description);
}

/**
 * Devuelve el nombre de categoría sugerido para una descripción, o null si no hay
 * ninguna regla que aplique.
 */
export function guessCategoryName(description: string): string | null {
    for (const rule of CATEGORY_RULES) {
        if (rule.pattern.test(description)) return rule.category;
    }
    return null;
}

/**
 * Busca, sin distinguir mayúsculas/acentos, una categoría del usuario cuyo nombre
 * coincida con el sugerido por las reglas.
 */
export function findCategoryIdByName(
    categories: { id: string; name: string }[],
    name: string
): string | null {
    const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const target = normalize(name);
    const match = categories.find(c => normalize(c.name) === target);
    return match?.id ?? null;
}
