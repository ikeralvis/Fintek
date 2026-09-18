import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cookies — FinTek',
  description: 'Qué cookies y almacenamiento local usa FinTek y para qué.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-foreground mb-2">Política de Cookies</h1>
      <p className="text-xs text-muted-foreground mb-8">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Resumen</h2>
          <p>
            FinTek solo usa <strong>cookies técnicas estrictamente necesarias</strong> y{' '}
            <strong>almacenamiento local del navegador</strong> (localStorage) para preferencias de interfaz.
            No usamos cookies de analítica, publicidad ni de terceros. Por eso el aviso de cookies de esta web
            es meramente informativo: al ser todas técnicas, la normativa (Art. 22 LSSI-CE) no exige recabar tu
            consentimiento previo para ellas.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Cookies técnicas (sin consentimiento)</h2>
          <div className="mt-2 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Cookie</th>
                  <th className="px-3 py-2 font-semibold">Proveedor</th>
                  <th className="px-3 py-2 font-semibold">Finalidad</th>
                  <th className="px-3 py-2 font-semibold">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-2">sb-*-auth-token</td>
                  <td className="px-3 py-2">Supabase Auth</td>
                  <td className="px-3 py-2">Mantener tu sesión iniciada. Sin ella no podrías usar la aplicación.</td>
                  <td className="px-3 py-2">Sesión / hasta cerrar sesión</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Almacenamiento local (localStorage)</h2>
          <p>No son cookies (no viajan al servidor en cada petición): viven solo en tu navegador y nunca se comparten con nadie.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Preferencia de tema (claro/oscuro).</li>
            <li>Personalización del orden y visibilidad de los widgets del inicio.</li>
            <li>Última cuenta usada al crear una transacción, para agilizar el formulario.</li>
            <li>Avisos financieros que hayas descartado, para no repetirlos.</li>
            <li>Tu decisión sobre el banner informativo de esta página.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Si en el futuro añadimos analítica</h2>
          <p>Si en algún momento incorporamos cookies de analítica o de terceros, actualizaremos esta política, indicaremos su finalidad y proveedor concretos, y te pediremos tu consentimiento explícito antes de activarlas — nunca por defecto.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Cómo desactivarlas</h2>
          <p>Puedes borrar las cookies y el almacenamiento local en cualquier momento desde los ajustes de tu navegador. Ten en cuenta que esto cerrará tu sesión y reiniciará tus preferencias de interfaz.</p>
        </section>
      </div>
    </article>
  );
}
