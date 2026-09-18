'use client';

import { useEffect } from 'react';

/**
 * Registra el Service Worker (caché de assets estáticos + soporte offline básico, además
 * de los listeners de push ya existentes) en cuanto carga cualquier página, en vez de
 * depender únicamente de que el usuario active las notificaciones push para instalarlo.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => { /* PWA opcional: no crítico si falla */ });
  }, []);

  return null;
}
