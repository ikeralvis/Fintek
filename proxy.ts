import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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
            cookiesToSet.forEach(({ name, value, options }) => {
              // Validar que value sea un string antes de establecerlo
              if (typeof value === 'string') {
                request.cookies.set(name, value)
              }
            })
            response = NextResponse.next({ request })
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
