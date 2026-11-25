/**
 * Catálogo local de servicios de suscripción habituales en España. Sirve para dar a cada pago
 * automático una "marca" (color + monograma) sin cargar logos de terceros — la CSP no lo
 * permite y además filtraría a un servicio externo qué suscripciones tiene el usuario — y para
 * autocompletar el formulario (frecuencia y categoría sugerida) al escribir el nombre.
 */

export type ServiceKind = 'streaming' | 'music' | 'software' | 'telecom' | 'utilities' | 'gym' | 'gaming' | 'delivery' | 'reading';

export type KnownService = {
  key: string;
  name: string;
  /** Fragmentos (normalizados, sin tildes) que identifican el servicio en el nombre. */
  aliases: string[];
  bg: string;
  fg: string;
  mark: string;
  kind: ServiceKind;
  cycle?: 'monthly' | 'yearly';
};

export const KNOWN_SERVICES: KnownService[] = [
  { key: 'netflix', name: 'Netflix', aliases: ['netflix'], bg: '#141414', fg: '#E50914', mark: 'N', kind: 'streaming' },
  { key: 'spotify', name: 'Spotify', aliases: ['spotify'], bg: '#1DB954', fg: '#000000', mark: 'S', kind: 'music' },
  { key: 'prime', name: 'Amazon Prime', aliases: ['amazon prime', 'prime video', 'amazon'], bg: '#00A8E1', fg: '#FFFFFF', mark: 'P', kind: 'streaming', cycle: 'yearly' },
  { key: 'disney', name: 'Disney+', aliases: ['disney'], bg: '#0E1A5C', fg: '#FFFFFF', mark: 'D+', kind: 'streaming' },
  { key: 'max', name: 'Max', aliases: ['hbo', 'max'], bg: '#002BE7', fg: '#FFFFFF', mark: 'M', kind: 'streaming' },
  { key: 'movistar-plus', name: 'Movistar Plus+', aliases: ['movistar+', 'movistar plus'], bg: '#0B2739', fg: '#00A9E0', mark: 'M+', kind: 'streaming' },
  { key: 'dazn', name: 'DAZN', aliases: ['dazn'], bg: '#0C161C', fg: '#F7FF1A', mark: 'DA', kind: 'streaming' },
  { key: 'filmin', name: 'Filmin', aliases: ['filmin'], bg: '#111111', fg: '#FFFFFF', mark: 'F', kind: 'streaming' },
  { key: 'skyshowtime', name: 'SkyShowtime', aliases: ['skyshowtime'], bg: '#0A0A23', fg: '#FFFFFF', mark: 'SK', kind: 'streaming' },
  { key: 'crunchyroll', name: 'Crunchyroll', aliases: ['crunchyroll'], bg: '#F47521', fg: '#FFFFFF', mark: 'C', kind: 'streaming' },
  { key: 'appletv', name: 'Apple TV+', aliases: ['apple tv'], bg: '#000000', fg: '#FFFFFF', mark: 'tv', kind: 'streaming' },
  { key: 'youtube', name: 'YouTube Premium', aliases: ['youtube'], bg: '#FF0000', fg: '#FFFFFF', mark: '▶', kind: 'streaming' },
  { key: 'twitch', name: 'Twitch', aliases: ['twitch'], bg: '#9146FF', fg: '#FFFFFF', mark: 'T', kind: 'streaming' },
  { key: 'applemusic', name: 'Apple Music', aliases: ['apple music'], bg: '#FA243C', fg: '#FFFFFF', mark: '♪', kind: 'music' },
  { key: 'tidal', name: 'Tidal', aliases: ['tidal'], bg: '#000000', fg: '#FFFFFF', mark: 'TI', kind: 'music' },
  { key: 'deezer', name: 'Deezer', aliases: ['deezer'], bg: '#A238FF', fg: '#FFFFFF', mark: 'DZ', kind: 'music' },
  { key: 'audible', name: 'Audible', aliases: ['audible'], bg: '#F8991C', fg: '#000000', mark: 'A', kind: 'reading' },
  { key: 'kindle', name: 'Kindle Unlimited', aliases: ['kindle'], bg: '#232F3E', fg: '#FF9900', mark: 'K', kind: 'reading' },
  { key: 'storytel', name: 'Storytel', aliases: ['storytel'], bg: '#FF5C28', fg: '#FFFFFF', mark: 'ST', kind: 'reading' },
  { key: 'icloud', name: 'iCloud+', aliases: ['icloud'], bg: '#3693F3', fg: '#FFFFFF', mark: '☁', kind: 'software' },
  { key: 'googleone', name: 'Google One', aliases: ['google one', 'google'], bg: '#FFFFFF', fg: '#4285F4', mark: 'G', kind: 'software' },
  { key: 'm365', name: 'Microsoft 365', aliases: ['microsoft', 'office 365', 'm365'], bg: '#D83B01', fg: '#FFFFFF', mark: 'MS', kind: 'software', cycle: 'yearly' },
  { key: 'adobe', name: 'Adobe', aliases: ['adobe'], bg: '#FA0F00', fg: '#FFFFFF', mark: 'Ad', kind: 'software' },
  { key: 'chatgpt', name: 'ChatGPT Plus', aliases: ['chatgpt', 'openai'], bg: '#10A37F', fg: '#FFFFFF', mark: 'AI', kind: 'software' },
  { key: 'claude', name: 'Claude Pro', aliases: ['claude', 'anthropic'], bg: '#D97757', fg: '#FFFFFF', mark: 'C', kind: 'software' },
  { key: 'notion', name: 'Notion', aliases: ['notion'], bg: '#FFFFFF', fg: '#000000', mark: 'N', kind: 'software' },
  { key: 'dropbox', name: 'Dropbox', aliases: ['dropbox'], bg: '#0061FF', fg: '#FFFFFF', mark: 'DB', kind: 'software' },
  { key: 'canva', name: 'Canva', aliases: ['canva'], bg: '#7D2AE8', fg: '#FFFFFF', mark: 'C', kind: 'software' },
  { key: 'duolingo', name: 'Duolingo', aliases: ['duolingo'], bg: '#58CC02', fg: '#FFFFFF', mark: 'D', kind: 'software', cycle: 'yearly' },
  { key: 'gamepass', name: 'Xbox Game Pass', aliases: ['game pass', 'xbox'], bg: '#107C10', fg: '#FFFFFF', mark: 'X', kind: 'gaming' },
  { key: 'psplus', name: 'PlayStation Plus', aliases: ['playstation', 'ps plus'], bg: '#003791', fg: '#FFFFFF', mark: 'PS', kind: 'gaming', cycle: 'yearly' },
  { key: 'nintendo', name: 'Nintendo Switch Online', aliases: ['nintendo'], bg: '#E60012', fg: '#FFFFFF', mark: 'NS', kind: 'gaming', cycle: 'yearly' },
  { key: 'movistar', name: 'Movistar', aliases: ['movistar'], bg: '#019DF4', fg: '#FFFFFF', mark: 'M', kind: 'telecom' },
  { key: 'vodafone', name: 'Vodafone', aliases: ['vodafone'], bg: '#E60000', fg: '#FFFFFF', mark: 'V', kind: 'telecom' },
  { key: 'orange', name: 'Orange', aliases: ['orange'], bg: '#FF7900', fg: '#000000', mark: 'O', kind: 'telecom' },
  { key: 'digi', name: 'Digi', aliases: ['digi'], bg: '#1E4B9B', fg: '#FFFFFF', mark: 'DG', kind: 'telecom' },
  { key: 'masmovil', name: 'MásMóvil', aliases: ['masmovil'], bg: '#FFD200', fg: '#1D1D1B', mark: 'MM', kind: 'telecom' },
  { key: 'jazztel', name: 'Jazztel', aliases: ['jazztel'], bg: '#FFC600', fg: '#000000', mark: 'J', kind: 'telecom' },
  { key: 'pepephone', name: 'Pepephone', aliases: ['pepephone'], bg: '#E4003A', fg: '#FFFFFF', mark: 'PP', kind: 'telecom' },
  { key: 'lowi', name: 'Lowi', aliases: ['lowi'], bg: '#00D2B4', fg: '#000000', mark: 'L', kind: 'telecom' },
  { key: 'simyo', name: 'Simyo', aliases: ['simyo'], bg: '#FF6600', fg: '#FFFFFF', mark: 'S', kind: 'telecom' },
  { key: 'iberdrola', name: 'Iberdrola', aliases: ['iberdrola'], bg: '#5CB615', fg: '#FFFFFF', mark: 'I', kind: 'utilities' },
  { key: 'endesa', name: 'Endesa', aliases: ['endesa'], bg: '#0555FA', fg: '#FFFFFF', mark: 'E', kind: 'utilities' },
  { key: 'naturgy', name: 'Naturgy', aliases: ['naturgy'], bg: '#E57200', fg: '#FFFFFF', mark: 'N', kind: 'utilities' },
  { key: 'repsol', name: 'Repsol', aliases: ['repsol'], bg: '#FF8200', fg: '#FFFFFF', mark: 'R', kind: 'utilities' },
  { key: 'basicfit', name: 'Basic-Fit', aliases: ['basic-fit', 'basic fit', 'basicfit'], bg: '#FE7000', fg: '#FFFFFF', mark: 'BF', kind: 'gym' },
  { key: 'mcfit', name: 'McFit', aliases: ['mcfit'], bg: '#E30613', fg: '#FFFFFF', mark: 'Mc', kind: 'gym' },
  { key: 'glovo', name: 'Glovo Prime', aliases: ['glovo'], bg: '#FFC244', fg: '#00A082', mark: 'G', kind: 'delivery' },
  { key: 'uber', name: 'Uber One', aliases: ['uber'], bg: '#000000', fg: '#FFFFFF', mark: 'U', kind: 'delivery' },
];

