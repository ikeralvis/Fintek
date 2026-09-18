'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'fintek:cookieConsent';

type Consent = 'accepted' | 'rejected';

function loadConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw === 'accepted' || raw === 'rejected' ? raw : null;
  } catch {
    return null;
  }
}

/** Banner discreto de consentimiento de cookies, theme-aware (usa los tokens de la app, no colores fijos). */
export default function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null>('accepted'); // evita flash en SSR; se corrige en el efecto

  useEffect(() => {
    setConsent(loadConsent());
  }, []);

  const decide = (value: Consent) => {
    setConsent(value);
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {consent === null && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-4 z-[100] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-4 md:inset-x-auto md:right-4 md:max-w-sm"
          role="dialog"
          aria-label="Consentimiento de cookies"
        >
          <div className="rounded-2xl border border-border bg-card shadow-strong p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Cookie className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Usamos cookies propias esenciales para que la app funcione y, con tu permiso, para medir el uso.
                Puedes leer más en nuestra{' '}
                <Link href="/cookies" className="text-foreground font-semibold underline underline-offset-2">
                  política de cookies
                </Link>.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => decide('rejected')}
                className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Rechazar
              </button>
              <button
                onClick={() => decide('accepted')}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
