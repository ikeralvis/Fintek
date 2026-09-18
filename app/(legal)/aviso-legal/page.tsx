import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aviso Legal — FinTek',
  description: 'Condiciones legales de uso de la aplicación FinTek.',
};

export default function LegalNoticePage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-foreground mb-2">Aviso Legal</h1>
      <p className="text-xs text-muted-foreground mb-8">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Naturaleza del servicio</h2>
          <p>
            FinTek es una herramienta de gestión financiera personal que permite registrar y visualizar cuentas,
            transacciones, presupuestos e inversiones introducidos manualmente por el usuario. No constituye
            asesoramiento financiero, fiscal ni de inversión.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Uso de la aplicación</h2>
          <p>El acceso a FinTek requiere registro de cuenta. El usuario es responsable de la veracidad de los datos que introduce y de mantener la confidencialidad de sus credenciales de acceso.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Limitación de responsabilidad</h2>
          <p>
            Las cifras, predicciones y análisis mostrados en FinTek se calculan a partir de los datos que el propio
            usuario introduce y tienen carácter meramente informativo. FinTek no se hace responsable de decisiones
            financieras tomadas a partir de esta información.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Propiedad intelectual</h2>
          <p>El código, diseño e interfaz de FinTek son propiedad de sus desarrolladores. Queda prohibida su reproducción total o parcial sin autorización.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Legislación aplicable</h2>
          <p>Este aviso legal se rige por la legislación española y europea en materia de protección de datos y comercio electrónico.</p>
        </section>
      </div>
    </article>
  );
}
