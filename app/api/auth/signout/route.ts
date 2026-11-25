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
  const response = NextResponse.redirect(new URL('/logout', request.url), { status: 303 });
  // Borra de la caché HTTP del navegador las páginas autenticadas (datos financieros) para que
  // no queden accesibles en un dispositivo compartido. No se usa "storage" porque eliminaría
  // también el service worker (y con él las notificaciones push) y la config de bloqueo; ni
  // "cookies", porque signOut() ya elimina las de sesión.
  response.headers.set('Clear-Site-Data', '"cache"');
  return response;
}