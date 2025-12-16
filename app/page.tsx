import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BarChart3, PiggyBank, Wallet, Shield, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-primary-100 selection:text-primary-900">

      {/* Navbar Minimalista */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-2 rounded-xl">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900 tracking-tight">FinTek</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-neutral-600 hover:text-primary-600 transition-colors hidden sm:block"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="bg-neutral-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200"
            >
              Empezar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-bold mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            Nueva Versión 2.0 con IA Predictiva
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-neutral-950 mb-8 tracking-tight leading-[1.1]">
            Tus finanzas, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-700 to-indigo-600">
              en piloto automático.
            </span>
          </h1>

          <p className="text-xl text-neutral-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Deja de pelear con hojas de cálculo. FinTek analiza, categoriza y predice tus gastos para que tomes mejores decisiones sin esfuerzo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-700 text-black rounded-2xl font-bold text-lg transition-all shadow-xl shadow-primary-200 flex items-center justify-center gap-2 group"
            >
              Crear Cuenta Gratis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              Acceder
            </Link>
          </div>

          {/* Mockup / Visual */}
          <div className="mt-20 relative mx-auto max-w-4xl">
            <div className="absolute -inset-1 bg-linear-to-r from-primary-500 to-purple-600 rounded-[2.5rem] blur opacity-20"></div>
            <div className="relative bg-white rounded-4xl border border-neutral-200 shadow-2xl overflow-hidden p-2 md:p-4">
              <Image
                src="/dashboard-preview.png"
                alt="App Dashboard"
                className="rounded-xl w-full h-auto bg-neutral-50"
                width={1200}
                height={700}
                priority={false}
              />
              {/* Safe fallback if image missing: Simulated UI Header */}
              <div className="absolute inset-0 bg-neutral-50 flex flex-col items-center justify-center text-neutral-300 pointer-events-none -z-10">
                <BarChart3 className="w-24 h-24 mb-4 opacity-50" />
                <span className="text-sm font-medium">Vista Previa del Dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase - Bento Grid Style */}
      <section className="py-24 bg-neutral-50">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Todo lo que necesitas, nada de relleno.</h2>
            <p className="text-neutral-500 max-w-xl mx-auto">Diseñado para ser rápido, bonito y útil. Sin configuraciones eternas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Large */}
            <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-3">Análisis Predictivo Híbrido</h3>
                <p className="text-neutral-500 leading-relaxed max-w-md">
                  No solo te dice cuánto has gastado, sino cuánto <strong>vas a gastar</strong>. Nuestro algoritmo se adapta a tu historial (3, 6, o 12 meses) para darte una visión clara del futuro.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 w-1/3 h-full bg-linear-to-l from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            {/* Feature 2: Tall */}
            <div className="md:row-span-2 bg-neutral-900 rounded-3xl p-8 border border-neutral-800 shadow-xl text-white flex flex-col justify-between overflow-hidden relative">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">100% Privado</h3>
                <p className="text-neutral-400 leading-relaxed">
                  Tus datos son tuyos. Utilizamos Row Level Security (RLS) para garantizar que nadie más pueda ver tus movimientos.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-bold text-primary-400">SSL</div>
                  <div className="text-neutral-500 text-xs uppercase tracking-wider font-bold mt-1">Encriptado</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-400">24/7</div>
                  <div className="text-neutral-500 text-xs uppercase tracking-wider font-bold mt-1">Monitoreo</div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 text-amber-600">
                <PiggyBank className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Ahorro Inteligente</h3>
              <p className="text-neutral-500 text-sm">
                Detectamos patrones de gasto y te avisamos cuando te desvías de lo habitual.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Multi-Cuenta</h3>
              <p className="text-neutral-500 text-sm">
                Agrupa bancos, efectivo y tarjetas. Visualiza tu patrimonio neto real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Minimal */}
      <footer className="bg-white border-t border-neutral-100 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-neutral-900 p-1.5 rounded-lg">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-neutral-900">FinTek</span>
          </div>
          <p className="text-neutral-400 text-sm">
            © 2025 FinTek Inc. Hecho con ❤️ para tus finanzas.
          </p>
        </div>
      </footer>
    </div>
  );
}