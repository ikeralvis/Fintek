/**
 * Bloqueo de la app por dispositivo: al abrir Fintek (o volver tras un rato en segundo plano)
 * se pide Face ID / huella (WebAuthn con autenticador de plataforma) y, si no hay o falla, la
 * contraseña. Es un bloqueo de interfaz local: la sesión de Supabase sigue viva, pero no se
 * muestran datos hasta desbloquear. La config vive en localStorage (por dispositivo) y una
 * cookie-pista permite al servidor pintar ya la pantalla de bloqueo sin destello de datos.
 */

export const LOCK_COOKIE = 'fintek_lock';
const CONFIG_KEY = 'fintek:appLock';
const UNLOCKED_KEY = 'fintek:unlocked';
const PROMPTED_KEY = 'fintek:lockPrompted';
const HIDDEN_AT_KEY = 'fintek:hiddenAt';

/** Segundos en segundo plano a partir de los cuales se vuelve a bloquear. */
export const RELOCK_AFTER_MS = 30_000;

export type LockConfig = {
  enabled: boolean;
  userId: string;
  /** Id (base64url) de la credencial biométrica; ausente = bloqueo solo con contraseña. */
  credentialId?: string;
};

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

export function readLockConfig(): LockConfig | null {
  return safe(() => {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as LockConfig) : null;
  }, null);
}

export function writeLockConfig(config: LockConfig | null) {
  safe(() => {
    if (config) window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    else window.localStorage.removeItem(CONFIG_KEY);
  }, undefined);
  safe(() => {
    document.cookie = config?.enabled
      ? `${LOCK_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`
      : `${LOCK_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }, undefined);
}

export function isSessionUnlocked(): boolean {
  return safe(() => window.sessionStorage.getItem(UNLOCKED_KEY) === '1', false);
}

export function setSessionUnlocked(value: boolean) {
  safe(() => {
    if (value) window.sessionStorage.setItem(UNLOCKED_KEY, '1');
    else window.sessionStorage.removeItem(UNLOCKED_KEY);
  }, undefined);
}

export function markHiddenNow() {
  safe(() => window.sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now())), undefined);
}

/** true si la app estuvo oculta más de RELOCK_AFTER_MS. Consume la marca. */
export function wasHiddenLongEnough(): boolean {
  return safe(() => {
    const raw = window.sessionStorage.getItem(HIDDEN_AT_KEY);
    window.sessionStorage.removeItem(HIDDEN_AT_KEY);
    return raw ? Date.now() - Number(raw) > RELOCK_AFTER_MS : false;
  }, false);
}

export function wasLockPrompted(): boolean {
  return safe(() => window.localStorage.getItem(PROMPTED_KEY) === '1', true);
}

export function setLockPrompted() {
  safe(() => window.localStorage.setItem(PROMPTED_KEY, '1'), undefined);
}

// --- WebAuthn (autenticador de plataforma: Face ID, Touch ID, huella, Windows Hello) ---

function toB64Url(buf: ArrayBuffer): string {
  let s = '';
  new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(str: string): Uint8Array<ArrayBuffer> {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomChallenge(): Uint8Array<ArrayBuffer> {
  const c = new Uint8Array(new ArrayBuffer(32));
  crypto.getRandomValues(c);
  return c;
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Registra una credencial biométrica en este dispositivo. Devuelve su id, o null si se cancela/falla. */
export async function registerBiometric(userId: string, email: string): Promise<string | null> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: { name: 'Fintek' },
        user: { id: new TextEncoder().encode(userId), name: email || userId, displayName: email || 'Fintek' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    return cred ? toB64Url(cred.rawId) : null;
  } catch {
    return null;
  }
}

/** Pide Face ID / huella. true = el usuario se verificó con éxito. */
export async function verifyBiometric(credentialId: string): Promise<boolean> {
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [{ type: 'public-key', id: fromB64Url(credentialId), transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}
