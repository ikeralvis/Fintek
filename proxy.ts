import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Content Security Policy con nonce por petición (ver docs de Next: guides/content-security-policy).
// - script-src: solo scripts con el nonce de esta respuesta y los que ellos carguen ('strict-dynamic').
//   'self', https: y 'unsafe-inline' son solo el fallback para navegadores sin CSP3: los modernos
//   los ignoran en cuanto ven 'strict-dynamic'/nonce.
// - style-src mantiene 'unsafe-inline' sin nonce: la UI usa style={{...}} para colores dinámicos,
//   y añadir un nonce haría que el navegador ignorase 'unsafe-inline' y bloquease esos estilos.
// - img-src https: se mantiene porque los logos de bancos/suscripciones son URLs externas.
// - CSP_REPORT_ONLY=1 envía la política como Report-Only (vía de escape si algo se rompe en prod).
function buildCsp(nonce: string, isDev: boolean) {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self' https: 'unsafe-inline' 'report-sample'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

export default async function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce, isDev)

  // Next.js lee el nonce de la cabecera CSP de la *petición* y lo aplica a sus propios scripts.
  // Se reconstruye cada vez porque Supabase puede actualizar las cookies de la petición.
  const nextWithNonce = () => {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', csp)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  let response = nextWithNonce()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) => {
              // Validar que value sea un string antes de establecerlo
              if (typeof value === 'string') {
                request.cookies.set(name, value)
              }
            })
            response = nextWithNonce()
            cookiesToSet.forEach(({ name, value, options }) => {
              if (typeof value === 'string') {
                response.cookies.set(name, value, options)
              }
            })
          } catch (error) {
            console.error('Error setting cookies:', error)
          }
        },
      },
    }
  )

  try {
    const { data } = await supabase.auth.getUser()

    // Validar que data sea un objeto (no un string u otro tipo)
    const user = (data && typeof data === 'object' && 'user' in data) ? data.user : null

    if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (
      user &&
      (request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname === '/register')
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (error) {
    console.error('Error in proxy middleware:', error)
    // Si hay error con la sesión, redirigir a login
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  response.headers.set(
    process.env.CSP_REPORT_ONLY === '1' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    csp
  )
  return response
}

// Sin esto, el middleware corre en TODA petición (incluidos sitemap.xml, robots.txt,
// opengraph-image, _next/static y cualquier asset público), disparando una llamada a
// Supabase por cada una. Se excluye lo que nunca necesita comprobación de sesión.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|manifest\\.json|sw\\.js|sitemap\\.xml|robots\\.txt|opengraph-image|google.*\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|csv|xls)$).*)',
  ],
}
