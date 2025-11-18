"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";

export default function Navbar() {
  return (
    
    <header className="w-full bg-white shadow-soft p-4 mb-6">
      <div className="flex items-center justify-between max-w-6xl mx-auto">

        {/* Izquierda: Logo */}
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-primary-600" />
          <Link href="/dashboard" className="text-lg font-bold text-neutral-900">
            BankFlow
          </Link>
        </div>

        {/* Navegación */}
        <nav className="hidden md:flex items-center gap-6 text-neutral-700 font-semibold">
          <Link href="/dashboard" className="hover:text-primary-600 transition">Inicio</Link>
          <Link href="/dashboard/cuentas" className="hover:text-primary-600 transition">Cuentas</Link>
          <Link href="/dashboard/transacciones" className="hover:text-primary-600 transition">Transacciones</Link>
          <Link href="/dashboard/resumen" className="hover:text-primary-600 transition">Informe</Link>
          <Link href="/dashboard/configuracion" className="hover:text-primary-600 transition">Configuración</Link>
        </nav>

        {/* Logout */}
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition"
          >
            Cerrar sesión
          </button>
        </form>

      </div>
    </header>
  );
}
