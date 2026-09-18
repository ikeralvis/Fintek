import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LegalLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <span className="text-sm font-bold text-foreground">FinTek</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-5 py-10">
        {children}
      </div>
    </div>
  );
}
