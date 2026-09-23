import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu cuenta de Fintek para gestionar tus finanzas personales.',
  alternates: { canonical: '/login' },
};

export default function LoginPage() {
  return <LoginForm />;
}
