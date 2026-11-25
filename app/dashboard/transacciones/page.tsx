import TransactionsPageClient from '@/components/dashboard/TransactionsPageClient';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// ?mes=2026-05 o ?mes=todo: periodo que se abre (se mantiene al refrescar y al volver de añadir).
export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const mes = (await searchParams).mes;
  const period = typeof mes === 'string' && (/^\d{4}-\d{2}$/.test(mes) || mes === 'todo') ? mes : undefined;
  return <TransactionsPageClient initialPeriod={period} />;
}
