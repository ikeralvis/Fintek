import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fintek - Gestor Financiero Personal",
  description: "Gestiona tus finanzas personales de forma simple y eficiente",

  manifest: "/manifest.json",
  // Referencia explícita a los iconos propios de la app (generados con scripts/generate-icons.mjs
  // a partir de public/logo.png) para que ningún favicon residual de la plataforma/Vercel pueda
  // colarse: `app/favicon.ico`, `app/icon.png` y `app/apple-icon.png` son convención nativa de
  // Next.js App Router y se sirven automáticamente en la raíz, pero se declaran aquí también de
  // forma explícita para que ganen siempre, sin depender de que el auto-detectado no falle.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  // Genera <meta name="apple-mobile-web-app-capable" content="yes">,
  // <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"> y
  // <meta name="apple-mobile-web-app-title" content="FinTek">, para que al añadir la app
  // a la pantalla de inicio en iOS abra en modo standalone con la barra de estado translúcida.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinTek',
  },
};

// interactiveWidget: 'resizes-content' hace que el viewport (y las unidades dvh) se
// reduzcan cuando aparece el teclado nativo en móvil, en vez de quedarse tapado debajo.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${GeistSans.variable} font-sans antialiased text-foreground bg-background`}>
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
          <CookieConsent />
        </ThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}