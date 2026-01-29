import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Shield, Zap, PieChart, Wallet } from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-blue-100">
      {/* Navbar */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md border-b border-neutral-100 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="FinTek Logo"
              className="w-8 h-8 rounded-xl object-cover"
            />
            <span className="text-xl font-bold tracking-tight">FinTek</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Características</a>
            <a href="#how" className="hover:text-blue-600 transition-colors">Cómo funciona</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Precios</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-blue-600 transition-colors">
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-neutral-900 text-white text-sm font-bold rounded-full hover:bg-neutral-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-neutral-900/20"
            >
              Empezar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-medium text-sm mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Nueva versión 2.0 disponible
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1] animate-fade-in-up delay-100 text-neutral-900">
            Domina tus finanzas <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              con inteligencia artificial
            </span>
          </h1>

          <p className="text-xl text-neutral-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            Gestiona todas tus cuentas bancarias, controla tus gastos y recibe predicciones financieras personalizadas en una sola app.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 flex items-center justify-center gap-2 group"
            >
              Crear cuenta gratis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-8 py-4 bg-white border border-neutral-200 text-neutral-900 font-bold rounded-2xl hover:bg-neutral-50 transition-all hover:border-neutral-300 flex items-center justify-center"
            >
              Ver demostración
            </a>
          </div>

          {/* Abstract UI Preview */}
          <div className="mt-20 relative max-w-5xl mx-auto animate-fade-in-up delay-500">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10"></div>
            <div className="bg-neutral-900 rounded-[32px] p-2 shadow-2xl shadow-blue-900/20 border border-neutral-800">
              <div className="bg-neutral-950 rounded-[28px] overflow-hidden aspect-[16/9] md:aspect-[21/9] flex items-center justify-center relative">
                {/* Mock UI Elements */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.15),transparent_50%)]"></div>
                <p className="text-neutral-700 font-medium">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-neutral-50">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Wallet,
                title: "Multi-Bancos",
                desc: "Conecta todas tus cuentas (Santander, BBVA, CaixaBank...) en un solo lugar seguro."
              },
              {
                icon: Zap,
                title: "Predicciones IA",
                desc: "Nuestra IA analiza tus patrones y te avisa de gastos futuros y posibles ahorros."
              },
              {
                icon: Shield,
                title: "100% Seguro",
                desc: "Encriptación de grado bancario. Tus credenciales nunca tocan nuestros servidores."
              }
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center mb-6">
                  <f.icon className="w-6 h-6 text-neutral-900" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">{f.title}</h3>
                <p className="text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}