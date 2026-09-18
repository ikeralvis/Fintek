import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aviso Legal — FinTek',
  description: 'Condiciones legales de uso de la aplicación FinTek e identificación del responsable del servicio.',
  alternates: { canonical: '/aviso-legal' },
};

export default function LegalNoticePage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-foreground mb-2">Aviso Legal</h1>
      <p className="text-xs text-muted-foreground mb-8">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Datos identificativos (Art. 10 LSSI-CE)</h2>
          <p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los siguientes datos:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Titular:</strong> Iker Alvis (persona física)</li>
            <li><strong>NIF:</strong> [PENDIENTE]</li>
            <li><strong>Domicilio:</strong> [PENDIENTE]</li>
            <li><strong>Correo electrónico de contacto:</strong> <a href="mailto:iker.a@opendeusto.es" className="font-medium text-foreground underline underline-offset-2">iker.a@opendeusto.es</a></li>
            <li><strong>Sitio web:</strong> https://fintek-app.vercel.app</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Naturaleza del servicio</h2>
          <p>
            FinTek es una herramienta de gestión financiera personal que permite registrar y visualizar cuentas,
            transacciones, presupuestos e inversiones introducidos manualmente por el usuario. No constituye
            asesoramiento financiero, fiscal ni de inversión, ni ofrece servicios de agregación bancaria (open banking):
            no se conecta a bancos ni accede a credenciales bancarias del usuario.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Condiciones de uso</h2>
          <p>El acceso a FinTek requiere registro de cuenta. El usuario es responsable de la veracidad de los datos que introduce y de mantener la confidencialidad de sus credenciales de acceso. Queda prohibido usar el servicio con fines ilícitos o que puedan dañar, inutilizar o sobrecargar el servicio.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Limitación de responsabilidad</h2>
          <p>
            Las cifras, predicciones y análisis mostrados en FinTek se calculan a partir de los datos que el propio
            usuario introduce y tienen carácter meramente informativo. FinTek no se hace responsable de decisiones
            financieras tomadas a partir de esta información, ni de la exactitud de los datos introducidos por el usuario.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Propiedad intelectual</h2>
          <p>El código, diseño e interfaz de FinTek son propiedad de su titular. Queda prohibida su reproducción total o parcial sin autorización expresa.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Legislación aplicable y jurisdicción</h2>
          <p>Este aviso legal se rige por la legislación española y de la Unión Europea. Para cualquier controversia derivada del uso del servicio, las partes se someten a los juzgados y tribunales que correspondan según la normativa de protección de consumidores aplicable.</p>
        </section>
      </div>
    </article>
  );
}
