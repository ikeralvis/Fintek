'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowRight, Sparkles, Shield, Wallet, TrendingUp, TrendingDown,
  Lock, WifiOff, Smartphone, Ban, KeyRound, Gauge, Menu, X,
  PiggyBank, LineChart as LineChartIcon,
} from 'lucide-react';
import AutoCategorizeDemo from './AutoCategorizeDemo';

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 25 };

const NAV_LINKS = [
  { href: '#features', label: 'Características' },
  { href: '#security', label: 'Seguridad' },
];

const SPARK_POINTS = [8, 22, 14, 30, 26, 42, 38, 54, 48, 66, 60, 78, 72, 92];

function sparklinePath(points: number[], width: number, height: number) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const step = width / (points.length - 1);
  return points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / (max - min || 1)) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

const SECURITY_ITEMS = [
  { icon: KeyRound, title: 'Supabase Auth', desc: 'Sesiones y contraseñas gestionadas por infraestructura de autenticación dedicada, nunca en texto plano.' },
  { icon: Lock, title: 'Cifrado en tránsito', desc: 'Todo el tráfico viaja cifrado extremo a extremo, de tu dispositivo a la base de datos.' },
  { icon: WifiOff, title: 'PWA Offline-First', desc: 'La app se instala como una nativa y sigue funcionando aunque pierdas la conexión.' },
  { icon: Gauge, title: 'Vercel Speed', desc: 'Servida desde el edge más cercano a ti: sin esperas, sin spinners de carga innecesarios.' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#08090b] text-white font-sans antialiased selection:bg-white/20">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.16),transparent)] blur-3xl" />
        <div className="absolute right-[-10%] top-[40%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.10),transparent)] blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#08090b]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Fintek" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-[15px] font-semibold tracking-tight">Fintek</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-neutral-400 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm font-medium text-neutral-300 transition-colors hover:text-white">
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:shadow-[0_0_24px_rgba(255,255,255,0.35)]"
            >
              Empezar gratis
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 text-neutral-300 md:hidden"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/[0.06] bg-[#08090b] px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm text-neutral-300">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="py-1">
                  {link.label}
                </a>
              ))}
              <Link href="/login" onClick={() => setMenuOpen(false)} className="py-1">Iniciar sesión</Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="mt-1 inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black"
              >
                Empezar gratis
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative px-5 pb-24 pt-36 sm:px-6 sm:pt-44">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="relative mx-auto mb-8 inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-neutral-300 backdrop-blur-md"
          >
            <motion.div
              className="absolute -left-1/2 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-indigo-400/40 blur-xl"
              animate={{ left: ['-20%', '120%'] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' }}
            />
            <Sparkles className="relative h-3.5 w-3.5 text-indigo-300" />
            <span className="relative">Fintek 2.0 — Control financiero de precisión</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.05 }}
            className="text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl md:text-7xl"
          >
            <span className="bg-gradient-to-b from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Tus finanzas,
            </span>
            <br />
            <span className="bg-gradient-to-b from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              bajo control absoluto
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.1 }}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-400"
          >
            Cuentas, presupuestos e inversiones en un solo sitio. Sin conectar tu banco,
            sin ceder tus credenciales a nadie.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.15 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/register"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-black transition-all hover:shadow-[0_0_32px_rgba(255,255,255,0.3)] sm:w-auto"
            >
              Comenzar gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#preview"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.07] sm:w-auto"
            >
              Ver demo
            </a>
          </motion.div>
        </div>

        {/* App mockup */}
        <motion.div
          id="preview"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ ...SPRING, delay: 0.1 }}
          className="relative mx-auto mt-20 max-w-4xl scroll-mt-24"
        >
          <div className="absolute inset-x-8 -bottom-6 top-10 -z-10 rounded-[32px] bg-gradient-to-b from-indigo-500/10 to-transparent blur-2xl" />
          <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-2 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-1.5 px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <div className="rounded-xl border border-white/5 bg-[#0c0d0f] p-5 sm:p-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                <div className="relative overflow-hidden rounded-2xl bg-neutral-800/60 p-6 sm:col-span-3">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />
                  <p className="relative text-xs font-medium uppercase tracking-wide text-white/40">Balance Total</p>
                  <p className="relative mt-1 text-4xl font-bold tabular-nums tracking-tight">28.640,50&nbsp;€</p>
                  <div className="relative mt-5 flex gap-6 border-t border-white/10 pt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">Ingresos</p>
                      <p className="flex items-center gap-1 text-sm font-semibold tabular-nums text-emerald-400">
                        <TrendingUp className="h-3.5 w-3.5" /> +3.200,00&nbsp;€
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">Gastos</p>
                      <p className="flex items-center gap-1 text-sm font-semibold tabular-nums text-rose-400">
                        <TrendingDown className="h-3.5 w-3.5" /> −1.180,40&nbsp;€
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:col-span-2">
                  {[
                    { label: 'Supermercado', amount: '−84,20 €', color: 'bg-emerald-400' },
                    { label: 'Suscripciones', amount: '−32,99 €', color: 'bg-violet-400' },
                    { label: 'Nómina', amount: '+2.100,00 €', color: 'bg-blue-400' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 rounded-xl bg-neutral-800/60 px-3.5 py-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${row.color}`} />
                      <span className="flex-1 truncate text-xs font-medium text-neutral-300">{row.label}</span>
                      <span className="text-xs font-semibold tabular-nums text-neutral-100">{row.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Bento features */}
      <section id="features" className="px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que necesitas, nada que no
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Smart Budgets */}
            <BentoCard className="md:col-span-2">
              <BentoIcon icon={PiggyBank} tone="emerald" />
              <h3 className="mt-5 text-lg font-semibold">Presupuestos inteligentes</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-400">
                Un colchón de seguridad absorbe en silencio los pequeños excesos antes de que
                se conviertan en una alerta. Solo te avisamos cuando de verdad importa.
              </p>
              <div className="mt-6 max-w-sm rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Ocio</span>
                  <span className="font-semibold tabular-nums text-amber-400">86% usado</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '86%' }}
                    transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                    className="h-full rounded-full bg-amber-400"
                  />
                </div>
                <p className="mt-2.5 text-[11px] text-neutral-500">
                  340&nbsp;€ de exceso absorbidos por tu colchón este mes
                </p>
              </div>
            </BentoCard>

            {/* Auto-categorización */}
            <BentoCard>
              <BentoIcon icon={Sparkles} tone="violet" />
              <h3 className="mt-5 text-lg font-semibold">Auto-categorización</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                Escribe el concepto y la categoría aparece sola, aprendida de tus propios hábitos.
              </p>
              <div className="mt-6">
                <AutoCategorizeDemo />
              </div>
            </BentoCard>

            {/* Inversiones */}
            <BentoCard>
              <BentoIcon icon={LineChartIcon} tone="blue" />
              <h3 className="mt-5 text-lg font-semibold">Inversiones y portfolio</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                Sigue el rendimiento real de tus fondos, separado de lo que simplemente aportas.
              </p>
              <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold tabular-nums">12.480&nbsp;€</span>
                  <span className="text-xs font-semibold text-emerald-400">+6,4%</span>
                </div>
                <svg viewBox="0 0 200 56" className="mt-3 h-14 w-full overflow-visible">
                  <defs>
                    <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d={`${sparklinePath(SPARK_POINTS, 200, 48)} L200,56 L0,56 Z`}
                    fill="url(#sparkFill)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  />
                  <motion.path
                    d={sparklinePath(SPARK_POINTS, 200, 48)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                  />
                </svg>
              </div>
            </BentoCard>

            {/* PWA & Privacidad */}
            <BentoCard className="md:col-span-2">
              <BentoIcon icon={Shield} tone="neutral" />
              <h3 className="mt-5 text-lg font-semibold">PWA &amp; privacidad primero</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-400">
                Se instala como una app nativa, responde al instante y no reparte tus datos con nadie.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: Ban, label: 'Sin rastreadores' },
                  { icon: Lock, label: 'Datos cifrados' },
                  { icon: Smartphone, label: 'Instalable y offline' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/20 px-3.5 py-3">
                    <item.icon className="h-4 w-4 shrink-0 text-neutral-400" />
                    <span className="text-xs font-medium text-neutral-300">{item.label}</span>
                  </div>
                ))}
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-t border-white/[0.06] px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Construido sobre una base sólida
          </h2>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {SECURITY_ITEMS.map((item) => (
              <div key={item.title} className="bg-[#08090b] p-6">
                <item.icon className="h-5 w-5 text-neutral-400" />
                <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-10 text-center sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Empieza en menos de un minuto</h2>
          <p className="mx-auto mt-3 max-w-md text-neutral-400">
            Gratis, sin tarjeta de crédito, sin conectar tu banco.
          </p>
          <Link
            href="/register"
            className="group mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-black transition-all hover:shadow-[0_0_32px_rgba(255,255,255,0.3)]"
          >
            Crear cuenta gratis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-5 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
            <div className="max-w-xs">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Fintek" className="h-7 w-7 rounded-lg object-cover" />
                <span className="text-[15px] font-semibold tracking-tight">Fintek</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                Gestión financiera personal simple, rápida y privada.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Producto</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-neutral-400">
                  <a href="#features" className="transition-colors hover:text-white">Características</a>
                  <a href="#security" className="transition-colors hover:text-white">Seguridad</a>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Cuenta</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-neutral-400">
                  <Link href="/login" className="transition-colors hover:text-white">Iniciar sesión</Link>
                  <Link href="/register" className="transition-colors hover:text-white">Crear cuenta</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Legal</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-neutral-400">
                  <Link href="/privacidad" className="transition-colors hover:text-white">Privacidad</Link>
                  <Link href="/aviso-legal" className="transition-colors hover:text-white">Aviso legal</Link>
                  <Link href="/cookies" className="transition-colors hover:text-white">Cookies</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-neutral-500 sm:flex-row">
            <p>© {new Date().getFullYear()} Fintek. Todos los derechos reservados.</p>
            <Wallet className="h-4 w-4 text-neutral-700" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function BentoCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04] sm:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

const ICON_TONES = {
  emerald: 'bg-emerald-500/10 text-emerald-400',
  violet: 'bg-violet-500/10 text-violet-400',
  blue: 'bg-blue-500/10 text-blue-400',
  neutral: 'bg-white/10 text-neutral-300',
} as const;

function BentoIcon({ icon: Icon, tone }: { icon: typeof Wallet; tone: keyof typeof ICON_TONES }) {
  return (
    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${ICON_TONES[tone]}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}
