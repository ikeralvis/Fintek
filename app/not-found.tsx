import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-5 text-center">
      <Compass className="w-16 h-16 text-neutral-200 mb-4" />
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Página no encontrada</h1>
      <p className="text-neutral-500 text-sm max-w-sm mb-6">
        La página que buscas no existe o se ha movido.
      </p>
      <Link href="/dashboard" className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold">
        Volver al Dashboard
      </Link>
    </div>
  );
}
