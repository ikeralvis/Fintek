'use client';

import { forwardRef } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Props = {
  onToken: (token: string | null) => void;
  className?: string;
};

/**
 * CAPTCHA de Cloudflare Turnstile para Supabase Auth (Bot Protection). Sin
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY no se pinta nada (útil en local si el captcha está apagado).
 * El token es de un solo uso: tras cada intento hay que hacer `ref.current?.reset()`.
 */
export const TurnstileWidget = forwardRef<TurnstileInstance | undefined, Props>(function TurnstileWidget(
  { onToken, className },
  ref
) {
  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <Turnstile
      ref={ref}
      siteKey={TURNSTILE_SITE_KEY}
      className={className}
      options={{ theme: 'auto', size: 'flexible', language: 'es' }}
      onSuccess={onToken}
      onExpire={() => onToken(null)}
      onError={() => onToken(null)}
    />
  );
});
