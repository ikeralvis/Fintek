'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { createClient } from '@/lib/supabase/client';
import { TurnstileWidget, TURNSTILE_SITE_KEY } from '@/components/auth/TurnstileWidget';
import { setSessionUnlocked } from '@/lib/appLock';

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
          captchaToken: captchaToken ?? undefined,
        },
      });

      if (error) throw error;

      if (data.user) {
        setSessionUnlocked(true);
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Register error:', err);
      // Mensaje genérico: evitar filtrar si el email ya existe (enumeración de usuarios)
      setError('No se pudo crear la cuenta. Comprueba los datos e inténtalo de nuevo.');
      // El token de Turnstile es de un solo uso.
      turnstileRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4">
            <img src="/logo.png" alt="Fintek Logo" className="h-10 w-10" />
            <span className="text-3xl font-bold text-primary-900">Fintek</span>
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Crear Cuenta</h1>
          <p className="text-neutral-600">Comienza a gestionar tus finanzas hoy</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-medium p-8">
          {success ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-100 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-secondary-600" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">¡Cuenta creada!</h2>
              <p className="text-neutral-600 mb-4">
                Tu cuenta ha sido creada exitosamente. Redirigiendo al dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-accent-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-accent-800">{error}</p>
                </div>
              )}

              {/* Name Input */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
                    placeholder="Juan Pérez"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
                    placeholder="••••••••"
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500">Mínimo 6 caracteres</p>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 appearance-auto accent-primary-600 border border-input bg-background rounded mt-1 cursor-pointer transition-all"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-neutral-600 cursor-pointer">
                  Acepto el{' '}
                  <Link href="/aviso-legal" className="font-semibold text-primary-600 hover:text-primary-700" target="_blank">
                    aviso legal
                  </Link>{' '}
                  y la{' '}
                  <Link href="/privacidad" className="font-semibold text-primary-600 hover:text-primary-700" target="_blank">
                    política de privacidad
                  </Link>
                </label>
              </div>

              <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />

              {/* Submit Button - MEJORADO */}
              <button
                type="submit"
                disabled={loading || (!!TURNSTILE_SITE_KEY && !captchaToken)}
                style={{
                  backgroundColor: loading ? '#94a3b8' : '#0073ea',
                  color: 'white',
                  border: 'none',
                  width: '100%',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.75rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#005bb5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#0073ea';
                  }
                }}
              >
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </form>
          )}

          {!success && (
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-600">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700">
                  Inicia sesión
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-neutral-600 hover:text-primary-600">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}