'use client';

import { useState } from 'react';
import { Plus, Trash2, Building2, AlertCircle, Check, Edit2 } from 'lucide-react';
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
  onBanksUpdate?: () => void;
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
  'Santander': 'https://logos-world.net/wp-content/uploads/2020/11/Santander-Logo.png',
  'CaixaBank': 'https://logos-world.net/wp-content/uploads/2020/12/CaixaBank-Logo-700x394.png',
  'ING': 'https://logos-world.net/wp-content/uploads/2023/02/ING-Logo-500x281.png',
  'Kutxabank': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Kutxabank.svg/960px-Kutxabank.svg.png',
  'Ibercaja': 'https://logos-world.net/wp-content/uploads/2020/12/Ibercaja-Logo.png',
  'Abanca': 'https://logos-world.net/wp-content/uploads/2020/12/Abanca-Logo.png',
  'Laboral Kutxa': 'https://upload.wikimedia.org/wikipedia/commons/7/74/Logo_Laboral_Kutxa.JPG',
  'Revolut': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Revolut_logo.svg/2560px-Revolut_logo.svg.png',
};

export default function BanksManager({ initialBanks, userId, onBanksUpdate }: Props) {
  const [banks, setBanks] = useState<Bank[]>(initialBanks);
  const [showForm, setShowForm] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankColor, setNewBankColor] = useState('#0070CE');
  const [newBankLogo, setNewBankLogo] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editBankName, setEditBankName] = useState('');
  const [editBankColor, setEditBankColor] = useState('');
  const [editBankLogo, setEditBankLogo] = useState('');

  const supabase = createClient();

  const resetForm = () => {
    setNewBankName('');
    setNewBankColor('#0070CE');
    setNewBankLogo('');
    setSelectedBank('');
    setError('');
    setShowForm(false);
  };

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
        .insert([{
          name: trimmedName,
          user_id: userId,
          color: newBankColor,
          logo_url: newBankLogo || null,
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setBanks([...banks, data]);
        resetForm();
        if (onBanksUpdate) onBanksUpdate();
      }
    } catch (err: any) {
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
        .update({ 
          name: editBankName.trim(), 
          color: editBankColor, 
          logo_url: editBankLogo || null 
        })
        .eq('id', bankId);

      if (error) throw error;

      setBanks(banks.map(b => 
        b.id === bankId 
          ? { ...b, name: editBankName.trim(), color: editBankColor, logo_url: editBankLogo || undefined } 
          : b
      ));
      setEditingBankId(null);
      if (onBanksUpdate) onBanksUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBank = async (bankId: string, bankName: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${bankName}"?`)) return;

    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', bankId);

      if (error) throw error;

      setBanks(banks.filter(bank => bank.id !== bankId));
      if (onBanksUpdate) onBanksUpdate();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const startEditing = (bank: Bank) => {
    setEditingBankId(bank.id);
    setEditBankName(bank.name);
    setEditBankColor(bank.color || '#0070CE');
    setEditBankLogo(bank.logo_url || '');
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Botón para añadir */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-6 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors flex items-center justify-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-muted flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="font-semibold">Añadir Banco</span>
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleAddBank} className="rounded-3xl border border-border bg-card p-8 space-y-6">
          <div>
            <label htmlFor="bank-select" className="block text-sm font-semibold text-foreground mb-3">Banco</label>
            <select
              id="bank-select"
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
              className="w-full px-4 py-3 border border-border rounded-xl bg-muted/60 text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            >
              <option value="">Seleccionar banco...</option>
              {Object.keys(BANK_LOGOS).map((bank) => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
              <option value="other">Otro banco</option>
            </select>
            <input
              id="bank-name"
              type="text"
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="Nombre del banco"
              className="w-full mt-2 px-4 py-3 border border-border rounded-xl bg-muted/60 text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="color-picker" className="block text-sm font-semibold text-foreground mb-3">Color</label>
            <div id="color-picker" className="mb-4 h-12 rounded-xl transition-all" style={{ backgroundColor: newBankColor }} />
            <div className="grid grid-cols-4 gap-3">
              {BANK_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewBankColor(c.value)}
                  className={`w-12 h-12 rounded-xl transition-all ${
                    newBankColor === c.value 
                      ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {newBankColor === c.value && <Check className="w-6 h-6 text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="logo-select" className="block text-sm font-semibold text-foreground mb-3">Logo (Opcional)</label>
            <select
              id="logo-select"
              value={newBankLogo}
              onChange={(e) => setNewBankLogo(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-muted/60 text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all mb-2"
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
              placeholder="O URL personalizada..."
              className="w-full px-4 py-3 border border-border rounded-xl bg-muted/60 text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-100">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-6 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted/60 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear Banco'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de bancos */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {banks.length} {banks.length === 1 ? 'Banco' : 'Bancos'}
        </h3>
        
        {banks.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No hay bancos creados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {banks.map((bank) =>
              editingBankId === bank.id ? (
                <div key={bank.id} className="rounded-2xl border border-border bg-card p-6 space-y-4">
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                  
                  <div className="space-y-4">
                    <div className="h-12 rounded-xl transition-all" style={{ backgroundColor: editBankColor }} />
                    <div className="grid grid-cols-4 gap-2">
                      {BANK_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditBankColor(c.value)}
                          className={`w-10 h-10 rounded-lg transition-all ${
                            editBankColor === c.value 
                              ? 'ring-2 ring-offset-1 ring-primary scale-105' 
                              : ''
                          }`}
                          style={{ backgroundColor: c.value }}
                        >
                          {editBankColor === c.value && <Check className="w-5 h-5 text-white mx-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <select
                    value={editBankLogo}
                    onChange={(e) => setEditBankLogo(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                    placeholder="URL personalizada..."
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateBank(bank.id)}
                      className="flex-1 px-4 py-2 bg-secondary-500 text-white rounded-lg text-sm font-semibold hover:bg-secondary-600 transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBankId(null)}
                      className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted/60 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={bank.id}
                  className="flex items-center justify-between p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0"
                      style={{ backgroundColor: bank.logo_url ? 'transparent' : (bank.color || '#000000') }}
                    >
                      {bank.logo_url ? (
                        <img src={bank.logo_url} alt={bank.name} className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                    </div>
                    <span className="font-semibold text-foreground">{bank.name}</span>
                  </div>
                  
                  <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(bank)}
                      className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBank(bank.id, bank.name)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
