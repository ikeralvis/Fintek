<div align="center">

# 💰 FinTek — Gestor Financiero Personal

[![CI/CD](https://github.com/ikeralvis/Fintek/actions/workflows/ci.yml/badge.svg)](https://github.com/ikeralvis/Fintek/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Cuentas, presupuestos e inversiones en un solo sitio — sin conectar tu banco, sin ceder tus credenciales a nadie.**

[🚀 Demo en vivo](https://fintek-app.vercel.app) · [🐛 Reportar un bug](https://github.com/ikeralvis/Fintek/issues) · [📄 Política de Privacidad](https://fintek-app.vercel.app/privacidad)

</div>

---

## 📸 Vista previa

<div align="center">
<img src="public/dashboard-preview.png" alt="FinTek Dashboard" width="80%" />
</div>

---

## ✨ Características

| Módulo | Descripción |
|--------|-------------|
| 🏦 **Multi-cuenta** | Bancos, efectivo, tarjetas y ahorro en un mismo sitio, con saldos en tiempo real |
| 📊 **Dashboard personalizable** | Widgets reordenables (balance, accesos rápidos, cartera, próximos cobros...) |
| 🔔 **Buzón de avisos** | Presupuestos al límite, suscripciones próximas a cobrar y balances negativos, en una campana en el header |
| 💳 **Transacciones** | Ingresos, gastos y transferencias entre cuentas, con auto-categorización mientras escribes |
| 🔄 **Suscripciones recurrentes** | Pagos periódicos (semanal/mensual/anual) procesados automáticamente por cron |
| 📈 **Presupuestos inteligentes** | Límites por categoría, colchón de seguridad y detección de sobrante del mes anterior |
| 📉 **Inversiones y portfolio** | Snapshots de valor, aportaciones vs. rendimiento real, evolución por cuenta |
| 🤖 **Análisis predictivo (IA)** | Forecasting híbrido (media móvil ponderada + regresión lineal) con detección de anomalías |
| 📄 **Exportación a PDF** | Informes mensuales con gráficos y resúmenes |
| 📱 **PWA instalable** | Se añade a la pantalla de inicio (iOS/Android), con Service Worker para caché de assets y soporte offline básico |
| 🔐 **Seguridad** | Row Level Security en Supabase, cabeceras HTTP (CSP, HSTS, X-Frame-Options...) y `noindex` en todo lo que va detrás de login |
| 🌙 **Tema oscuro/claro** | Nativo, con detección de preferencia del sistema |
| ✋ **Gestos táctiles** | Swipe para editar/eliminar transacciones, animaciones con Framer Motion |

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Estilos / UI** | Tailwind CSS 4, Radix UI, Geist Font, Lucide Icons, Framer Motion |
| **Backend** | Server Actions, API Routes, middleware de autenticación |
| **Base de datos** | Supabase (PostgreSQL) con Row Level Security |
| **Autenticación** | Supabase Auth (Google OAuth, Email/Password) |
| **Validación** | Zod |
| **Gráficos** | Recharts (con capa propia estilo shadcn `ChartContainer`/`ChartTooltip`) |
| **Notificaciones** | Web Push (VAPID) + Service Worker |
| **Testing** | Vitest, Testing Library |
| **CI/CD** | GitHub Actions (lint, typecheck, tests) |
| **Deploy** | Vercel |

---

## 🚀 Inicio rápido

### Prerrequisitos

- Node.js 20+
- npm
- Cuenta en [Supabase](https://supabase.com)

### 1. Clonar el repositorio

```bash
git clone https://github.com/ikeralvis/Fintek.git
cd Fintek
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz:

```env
# Supabase (obligatorias)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key   # solo para acciones de servidor/cron

# Notificaciones push (opcional — genera un par con `npx web-push generate-vapid-keys`)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tu-email@dominio.com

# Cron jobs (protege /api/cron/*)
CRON_SECRET=un-secreto-aleatorio
```

### 4. Configurar la base de datos

Ejecuta en tu proyecto de Supabase, en este orden:

1. `schema.sql` — tablas, relaciones y triggers
2. `secure_tables.sql` — políticas de Row Level Security

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## 📂 Estructura del proyecto

```
Fintek/
├── app/
│   ├── (auth)/                # Login y registro
│   ├── (legal)/                # Privacidad, aviso legal, cookies
│   ├── api/                    # Cron jobs, auth callback
│   ├── dashboard/               # App autenticada (noindex)
│   │   ├── analisis/            # Análisis predictivo
│   │   ├── cuentas/             # Cuentas bancarias
│   │   ├── inversiones/         # Portfolio
│   │   ├── presupuestos/        # Presupuestos
│   │   ├── suscripciones/       # Pagos recurrentes
│   │   ├── transacciones/       # CRUD de movimientos
│   │   └── configuracion/       # Bancos, categorías, notificaciones
│   ├── sitemap.ts / robots.ts   # SEO
│   ├── opengraph-image.tsx      # Imagen OG generada
│   └── page.tsx                 # Landing pública
├── components/
│   ├── dashboard/                # Widgets, formularios, listas
│   ├── landing/                   # Landing page
│   ├── analysis/                  # Componentes de análisis IA
│   └── ui/                        # Componentes UI genéricos (shadcn-style)
├── lib/
│   ├── actions/                   # Server Actions
│   ├── supabase/                  # Clientes Supabase (server/client)
│   └── utils/                      # Motor de análisis, helpers
├── scripts/
│   └── generate-icons.mjs          # Genera favicon/app-icon desde el logo
├── tests/                          # Unitarios e integración (Vitest)
├── docs/                            # Documentación adicional
├── schema.sql                       # Esquema de base de datos
├── secure_tables.sql                 # Políticas RLS
├── proxy.ts                          # Middleware (sesión + rutas protegidas)
└── next.config.ts                     # Cabeceras de seguridad, CSP
```

---

## 🧪 Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos con TypeScript |
| `npm run test` | Tests con Vitest |
| `npm run test:coverage` | Tests con cobertura |

---

## 🔬 Motor de análisis predictivo

FinTek incluye un motor de forecasting financiero propio que combina:

1. **Weighted Moving Average (WMA)** — prioriza los datos recientes
2. **Regresión lineal (OLS)** — detecta tendencias direccionales
3. **Modelo híbrido** — pondera ambos según la volatilidad (coeficiente de variación)
4. **Detección de anomalías** — avisa cuando el gasto actual supera lo esperado

```typescript
const result = forecaster.predict(historyValues, currentSpending);
// { prediction: 450.50, trend: 'increasing', confidence: 'high' }
```

Estas predicciones son siempre orientativas: no hay ninguna decisión automatizada que afecte al usuario sin su intervención.

---

## 🔒 Seguridad y privacidad

- **Row Level Security**: cada tabla en Supabase garantiza que un usuario solo accede a sus propios datos.
- **Cabeceras HTTP**: CSP, `X-Frame-Options`, `X-Content-Type-Options`, HSTS y `Permissions-Policy` en `next.config.ts`.
- **`noindex` en la app privada**: todo `/dashboard/**` lleva `robots: noindex` (metadata + cabecera `X-Robots-Tag`) para que nunca aparezca en buscadores.
- **Sin agregación bancaria**: no nos conectamos a tu banco ni pedimos tus credenciales; todo se introduce o importa manualmente.
- **Cookies**: solo la de sesión de Supabase Auth (técnica, sin consentimiento requerido). Sin analítica ni publicidad. Ver [Política de Cookies](https://fintek-app.vercel.app/cookies).
- **RGPD**: identidad del responsable, base legal, encargados del tratamiento y derechos del usuario en la [Política de Privacidad](https://fintek-app.vercel.app/privacidad).

Ver [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) para el detalle técnico.

---

## 🚢 Despliegue

### Vercel (recomendado)

1. Conecta el repositorio en [vercel.com](https://vercel.com).
2. Configura las variables de entorno de la sección anterior en el proyecto de Vercel.
3. Cada push a `master` despliega automáticamente (vía Pull Request — la rama está protegida).

---

## 🤝 Contribuir

1. Haz fork del repositorio.
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`).
3. Commitea tus cambios (`git commit -m 'feat: añadir nueva funcionalidad'`).
4. Haz push a tu rama (`git push origin feature/nueva-funcionalidad`).
5. Abre un Pull Request contra `master`.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

<div align="center">

Hecho con ❤️ por [Iker Alvis](https://github.com/ikeralvis)

⭐ Si te gusta este proyecto, ¡dale una estrella!

</div>
