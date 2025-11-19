'use client';

import { useState } from 'react';
import { Plus, Trash2, Building2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Bank = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
};

type Props = {
  initialBanks: Bank[];
  userId: string;
};

export default function BanksManager({ initialBanks, userId }: Props) {
  const [banks, setBanks] = useState<Bank[]>(initialBanks);
  const [newBankName, setNewBankName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedName = newBankName.trim();
    
    if (!trimmedName) {
      setError('El nombre del banco no puede estar vacío');
      return;
    }

    // Verificar si ya existe
    if (banks.some(bank => bank.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Este banco ya existe');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('banks')
        .insert([
          {
            name: trimmedName,
            user_id: userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setBanks([...banks, data]);
        setNewBankName('');
      }
    } catch (err: any) {
      console.error('Error adding bank:', err);
      setError(err.message || 'Error al añadir el banco');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBank = async (bankId: string, bankName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el banco "${bankName}"?\n\nEsto también eliminará todas las cuentas asociadas a este banco.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', bankId);

      if (error) throw error;

      setBanks(banks.filter(bank => bank.id !== bankId));
    } catch (err: any) {
      console.error('Error deleting bank:', err);
      alert('Error al eliminar el banco: ' + err.message);
    }
  };

  return (
    <div>
      {/* Formulario para añadir banco */}
      <form onSubmit={handleAddBank} className="mb-6">
        <div className="flex space-x-2">
          <div className="flex-1">
            <input
              type="text"
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="Nombre del banco (ej: BBVA, Santander...)"
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? '#94a3b8' : '#0073ea',
              color: 'white',
              padding: '0.625rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Plus className="h-4 w-4" />
            {loading ? 'Añadiendo...' : 'Añadir'}
          </button>
        </div>
        
        {error && (
          <div className="mt-2 bg-accent-50 border border-accent-200 rounded-lg p-3 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-accent-600 shrink-0 mt-0.5" />
            <p className="text-sm text-accent-800">{error}</p>
          </div>
        )}
      </form>

      {/* Lista de bancos */}
      <div className="space-y-2">
        {banks.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <Building2 className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
            <p className="text-sm">No tienes bancos añadidos</p>
            <p className="text-xs mt-1">Añade tu primer banco arriba</p>
          </div>
        ) : (
          banks.map((bank) => (
            <div
              key={bank.id}
              className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-primary-600" />
                <span className="font-medium text-neutral-900">{bank.name}</span>
              </div>
              <button
                onClick={() => handleDeleteBank(bank.id, bank.name)}
                className="text-accent-500 hover:text-accent-700 p-2 rounded-lg hover:bg-accent-50 transition-colors"
                title="Eliminar banco"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {banks.length > 0 && (
        <div className="mt-4 text-xs text-neutral-500 text-center">
          {banks.length} {banks.length === 1 ? 'banco' : 'bancos'} en total
        </div>
      )}
    </div>
  );
}