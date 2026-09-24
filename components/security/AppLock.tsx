'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, Loader2, Lock, LogOut, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { createClient } from '@/lib/supabase/client';
import {
  isBiometricAvailable, isSessionUnlocked, markHiddenNow, readLockConfig, registerBiometric,
  setLockPrompted, setSessionUnlocked, verifyBiometric, wasHiddenLongEnough, wasLockPrompted,
  writeLockConfig, type LockConfig,
} from '@/lib/appLock';
import { TurnstileWidget, TURNSTILE_SITE_KEY } from '@/components/auth/TurnstileWidget';

type Props = {
  userId: string;
  email: string;
  /** false para cuentas solo-Google: no tienen contraseña con la que desbloquear. */
  hasPassword: boolean;
  /** La cookie-pista llegó en la petición: el servidor ya pinta el bloqueo sin destello de datos. */
  serverLocked: boolean;
  children: React.ReactNode;
};

export default function AppLock({ userId, email, hasPassword, serverLocked, children }: Props) {
  const [locked, setLocked] = useState(serverLocked);
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Estado inicial en cliente: ¿hay bloqueo configurado y esta sesión ya se desbloqueó?
  useEffect(() => {
    let cfg = readLockConfig();
    if (cfg && cfg.userId !== userId) {
      // Config de otra cuenta en este mismo dispositivo: no aplica a este usuario.
      writeLockConfig(null);
      cfg = null;
    }
    // localStorage solo existe en cliente: se lee tras montar para no romper la hidratación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(cfg);
    const enabled = !!cfg?.enabled || serverLocked;
    setLocked(enabled && !isSessionUnlocked());
  }, [userId, serverLocked]);

  // Volver a bloquear al regresar tras un rato en segundo plano (PWA suspendida).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        markHiddenNow();
      } else if ((readLockConfig()?.enabled || serverLocked) && wasHiddenLongEnough()) {
        setSessionUnlocked(false);
        setLocked(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [serverLocked]);

  // Invitación única a activar Face ID / huella (usuarios nuevos o sin bloqueo configurado).
  useEffect(() => {
    if (locked || config || wasLockPrompted()) return;
    let cancelled = false;
    isBiometricAvailable().then(ok => {
      if (ok && !cancelled) setTimeout(() => !cancelled && setShowPrompt(true), 1500);
    });
    return () => { cancelled = true; };
  }, [locked, config]);

  const unlock = useCallback(() => {
    setSessionUnlocked(true);
    setLocked(false);
  }, []);

  const activate = async () => {
    setLockPrompted();
    setShowPrompt(false);
    const credentialId = await registerBiometric(userId, email);
    if (!credentialId) {
      toast.error('No se pudo activar Face ID / huella. Puedes hacerlo luego en Configuración.');
      return;
    }
    const cfg: LockConfig = { enabled: true, userId, credentialId };
    writeLockConfig(cfg);
    setConfig(cfg);
    toast.success('Bloqueo activado: Fintek pedirá Face ID o huella al abrirse');
  };

  const dismissPrompt = () => {
    setLockPrompted();
    setShowPrompt(false);
  };

  return (
    <>
      <div inert={locked} aria-hidden={locked} className={locked ? 'invisible' : undefined}>
        {children}
      </div>
      {locked && (
        <LockScreen
          email={email}
          hasPassword={hasPassword}
          credentialId={config?.credentialId}
          onUnlock={unlock}
        />
      )}
      {showPrompt && !locked && (
        <div className="fixed inset-x-0 bottom-0 z-[150] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slide-up">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-strong">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Protege tu dinero</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pide Face ID o huella al abrir Fintek. Si falla, te pedirá la contraseña.
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={dismissPrompt}
                className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-semibold text-muted-foreground"
              >
                Ahora no
              </button>
              <button
                onClick={activate}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Activar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LockScreen({
  email, hasPassword, credentialId, onUnlock,
}: {
  email: string;
  hasPassword: boolean;
  credentialId?: string;
  onUnlock: () => void;
}) {
  const [usePassword, setUsePassword] = useState(!credentialId);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const autoTried = useRef(false);

  const tryBiometric = useCallback(async () => {
    if (!credentialId) return;
    setError('');
    const ok = await verifyBiometric(credentialId);
    if (ok) onUnlock();
    else setError('No se pudo verificar. Inténtalo de nuevo o usa tu contraseña.');
  }, [credentialId, onUnlock]);

  // Lanza Face ID solo al abrir. Safari puede exigir un toque previo: si lo rechaza, queda el botón.
  useEffect(() => {
    if (!credentialId || autoTried.current) return;
    autoTried.current = true;
    (async () => {
      const ok = await verifyBiometric(credentialId);
      if (ok) onUnlock();
    })();
  }, [credentialId, onUnlock]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    setBusy(false);
    if (authError) {
      setError('Contraseña incorrecta');
      setPassword('');
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }
    onUnlock();
  };

  const captchaPending = !!TURNSTILE_SITE_KEY && !captchaToken;
  // Sin biometría configurada (o si el usuario la descarta) el acceso es la contraseña.
  const showPasswordForm = hasPassword && usePassword;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-background px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Halo suave de fondo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(closest-side,var(--muted),transparent)] opacity-70" />

      <div className="relative m-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-border bg-card shadow-sm">
          <img src="/logo.png" alt="Fintek" className="h-12 w-12 rounded-2xl object-cover" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Bienvenido de nuevo</h1>
        <p className="mt-1.5 truncate text-sm text-muted-foreground">{email}</p>

        {!showPasswordForm && credentialId && (
          <div className="mt-10 space-y-3">
            <button
              onClick={tryBiometric}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-transform active:scale-[0.98]"
            >
              <Fingerprint className="h-5 w-5" />
              Desbloquear
            </button>
            {hasPassword && (
              <button
                onClick={() => { setError(''); setUsePassword(true); }}
                className="w-full py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                No quiero usar la huella
              </button>
            )}
          </div>
        )}

        {showPasswordForm && (
          <form onSubmit={handlePassword} className="mt-10 space-y-3 text-left">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                autoFocus
                className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-12 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />
            <button
              type="submit"
              disabled={!password || busy || captchaPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Desbloquear
            </button>
            {credentialId && (
              <button
                type="button"
                onClick={() => { setError(''); setUsePassword(false); }}
                className="w-full py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Usar huella
              </button>
            )}
          </form>
        )}

        {!hasPassword && !credentialId && (
          <p className="mt-8 text-sm text-muted-foreground">
            Tu cuenta usa Google. Vuelve a iniciar sesión para continuar.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-600 dark:text-accent-400">
            {error}
          </p>
        )}
      </div>

      <form action="/api/auth/signout" method="post" className="relative mt-8 flex justify-center">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
