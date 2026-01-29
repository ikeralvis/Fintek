'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Wallet, CreditCard, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Bank = {
  id: string;
  name: string;
  color?: string;
  logo_url?: string;
};

type Props = {
  readonly banks: ReadonlyArray<Bank>;
};

export default function CreateAccountButton({ banks }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form State
  const [name, setName] = useState('');
  const [bankId, setBankId] = useState('');
  const [type, setType] = useState<'checking' | 'savings' | 'investment_fund' | 'investment' | 'cryptocurrency' | 'other'>('checking');
  const [initialBalance, setInitialBalance] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

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
        current_balance: Number.parseFloat(initialBalance),
        is_favorite: isFavorite
      }]);

      if (error) throw error;

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

  // Si no hay bancos, mostrar botón deshabilitado
  if (banks.length === 0) {
    return (
      <button
        onClick={() => router.push('/dashboard/configuracion')}
        className="p-2 rounded-full hover:bg-neutral-200 transition-colors"
        title="Configura bancos primero"
      >
        <Plus className="w-5 h-5 text-neutral-400" strokeWidth={2} />
      </button>
    );
  }

  return (
    <>
      {/* Botón pequeño + */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full hover:bg-neutral-200 transition-colors"
        title="Nueva cuenta"
      >
        <Plus className="w-5 h-5 text-neutral-900" strokeWidth={2} />
      </button>

      {/* Modal a pantalla completa usando Portal */}
      {mounted && isOpen && createPortal(
        <div 
          className="fixed inset-0 bg-white flex flex-col"
          style={{ zIndex: 99999 }}
        >
          {/* Header del modal */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100 bg-white">
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 -ml-2 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <X className="w-6 h-6 text-neutral-600" />
            </button>
            <h2 className="text-lg font-bold text-neutral-900">Nueva Cuenta</h2>
            <div className="w-10" />
          </div>

          {/* Contenido del formulario */}
          <div className="flex-1 overflow-y-auto bg-white">
            <form onSubmit={handleSubmit} className="px-4 py-6 max-w-lg mx-auto space-y-8">

              {/* Saldo Inicial */}
              <div className="text-center py-6">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Saldo Inicial</p>
                <div className="inline-flex items-center justify-center">
                  <span className="text-3xl font-bold text-neutral-300 mr-1">€</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="bg-transparent text-5xl font-black text-neutral-900 placeholder-neutral-200 focus:outline-none w-48 text-center"
                    autoFocus
                  />
                </div>
              </div>

              {/* Nombre */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Nombre de la cuenta
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cuenta Corriente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 text-neutral-900 font-medium placeholder-neutral-400 focus:bg-white focus:border-neutral-300 focus:ring-2 focus:ring-neutral-100 transition-all outline-none"
                  required
                />
              </div>

              {/* Banco */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Banco
                </label>
                <div className="space-y-2">
                  {banks.map(bank => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setBankId(bank.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                        bankId === bank.id
                          ? 'border-neutral-900 bg-neutral-50'
                          : 'border-neutral-100 hover:border-neutral-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                          style={{ backgroundColor: bank.logo_url ? 'transparent' : (bank.color || '#000') }}
                        >
                          {bank.logo_url ? (
                            <img src={bank.logo_url} alt={bank.name} className="w-full h-full object-contain" />
                          ) : (
                            bank.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="font-semibold text-neutral-900">{bank.name}</span>
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

              {/* Tipo de Cuenta */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Tipo de cuenta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'checking', label: 'Corriente', icon: CreditCard },
                    { id: 'savings', label: 'Ahorro', icon: Wallet },
                    { id: 'investment', label: 'Inversión', icon: CreditCard },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id as any)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        type === t.id
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-100 bg-white text-neutral-600 hover:border-neutral-200'
                      }`}
                    >
                      <t.icon className={`w-5 h-5 ${type === t.id ? 'text-white' : 'text-neutral-400'}`} />
                      <span className="text-xs font-semibold">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Favorita */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                <span className="font-medium text-neutral-700">Marcar como favorita</span>
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${isFavorite ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${isFavorite ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Botón Submit */}
              <div className="pt-4 pb-8">
                <button
                  type="submit"
                  disabled={loading || !name || !bankId || !initialBalance}
                  className="w-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
                >
                  {loading ? 'Creando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
