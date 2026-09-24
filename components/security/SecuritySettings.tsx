'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  isBiometricAvailable, readLockConfig, registerBiometric, writeLockConfig, type LockConfig,
} from '@/lib/appLock';
import { cn } from '@/lib/utils';

type Props = { userId: string; email: string; hasPassword: boolean };

/** Ajuste "Bloquear al abrir la app" (Face ID / huella con contraseña de respaldo) de Configuración. */
export default function SecuritySettings({ userId, email, hasPassword }: Props) {
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [biometric, setBiometric] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cfg = readLockConfig();
    // localStorage solo existe en cliente: se lee tras montar para no romper la hidratación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(cfg && cfg.userId === userId ? cfg : null);
    isBiometricAvailable().then(setBiometric).finally(() => setReady(true));
  }, [userId]);

  const enabled = !!config?.enabled;
  const canLock = biometric || hasPassword;

  const save = (cfg: LockConfig | null) => {
    writeLockConfig(cfg);
    setConfig(cfg);
  };

  const toggle = async () => {
    if (busy) return;
    if (enabled) {
      save(null);
      toast.success('Bloqueo desactivado');
      return;
    }
    setBusy(true);
    const credentialId = biometric ? await registerBiometric(userId, email) : null;
    setBusy(false);
    if (credentialId) {
      save({ enabled: true, userId, credentialId });
      toast.success('Bloqueo activado con Face ID / huella');
    } else if (hasPassword) {
      save({ enabled: true, userId });
      toast.success('Bloqueo activado con contraseña');
    } else {
      toast.error('No se pudo activar. Este dispositivo no permite Face ID / huella.');
    }
  };

  const toggleBiometric = async () => {
    if (!config || busy) return;
    if (config.credentialId) {
      if (!hasPassword) {
        toast.error('Sin contraseña no puedes quitar la biometría: te quedarías sin forma de desbloquear.');
        return;
      }
      save({ enabled: true, userId });
      return;
    }
    setBusy(true);
    const credentialId = await registerBiometric(userId, email);
    setBusy(false);
    if (credentialId) {
      save({ ...config, credentialId });
      toast.success('Face ID / huella activado');
    } else {
      toast.error('No se pudo activar Face ID / huella');
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Fingerprint className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Bloquear al abrir la app</p>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? config?.credentialId
                ? 'Face ID / huella, con contraseña de respaldo'
                : 'Pide la contraseña al abrir'
              : 'Pide Face ID, huella o contraseña cada vez que abras Fintek'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Bloquear al abrir la app"
          onClick={toggle}
          disabled={!ready || busy || (!enabled && !canLock)}
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50',
            enabled ? 'bg-primary' : 'bg-muted'
          )}
        >
          {busy ? (
            <Loader2 className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin text-foreground" />
          ) : (
            <span
              className={cn(
                'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all',
                enabled ? 'left-[1.375rem]' : 'left-0.5'
              )}
            />
          )}
        </button>
      </div>

      {enabled && biometric && (
        <button
          type="button"
          onClick={toggleBiometric}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-muted/60 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
        >
          {config?.credentialId ? 'Quitar Face ID / huella (solo contraseña)' : 'Añadir Face ID / huella'}
        </button>
      )}
      {ready && !biometric && !enabled && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Este dispositivo no permite Face ID / huella{hasPassword ? '; se usará la contraseña.' : '.'}
        </p>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        La configuración es por dispositivo. Es un bloqueo de pantalla: no sustituye a cerrar sesión en equipos compartidos.
      </p>
    </div>
  );
}
