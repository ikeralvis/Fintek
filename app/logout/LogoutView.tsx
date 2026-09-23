'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, Home } from 'lucide-react';

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 25 };

export default function LogoutView() {
  return (
    <div className="min-h-screen bg-[#08090b] text-white font-sans antialiased selection:bg-white/20 flex flex-col">
      {/* Ambient background glow, igual que el landing */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.16),transparent)] blur-3xl" />
        <div className="absolute right-[-10%] top-[40%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.10),transparent)] blur-3xl" />
      </div>

      {/* Nav mínima */}
      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Fintek" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-[15px] font-semibold tracking-tight">Fintek</span>
          </Link>
        </div>
      </nav>

      {/* Contenido central */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={SPRING}
            className="mx-auto mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"
          >
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.05 }}
            className="text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl"
          >
            <span className="bg-gradient-to-b from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Sesión cerrada
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.1 }}
            className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-neutral-400"
          >
            Gracias por confiar en Fintek para cuidar de tus finanzas.
            Tu sesión se ha cerrado de forma segura en este dispositivo.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.15 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/login"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-black transition-all hover:shadow-[0_0_32px_rgba(255,255,255,0.3)] sm:w-auto"
            >
              Volver a iniciar sesión
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.07] sm:w-auto"
            >
              <Home className="h-4 w-4" />
              Ir al inicio
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Footer mínimo */}
      <footer className="relative z-10 border-t border-white/[0.06] px-5 py-6 sm:px-6">
        <p className="text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} Fintek. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
