'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'fintek:cookieConsent';

function hasAcknowledged(): boolean {
  try {
    // Acepta el valor histórico ('accepted'/'rejected', de cuando el banner pedía una
    // decisión) además del nuevo 'acknowledged': ambos significan "ya lo vio", y como el
    // banner ahora es puramente informativo (solo hay cookies técnicas, no hace falta
    // consentimiento por Art. 22 LSSI-CE) no hay que volver a preguntar a nadie que ya
    // interactuó con la versión anterior.
    return window.localStorage.getItem(CONSENT_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Aviso discreto e informativo sobre cookies, theme-aware. FinTek solo usa cookies técnicas
 * (sesión de Supabase Auth) y localStorage para preferencias de interfaz — nada que requiera
 * pedir consentimiento — así que esto es un aviso de transparencia, no un muro de permisos.
 */
export default function CookieConsent() {
  const [acknowledged, setAcknowledged] = useState(true); // evita flash en SSR; se corrige en el efecto

  useEffect(() => {
    setAcknowledged(hasAcknowledged());
  }, []);

  const dismiss = () => {
    setAcknowledged(true);
    try { window.localStorage.setItem(CONSENT_KEY, 'acknowledged'); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {!acknowledged && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-4 z-100 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-4 md:inset-x-auto md:right-4 md:max-w-sm"
          role="dialog"
          aria-label="Aviso de cookies"
        >
          <div className="rounded-2xl border border-border bg-card shadow-strong p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Cookie className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Solo usamos cookies técnicas esenciales (tu sesión) y preferencias guardadas en tu navegador.
                Nada de analítica ni publicidad. Más detalle en nuestra{' '}
                <Link href="/cookies" className="text-foreground font-semibold underline underline-offset-2">
                  política de cookies
                </Link>.
              </p>
            </div>
            <button
              onClick={dismiss}
              className="mt-3 w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
