'use client';

import { useState } from 'react';
import { Plus, X, Building2, Wallet, CreditCard, ChevronRight, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Bank = {
  id: string;
  name: string;
  color?: string;
};

type Props = {
  readonly banks: ReadonlyArray<Bank>;
};

export default function CreateAccountForm({ banks }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Form State
  const [name, setName] = useState('');
  const [bankId, setBankId] = useState('');
  const [type, setType] = useState<'checking' | 'savings' | 'investment_fund' | 'investment' | 'cryptocurrency' | 'other'>('checking');
  const [initialBalance, setInitialBalance] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const selectedBank = banks.find(b => b.id === bankId);
  const themeColor = selectedBank?.color || '#000000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bankId || !initialBalance) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase.from('accounts').insert([{
        user_id: user.id,
        bank_id: bankId,
        name,
        type,
        current_balance: parseFloat(initialBalance),
        is_favorite: isFavorite
      }]);

      if (error) throw error;

      // Reset and close
      setName('');
      setBankId('');
      setInitialBalance('');
      setIsFavorite(false);
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error('Error creating account:', err);
      alert('Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  if (banks.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="font-bold text-neutral-900 text-lg mb-2">No tienes bancos configurados</h3>
        <p className="text-sm text-neutral-600 mb-6 max-w-xs mx-auto">
          Antes de crear una cuenta, necesitas configurar al menos una entidad bancaria.
        </p>
        <button
          onClick={() => router.push('/dashboard/configuracion')}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          Configurar Bancos
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-neutral-900 text-white py-4 px-6 rounded-3xl font-bold text-lg shadow-xl shadow-neutral-900/10 hover:shadow-2xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
      >
        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
          <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-slide-up">
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-neutral-100">
            <h2 className="text-xl font-bold text-neutral-900">Nueva Cuenta</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2.5 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pb-32">
            <form onSubmit={handleSubmit} className="px-6 py-8 max-w-lg mx-auto space-y-10">

              <div className="text-center">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Saldo Inicial</p>
                <div className="relative inline-flex items-center justify-center">
                  <span className="text-4xl font-black text-neutral-300 mr-2">€</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="bg-transparent text-6xl font-black text-neutral-900 placeholder-neutral-200 focus:outline-none w-full text-center max-w-[300px]"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Cuenta Corriente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-neutral-900 font-bold placeholder-neutral-300 focus:bg-white focus:ring-4 focus:ring-neutral-100 transition-all outline-none"
                  required
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                  Banco
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {banks.map(bank => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setBankId(bank.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${bankId === bank.id
                        ? 'border-neutral-900 bg-neutral-50 shadow-sm'
                        : 'border-neutral-100 hover:border-neutral-200'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: bank.color || '#000' }}
                        >
                          <span className="font-bold text-[10px]">{bank.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <span className="font-bold text-neutral-900">{bank.name}</span>
                      </div>
                      {bankId === bank.id && (
                        <div className="w-5 h-5 bg-neutral-900 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                  Tipo de Cuenta
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'checking', label: 'Corriente', icon: CreditCard },
                    { id: 'savings', label: 'Ahorro', icon: Wallet },
                    { id: 'investment_fund', label: 'Fondo Inversión', icon: CreditCard },
                    { id: 'investment', label: 'Inversión', icon: CreditCard },
                    { id: 'cryptocurrency', label: 'Criptomoneda', icon: CreditCard },
                    { id: 'other', label: 'Otro', icon: CreditCard }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id as any)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${type === t.id
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-lg'
                        : 'border-neutral-100 bg-white text-neutral-600 hover:border-neutral-200'
                        }`}
                    >
                      <t.icon className={`w-5 h-5 ${type === t.id ? 'text-white' : 'text-neutral-400'}`} />
                      <span className="text-xs font-bold uppercase tracking-tighter">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* FAVORITE TOGGLE */}
              <div className="flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm">
                <span className="font-bold text-neutral-900 text-sm">Marcar como favorita</span>
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`w-12 h-7 rounded-full transition-colors relative ${isFavorite ? 'bg-neutral-900' : 'bg-neutral-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${isFavorite ? 'left-6' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || !name || !bankId || !initialBalance}
                  className="w-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-200 py-4 rounded-[24px] font-bold text-lg shadow-xl shadow-neutral-900/10 transition-all active:scale-[0.98]"
                >
                  {loading ? 'Guardando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}