/** Los que se ofrecen como atajo en el formulario cuando el nombre está vacío. */
export const POPULAR_SERVICE_KEYS = ['netflix', 'spotify', 'prime', 'disney', 'max', 'youtube', 'icloud', 'chatgpt'];

/** Palabras (normalizadas) que buscamos en el nombre de las categorías del usuario. */
const KIND_CATEGORY_HINTS: Record<ServiceKind, string[]> = {
  streaming: ['suscrip', 'streaming', 'entreten', 'ocio'],
  music: ['suscrip', 'musica', 'entreten', 'ocio'],
  reading: ['suscrip', 'libro', 'lectura', 'educa', 'ocio'],
  software: ['suscrip', 'software', 'tecnolog', 'servicio'],
  gaming: ['suscrip', 'videojuego', 'juego', 'ocio'],
  telecom: ['telefon', 'movil', 'internet', 'comunica', 'factura', 'hogar'],
  utilities: ['luz', 'electric', 'energia', 'gas', 'suministro', 'factura', 'hogar'],
  gym: ['gimnas', 'deporte', 'salud', 'fitness'],
  delivery: ['suscrip', 'comida', 'restaura', 'delivery'],
};

export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Busca el servicio conocido que mejor encaja con el nombre (el alias más largo gana). */
export function matchService(name: string): KnownService | null {
  const n = normalize(name);
  if (n.length < 2) return null;
  let best: KnownService | null = null;
  let bestLen = 0;
  for (const s of KNOWN_SERVICES) {
    for (const alias of s.aliases) {
      // Alias muy cortos ("max", "digi") solo cuentan como palabra completa.
      const hit = alias.length <= 4
        ? new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(n)
        : n.includes(alias);
      if (hit && alias.length > bestLen) { best = s; bestLen = alias.length; }
    }
  }
  return best;
}

export function suggestCategoryId<C extends { id: string; name: string }>(service: KnownService, categories: C[]): string | null {
  for (const hint of KIND_CATEGORY_HINTS[service.kind]) {
    const cat = categories.find(c => normalize(c.name).includes(hint));
    if (cat) return cat.id;
  }
  return null;
}

/** Monograma para nombres que no están en el catálogo: iniciales de hasta 2 palabras. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** true si el color (hex #rrggbb) es tan claro que necesita borde/contraste sobre fondo claro. */
export function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}
