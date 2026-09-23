import type { Metadata } from 'next';
import LogoutView from './LogoutView';

export const metadata: Metadata = {
  title: 'Sesión cerrada',
  description: 'Has cerrado sesión en Fintek. Vuelve a entrar cuando quieras.',
  alternates: { canonical: '/logout' },
  robots: { index: false, follow: false },
};

export default function LogoutPage() {
  return <LogoutView />;
}
