import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Fintek',
  description: 'Cómo Fintek recoge, usa y protege tus datos personales, conforme al RGPD y la LOPDGDD.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacyPage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-foreground mb-2">Política de Privacidad</h1>
      <p className="text-xs text-muted-foreground mb-8">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Responsable del tratamiento</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Titular:</strong> Iker Alvis (persona física)</li>
            <li><strong>Contacto:</strong> <a href="mailto:iker.a@opendeusto.es" className="font-medium text-foreground underline underline-offset-2">iker.a@opendeusto.es</a></li>
          </ul>
          <p className="mt-2">
            Esta política se redacta conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 de
            Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Qué datos tratamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Datos de cuenta: nombre, correo electrónico y contraseña (cifrada, gestionada por Supabase Auth).</li>
            <li>Datos financieros que introduces manualmente: cuentas, transacciones, presupuestos, inversiones y suscripciones.</li>
            <li>Datos técnicos mínimos necesarios para el funcionamiento (sesión, preferencias de interfaz guardadas localmente en tu navegador).</li>
          </ul>
          <p className="mt-2">
            Fintek no accede a tus credenciales bancarias ni se conecta directamente a tu banco: todos los datos
            financieros se introducen o importan manualmente por ti. No recogemos datos de categorías especiales (Art. 9 RGPD).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Finalidad y base legal (legitimación)</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Prestación del servicio</strong> (mostrar tus cuentas, movimientos, presupuestos y estadísticas): ejecución del contrato de uso que aceptas al registrarte (Art. 6.1.b RGPD).</li>
            <li><strong>Notificaciones push que actives explícitamente</strong> (ej. avisos de suscripciones próximas): tu consentimiento expreso, revocable en cualquier momento desde Configuración (Art. 6.1.a RGPD).</li>
            <li><strong>Seguridad y prevención de fraude</strong> (registro de sesión, protección de la cuenta): interés legítimo (Art. 6.1.f RGPD).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Destinatarios y encargados del tratamiento</h2>
          <p>Tus datos se alojan y procesan a través de los siguientes proveedores, que actúan como encargados del tratamiento bajo contrato:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Supabase Inc.</strong> — base de datos, autenticación y almacenamiento.</li>
            <li><strong>Vercel Inc.</strong> — alojamiento e infraestructura de despliegue de la aplicación.</li>
          </ul>
          <p className="mt-2">
            Ambos proveedores pueden procesar datos en servidores ubicados fuera del Espacio Económico Europeo (EEE),
            en particular en Estados Unidos. En esos casos, la transferencia se ampara en las Cláusulas Contractuales
            Tipo de la Comisión Europea u otro mecanismo de garantía equivalente reconocido por el RGPD. No cedemos
            ni vendemos tus datos a terceros con fines publicitarios.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Conservación y eliminación</h2>
          <p>Tus datos se conservan mientras mantengas tu cuenta activa. Puedes solicitar la eliminación completa de tu cuenta y todos tus datos en cualquier momento desde Configuración o escribiendo a <a href="mailto:iker.a@opendeusto.es" className="font-medium text-foreground underline underline-offset-2">iker.a@opendeusto.es</a>. Tras la baja, los datos se eliminan salvo que exista una obligación legal que exija su bloqueo temporal.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Tus derechos</h2>
          <p>
            Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, limitación del
            tratamiento, portabilidad y oposición escribiendo a{' '}
            <a href="mailto:iker.a@opendeusto.es" className="font-medium text-foreground underline underline-offset-2">iker.a@opendeusto.es</a>.
            Si consideras que el tratamiento de tus datos no se ajusta a la normativa, también tienes derecho a
            presentar una reclamación ante la{' '}
            <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-2">
              Agencia Española de Protección de Datos (AEPD)
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. Decisiones automatizadas</h2>
          <p>Las predicciones y sugerencias que ofrece Fintek (presupuestos, análisis de tendencias) son orientativas y no producen efectos jurídicos ni te afectan significativamente en el sentido del artículo 22 RGPD: no existe toma de decisiones automatizada sin intervención humana.</p>
        </section>
      </div>
    </article>
  );
}
