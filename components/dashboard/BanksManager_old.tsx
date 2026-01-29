'use client';

import { useState } from 'react';
import { Plus, Trash2, Building2, AlertCircle, Palette, Check, Save, X, Edit } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Bank = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  color?: string;
  logo_url?: string;
};

type Props = {
  initialBanks: Bank[];
  userId: string;
  onBanksUpdate?: () => void; // Callback to refresh parent data if needed
};

const BANK_COLORS = [
  { value: '#EC0000', label: 'Rojo' },
  { value: '#004481', label: 'Azul Oscuro' },
  { value: '#0070CE', label: 'Azul Claro' },
  { value: '#0099CC', label: 'Cyan' },
  { value: '#FF6200', label: 'Naranja' },
  { value: '#FF0000', label: 'Rojo Vivo' },
  { value: '#000000', label: 'Negro' },
  { value: '#00D1B2', label: 'Turquesa' },
  { value: '#ED0080', label: 'Rosa' },
  { value: '#10B981', label: 'Verde' },
  { value: '#8B5CF6', label: 'Violeta' },
  { value: '#6B7280', label: 'Gris' },
];

const BANK_LOGOS: Record<string, string> = {
  'BBVA': 'https://logos-world.net/wp-content/uploads/2021/02/BBVA-Logo.png',
  'Kutxabank': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Kutxabank.svg/960px-Kutxabank.svg.png',
  'Revolut': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Revolut_logo.svg/2560px-Revolut_logo.svg.png',
  'Laboral': 'https://upload.wikimedia.org/wikipedia/commons/7/74/Logo_Laboral_Kutxa.JPG',
};

