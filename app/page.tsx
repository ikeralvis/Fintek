import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/landing/LandingPage';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'FinTek',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'Gestor financiero personal: cuentas, presupuestos e inversiones en un solo sitio, sin conectar tu banco.',
  url: 'https://fintek-app.vercel.app',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage />
    </>
  );
}
