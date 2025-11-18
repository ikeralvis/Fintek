import Link from 'next/link';
import { ArrowRight, BarChart3, PiggyBank, Wallet, Shield } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold text-primary-900">FinTek</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              href="/login"
              className="text-neutral-600 hover:text-primary-600 font-medium transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link 
              href="/register"
              style={{
                backgroundColor: '#0073ea',
                color: 'white',
                padding: '0.625rem 1.5rem',
                borderRadius: '0.75rem',
                fontWeight: '600',
                display: 'inline-block',
                textDecoration: 'none',
              }}
              className="hover:bg-primary-700 transition-all"
            >
              Registrarse
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 mb-6 leading-tight">
            Controla tus finanzas de forma{' '}
            <span className="text-primary-600">simple y eficiente</span>
          </h1>
          <p className="text-xl text-neutral-600 mb-10 max-w-2xl mx-auto">
            Gestiona tus cuentas, registra transacciones y visualiza tus gastos e ingresos en un solo lugar. Todo de forma segura y privada.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link 
              href="/register"
              style={{
                backgroundColor: '#0073ea',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '0.75rem',
                fontWeight: '600',
                fontSize: '1.125rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
              }}
              className="hover:bg-primary-700 transition-all shadow-medium hover:shadow-strong"
            >
              <span>Comenzar Gratis</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              href="/login"
              style={{
                backgroundColor: 'white',
                color: '#0073ea',
                padding: '1rem 2rem',
                borderRadius: '0.75rem',
                fontWeight: '600',
                fontSize: '1.125rem',
                border: '2px solid #cce5ff',
                display: 'inline-block',
                textDecoration: 'none',
              }}
              className="hover:border-primary-300 transition-all shadow-soft hover:shadow-medium"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Wallet className="h-8 w-8 text-primary-600" />}
            title="Múltiples Cuentas"
            description="Gestiona todas tus cuentas bancarias en un solo lugar"
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8 text-secondary-600" />}
            title="Análisis Visual"
            description="Gráficos claros para entender tus finanzas"
          />
          <FeatureCard
            icon={<PiggyBank className="h-8 w-8 text-accent-600" />}
            title="Presupuestos"
            description="Define límites y controla tus gastos por categoría"
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-primary-600" />}
            title="100% Seguro"
            description="Tus datos están protegidos y encriptados"
          />
        </div>

        {/* Stats Section */}
        <div className="mt-24 bg-white rounded-2xl shadow-medium p-12 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">100%</div>
              <div className="text-neutral-600 font-medium">Gratuito</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-secondary-600 mb-2">∞</div>
              <div className="text-neutral-600 font-medium">Transacciones ilimitadas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent-600 mb-2">🔒</div>
              <div className="text-neutral-600 font-medium">Datos privados</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-neutral-200">
        <div className="text-center text-neutral-500 text-sm">
          <p>© 2024 FinTek. Gestión financiera personal.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-medium transition-all-smooth">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
      <p className="text-neutral-600 text-sm">{description}</p>
    </div>
  );
}