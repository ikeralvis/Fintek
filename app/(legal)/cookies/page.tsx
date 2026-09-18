import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cookies — FinTek',
  description: 'Qué cookies y almacenamiento local usa FinTek y para qué.',
};

export default function CookiesPage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-foreground mb-2">Política de Cookies</h1>
      <p className="text-xs text-muted-foreground mb-8">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Qué usamos</h2>
          <p>
            FinTek usa principalmente <strong>almacenamiento local del navegador</strong> (localStorage), no cookies
            de terceros. Estos datos nunca salen de tu dispositivo y no se comparten con nadie.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Cookies esenciales</h2>
          <p>Usamos una cookie de sesión (gestionada por Supabase Auth) estrictamente necesaria para mantenerte identificado tras iniciar sesión. Sin ella no podrías usar la aplicación.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Almacenamiento local (localStorage)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Preferencia de tema (claro/oscuro).</li>
            <li>Personalización del orden y visibilidad de los widgets del inicio.</li>
            <li>Última cuenta usada al crear una transacción, para agilizar el formulario.</li>
            <li>Avisos financieros que hayas descartado, para no repetirlos.</li>
            <li>Tu decisión sobre este propio banner de cookies.</li>
          </ul>
          <p className="mt-2">Ninguno de estos datos es sensible ni se envía a servidores de terceros: son preferencias de interfaz que solo existen en tu navegador.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Cómo desactivarlas</h2>
          <p>Puedes borrar el almacenamiento local en cualquier momento desde los ajustes de tu navegador. Ten en cuenta que esto reiniciará tus preferencias de interfaz.</p>
        </section>
      </div>
    </article>
  );
}
