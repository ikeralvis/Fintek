import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad — FinTek',
  description: 'Cómo FinTek recoge, usa y protege tus datos personales.',
};

export default function PrivacyPage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-foreground mb-2">Política de Privacidad</h1>
      <p className="text-xs text-muted-foreground mb-8">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Responsable del tratamiento</h2>
          <p>
            FinTek es una aplicación de gestión financiera personal. Los datos que introduces (cuentas, transacciones,
            presupuestos, suscripciones) se almacenan de forma segura en nuestra infraestructura (Supabase) y se
            utilizan exclusivamente para prestarte el servicio.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Qué datos tratamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Datos de cuenta: nombre, correo electrónico y contraseña (cifrada).</li>
            <li>Datos financieros que introduces manualmente: cuentas, transacciones, presupuestos, inversiones y suscripciones.</li>
            <li>Datos técnicos mínimos necesarios para el funcionamiento (sesión, preferencias de interfaz).</li>
          </ul>
          <p className="mt-2">
            FinTek no accede a tus credenciales bancarias ni se conecta directamente a tu banco: todos los datos
            financieros se introducen o importan manualmente por ti.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Finalidad</h2>
          <p>Usamos tus datos únicamente para operar la aplicación: mostrar tus cuentas y movimientos, calcular estadísticas y presupuestos, y enviarte notificaciones que actives explícitamente (por ejemplo, avisos de suscripciones).</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Conservación y eliminación</h2>
          <p>Tus datos se conservan mientras mantengas tu cuenta activa. Puedes solicitar la eliminación completa de tu cuenta y todos tus datos en cualquier momento desde Configuración o contactando con soporte.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Tus derechos</h2>
          <p>Puedes ejercer tus derechos de acceso, rectificación, supresión, portabilidad y oposición sobre tus datos en cualquier momento.</p>
        </section>
      </div>
    </article>
  );
}
