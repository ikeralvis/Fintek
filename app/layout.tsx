import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fintek - Gestor Financiero Personal",
  description: "Gestiona tus finanzas personales de forma simple y eficiente",

  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/logo.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" href="/logo.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/logo.png" sizes="512x512" type="image/png" />
      </head>
      <body className={`${GeistSans.variable} font-sans antialiased text-neutral-900 bg-neutral-50`}>
        {children}
      </body>
    </html>
  );
}