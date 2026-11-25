import type { NextConfig } from "next";

// La Content-Security-Policy NO va aquí: lleva un nonce distinto en cada petición y la genera
// proxy.ts. Aquí solo quedan las cabeceras estáticas.

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Aísla la ventana de otras pestañas/orígenes (XS-leaks) sin romper los popups que abre la
  // propia app (OAuth).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Defensa en profundidad: además del `robots: { index: false }` en
        // app/dashboard/layout.tsx, esta cabecera cubre cualquier respuesta (incluida una
        // no-HTML) y a rastreadores que no respeten la metadata del documento.
        source: "/dashboard/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
