import type { MetadataRoute } from 'next';

const SITE_URL = 'https://fintek-app.vercel.app';

/**
 * Solo incluye rutas públicas e indexables. Todo lo que vive detrás de autenticación
 * (/dashboard/**) no aporta valor de SEO y además cambia por usuario, así que se excluye
 * aquí y se marca `noindex` explícitamente en app/dashboard/layout.tsx.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/aviso-legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