export default function BanksManager({ initialBanks, userId, onBanksUpdate }: Props) {
  const [banks, setBanks] = useState<Bank[]>(initialBanks);
  const [newBankName, setNewBankName] = useState('');
  const [newBankColor, setNewBankColor] = useState('#000000');
  const [newBankLogo, setNewBankLogo] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit mode state
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editBankName, setEditBankName] = useState('');
  const [editBankColor, setEditBankColor] = useState('');
  const [editBankLogo, setEditBankLogo] = useState('');

  const supabase = createClient();

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = newBankName.trim();

    if (!trimmedName) {
      setError('El nombre del banco no puede estar vacío');
      return;
    }

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
            color: newBankColor,
            logo_url: newBankLogo || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setBanks([...banks, data]);
        setNewBankName('');
        setNewBankColor('#000000');
        setNewBankLogo('');
        if (onBanksUpdate) onBanksUpdate();
      }
    } catch (err: any) {
      console.error('Error adding bank:', err);
      setError(err.message || 'Error al añadir el banco');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBank = async (bankId: string) => {
    if (!editBankName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('banks')
        .update({ name: editBankName.trim(), color: editBankColor, logo_url: editBankLogo || null })
        .eq('id', bankId);

      if (error) throw error;

      setBanks(banks.map(b => b.id === bankId ? { ...b, name: editBankName.trim(), color: editBankColor, logo_url: editBankLogo || undefined } : b));
      setEditingBankId(null);
      if (onBanksUpdate) onBanksUpdate();
    } catch (err: any) {
      console.error('Error updating bank:', err);
      setError(err.message);
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
      if (onBanksUpdate) onBanksUpdate();
    } catch (err: any) {
      console.error('Error deleting bank:', err);
      alert('Error al eliminar el banco: ' + err.message);
    }
  };

  const startEditing = (bank: Bank) => {
    setEditingBankId(bank.id);
    setEditBankName(bank.name);
    setEditBankColor(bank.color || '#000000');
    setEditBankLogo(bank.logo_url || '');
  };

  return (
    <div>
      {/* Formulario para añadir banco */}
      <form onSubmit={handleAddBank} className="mb-8 bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
        <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Añadir Nuevo Banco
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Banco</label>
            <select
              value={selectedBank}
              onChange={(e) => {
                const bank = e.target.value;
                setSelectedBank(bank);
                if (bank && BANK_LOGOS[bank]) {
                  setNewBankName(bank);
                  setNewBankLogo(BANK_LOGOS[bank]);
                } else {
                  setNewBankName('');
                  setNewBankLogo('');
                }
              }}
              className="w-full px-4 py-4 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all bg-neutral-50 text-neutral-900 font-medium text-base mb-2"
              disabled={loading}
            >
              <option value="">Seleccionar banco...</option>
              {Object.keys(BANK_LOGOS).map((bank) => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
              <option value="other">Otro banco</option>
            </select>
            <input
              type="text"
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="Nombre del banco"
              className="w-full px-4 py-4 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all bg-neutral-50 text-neutral-900 font-medium text-base"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Color Identificativo</label>
            <div className="flex flex-wrap gap-2">
              {BANK_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewBankColor(c.value)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${newBankColor === c.value ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110' : ''}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {newBankColor === c.value && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Logo (Opcional)</label>
            <select
              value={newBankLogo}
              onChange={(e) => setNewBankLogo(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all bg-neutral-50 text-neutral-900 font-medium mb-2"
              disabled={loading}
            >
              <option value="">Sin logo</option>
              {Object.entries(BANK_LOGOS).map(([name, url]) => (
                <option key={name} value={url}>{name}</option>
              ))}
            </select>
            <input
              type="url"
              value={newBankLogo}
              onChange={(e) => setNewBankLogo(e.target.value)}
              placeholder="O URL personalizada"
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all bg-neutral-50 text-neutral-900 font-medium"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-neutral-200 hover:bg-neutral-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base"
          >
            {loading ? 'Guardando...' : 'Guardar Banco'}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </form>

      {/* Lista de bancos */}
      <h3 className="font-bold text-neutral-900 mb-4 px-2">Mis Bancos</h3>
      <div className="space-y-3">
        {banks.length === 0 ? (
          <div className="text-center py-12 bg-neutral-50 rounded-3xl border border-dashed border-neutral-200">
            <Building2 className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
            <p className="text-neutral-500 font-medium">No tienes bancos añadidos</p>
          </div>
        ) : (
          banks.map((bank) => (
            <div
              key={bank.id}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all group"
            >
              {editingBankId === bank.id ? (
                /* Edit Mode */
                <div className="flex-1 flex flex-col gap-3">
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-medium"
                  />
                  <div className="flex flex-wrap gap-2">
                    {BANK_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setEditBankColor(c.value)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${editBankColor === c.value ? 'ring-2 ring-offset-1 ring-neutral-900' : ''}`}
                        style={{ backgroundColor: c.value }}
                      >
                        {editBankColor === c.value && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                  <select
                    value={editBankLogo}
                    onChange={(e) => setEditBankLogo(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-medium"
                  >
                    <option value="">Sin logo</option>
                    {Object.entries(BANK_LOGOS).map(([name, url]) => (
                      <option key={name} value={url}>{name}</option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={editBankLogo}
                    onChange={(e) => setEditBankLogo(e.target.value)}
                    placeholder="URL personalizada"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-medium"
                  />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => handleUpdateBank(bank.id)} className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-xs font-bold">Guardar</button>
                    <button onClick={() => setEditingBankId(null)} className="flex-1 bg-neutral-200 text-neutral-700 py-1.5 rounded-lg text-xs font-bold">Cancelar</button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm text-white font-bold overflow-hidden"
                      style={{ backgroundColor: bank.logo_url ? 'transparent' : (bank.color || '#000000') }}
                    >
                      {bank.logo_url ? (
                        <img src={bank.logo_url} alt={bank.name} className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="h-5 w-5" />
                      )}
                    </div>
                    <span className="font-bold text-neutral-900">{bank.name}</span>
                  </div>
                  <div className="flex gap-2 opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(bank)}
                      className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" /> 
                    </button>
                    <button
                      onClick={() => handleDeleteBank(bank.id, bank.name)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {banks.length > 0 && (
        <div className="mt-6 text-xs text-neutral-400 text-center font-medium uppercase tracking-wider">
          {banks.length} {banks.length === 1 ? 'banco' : 'bancos'} registrados
        </div>
      )}
    </div>
  );
}