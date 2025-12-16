<div align="center">

# 💰 FinTek — Gestor Financiero Personal

[![CI/CD](https://github.com/ikeralvis/expense-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/ikeralvis/expense-tracker/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Una aplicación moderna y segura para gestionar tus finanzas personales con análisis predictivo impulsado por algoritmos estadísticos.**

[🚀 Demo en Vivo](https://fintek-app.vercel.app) · [📖 Documentación](#-estructura-del-proyecto) · [🐛 Reportar Bug](https://github.com/ikeralvis/expense-tracker/issues)

</div>

---

## 📸 Vista Previa

<div align="center">
<img src="public/dashboard-preview.png" alt="FinTek Dashboard" width="80%" />
</div>

---

## ✨ Características Principales

| Módulo | Descripción |
|--------|-------------|
| 🏦 **Multi-Cuenta** | Gestiona múltiples bancos y cuentas (efectivo, tarjetas, ahorros) con saldos en tiempo real |
| 📊 **Dashboard Inteligente** | Visualiza tu balance total, ingresos vs gastos mensuales y tendencias |
| 💳 **Transacciones** | Registra ingresos y gastos con categorías personalizables y fechas |
| 🔄 **Suscripciones Recurrentes** | Automatiza pagos periódicos (semanales, mensuales, anuales) con cron jobs |
| 📈 **Presupuestos** | Establece límites por categoría y monitorea el progreso en tiempo real |
| 🤖 **Análisis Predictivo (IA)** | Motor de forecasting híbrido (WMA + Regresión Lineal) con detección de anomalías |
| 📄 **Exportación de Reportes** | Genera informes PDF con gráficos y resúmenes mensuales |
| 🔐 **Seguridad RLS** | Row Level Security en Supabase: cada usuario solo ve sus propios datos |
| 🌙 **Tema Oscuro/Claro** | Soporte completo de temas con Tailwind CSS |

---

## 🛠️ Tech Stack

| Capa | Tecnología |
|------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Estilos** | Tailwind CSS 4, Geist Font, Lucide Icons |
| **Backend** | Next.js Server Actions, API Routes |
| **Base de Datos** | Supabase (PostgreSQL) con Row Level Security |
| **Autenticación** | Supabase Auth (Google OAuth, Email/Password) |
| **Validación** | Zod |
| **Gráficos** | Recharts |
| **Testing** | Vitest, Testing Library |
| **CI/CD** | GitHub Actions (Lint, Typecheck, Tests, Lighthouse) |
| **Deploy** | Vercel |

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20+
- npm / yarn / pnpm
- Cuenta en [Supabase](https://supabase.com)

### 1. Clonar el repositorio

```bash
git clone https://github.com/ikeralvis/expense-tracker.git
cd expense-tracker
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# Opcional: Para cron jobs externos
CRON_SECRET=tu-secreto-para-cron
```

### 4. Configurar la base de datos

Ejecuta los scripts SQL en tu proyecto de Supabase:

```bash
# Orden recomendado:
1. schema.sql          # Tablas y triggers
2. secure_tables.sql   # Políticas RLS optimizadas
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📂 Estructura del Proyecto

```
expense-tracker/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rutas de autenticación (login, register)
│   ├── api/                      # API Routes (cron, auth callbacks)
│   ├── dashboard/                # Dashboard principal y sub-páginas
│   │   ├── analisis/             # Análisis predictivo con IA
│   │   ├── cuentas/              # Gestión de cuentas bancarias
│   │   ├── presupuestos/         # Control de presupuestos
│   │   ├── suscripciones/        # Transacciones recurrentes
│   │   ├── transacciones/        # CRUD de transacciones
│   │   └── configuracion/        # Bancos y categorías
│   └── page.tsx                  # Landing page
├── components/                   # Componentes React reutilizables
│   ├── dashboard/                # Widgets, formularios, listas
│   ├── analysis/                 # Componentes de análisis IA
│   └── ui/                       # Componentes UI genéricos
├── lib/
│   ├── actions/                  # Server Actions (transactions, budgets, etc.)
│   ├── supabase/                 # Clientes Supabase (server/client)
│   └── utils/                    # Utilidades (analysis engine, helpers)
├── tests/                        # Tests unitarios y de integración
├── types/                        # Tipos TypeScript (database.types.ts)
├── schema.sql                    # Schema de la base de datos
├── secure_tables.sql             # Políticas RLS
└── docs/                         # Documentación adicional
```

---

## 🧪 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (hot reload) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Ejecutar ESLint |
| `npm run typecheck` | Verificar tipos con TypeScript |
| `npm run test` | Ejecutar tests con Vitest |
| `npm run test:coverage` | Tests con reporte de cobertura |

---

## 🔬 Motor de Análisis Predictivo

FinTek incluye un motor de forecasting financiero que combina:

1. **Weighted Moving Average (WMA)** — Prioriza datos recientes para estabilidad
2. **Regresión Lineal (OLS)** — Detecta tendencias direccionales
3. **Modelo Híbrido** — Pondera ambos según la volatilidad de los datos (Coeficiente de Variación)
4. **Detección de Anomalías** — Alertas cuando el gasto actual supera predicciones

```typescript
// Ejemplo de uso interno
const result = forecaster.predict(historyValues, currentSpending);
// { prediction: 450.50, trend: 'increasing', confidence: 'high' }
```

---

## 🔒 Seguridad

- **Row Level Security (RLS)**: Cada tabla tiene políticas que garantizan que los usuarios solo acceden a sus propios datos
- **Supabase Auth**: Autenticación segura con soporte para OAuth (Google) y email/password
- **Validación con Zod**: Todos los inputs se validan antes de procesar
- **HTTPS**: Desplegado en Vercel con SSL automático

Ver [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) para más detalles.

---

## 🚢 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio en [vercel.com](https://vercel.com)
2. Configura las variables de entorno en el dashboard de Vercel
3. Deploy automático en cada push a `main`

### Docker (Alternativo)

```bash
docker build -t fintek .
docker run -p 3000:3000 --env-file .env.local fintek
```

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

<div align="center">

Hecho con ❤️ por [Iker Alvis](https://github.com/ikeralvis)

⭐ Si te gusta este proyecto, ¡dale una estrella!

</div>
