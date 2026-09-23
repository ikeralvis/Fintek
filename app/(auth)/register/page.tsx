import type { Metadata } from 'next';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Crea tu cuenta gratuita en Fintek y empieza a gestionar tus finanzas personales.',
  alternates: { canonical: '/register' },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
