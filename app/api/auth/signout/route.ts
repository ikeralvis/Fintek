import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Cerrar sesión
  await supabase.auth.signOut();

  // Redirigir a la página de despedida.
  // Status 303 (See Other) es obligatorio aquí: sin él, Next.js usa 307 por
  // defecto, que preserva el método HTTP original (POST). El navegador
  // reenviaría entonces un POST a /logout (una página, sin handler POST),
  // devolviendo 405 y dejando la petición "pendiente de reenvío" (el aviso
  // de F5 para reenviar el formulario). 303 fuerza a que la redirección se
  // siga siempre con GET.
  return NextResponse.redirect(new URL('/logout', request.url), { status: 303 });
}