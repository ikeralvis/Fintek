import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Gestor Financiero Personal",
  description: "Gestiona tus finanzas personales de forma simple y eficiente",
  manifest: "/manifest.json", // Para PWA en el futuro
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}