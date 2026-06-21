'use client';

import { useState } from 'react';
import { Plus, Trash2, Tag, AlertCircle, Pencil, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CategoryIcon, { AVAILABLE_ICONS, iconLabels } from '@/components/ui/CategoryIcon';

type Category = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  icon?: string;
  color?: string;
};

type Props = {
  initialCategories: Category[];
  userId: string;
};

const CATEGORY_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#6B7280',
];

const SUGGESTED_EMOJIS = [
  '🍔', '🍕', '🍺', '☕', '🛒', '🏠', '💡', '📱', '🚗', '🚌', '✈️', '🎬',
  '🎮', '🎵', '📚', '💊', '🏥', '👕', '💳', '💰', '🎁', '🐕', '🏋️', '💼',
];

// Suggested categories with SHORT CODES (max 10 chars for varchar(10))
const SUGGESTED_CATEGORIES = [
  { name: 'Alimentación', icon: 'food', color: '#F97316' },
  { name: 'Restaurante', icon: 'pizza', color: '#EF4444' },
  { name: 'Transporte', icon: 'car', color: '#3B82F6' },
  { name: 'Vivienda', icon: 'home', color: '#8B5CF6' },
  { name: 'Servicios', icon: 'light', color: '#F59E0B' },
  { name: 'Ocio', icon: 'film', color: '#EC4899' },
  { name: 'Salud', icon: 'pill', color: '#22C55E' },
  { name: 'Educación', icon: 'edu', color: '#6366F1' },
  { name: 'Ropa', icon: 'shirt', color: '#D946EF' },
  { name: 'Tecnología', icon: 'phone', color: '#0EA5E9' },
  { name: 'Viajes', icon: 'plane', color: '#14B8A6' },
  { name: 'Ahorro', icon: 'wallet', color: '#84CC16' },
  { name: 'Inversiones', icon: 'up', color: '#22C55E' },
  { name: 'Suscripciones', icon: 'bill', color: '#A855F7' },
  { name: 'Regalos', icon: 'gift', color: '#EC4899' },
  { name: 'Mascotas', icon: 'dog', color: '#F97316' },
  { name: 'Deportes', icon: 'gym', color: '#06B6D4' },
  { name: 'Trabajo', icon: 'work', color: '#6B7280' },
];

export default function CategoriesManager({ initialCategories, userId }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('cart');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [useEmoji, setUseEmoji] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [editUseEmoji, setEditUseEmoji] = useState(false);

  const supabase = createClient();

  const handleAddCategory = async (categoryName: string, icon?: string, color?: string) => {
    setError('');
    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      setError('El nombre no puede estar vacío');
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Esta categoría ya existe');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: trimmedName, user_id: userId, icon: icon || newCategoryIcon, color: color || newCategoryColor }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCategories([...categories, data]);
        setNewCategoryName('');
        setShowSuggestions(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al añadir';
      console.error(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddCategory(newCategoryName);
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`¿Eliminar "${categoryName}"?`)) return;
    try {
      await supabase.from('categories').delete().eq('id', categoryId);
      setCategories(categories.filter(cat => cat.id !== categoryId));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const availableSuggestions = SUGGESTED_CATEGORIES.filter(
    s => !categories.some(cat => cat.name.toLowerCase() === s.name.toLowerCase())
  );

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditIcon(category.icon || 'cart');
    setEditColor(category.color || '#3B82F6');
    const isEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(category.icon || '');
    setEditUseEmoji(isEmoji);
  };

  const handleUpdateCategory = async () => {
    if (!editingId || !editName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editName.trim(), icon: editIcon, color: editColor })
        .eq('id', editingId);

      if (error) throw error;
      setCategories(categories.map(c =>
        c.id === editingId ? { ...c, name: editName.trim(), icon: editIcon, color: editColor } : c
      ));
      setEditingId(null);
      setShowEditIconPicker(false);
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Error al actualizar. Asegúrate de usar códigos cortos para iconos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Quick suggestions - always visible */}
      {availableSuggestions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Añadir rápido</p>
          <div className="flex flex-wrap gap-1.5">
            {availableSuggestions.slice(0, 12).map(s => (
              <button key={s.name} type="button" onClick={() => handleAddCategory(s.name, s.icon, s.color)} disabled={loading} className="px-2.5 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-700 flex items-center gap-1.5 transition-colors">
                <CategoryIcon name={s.icon} className="w-3.5 h-3.5" style={{ color: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Compact Add Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">O crear personalizada</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="flex-1 px-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-sm text-neutral-900 font-medium focus:ring-2 focus:ring-neutral-200 outline-none"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !newCategoryName.trim()} className="px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Icon + Color row */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setShowIconPicker(!showIconPicker)} className="w-10 h-10 rounded-xl border border-neutral-200 flex items-center justify-center hover:border-neutral-300 shrink-0" style={{ backgroundColor: `${newCategoryColor}10` }}>
            <CategoryIcon name={newCategoryIcon} className="w-5 h-5" style={{ color: newCategoryColor }} />
          </button>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {CATEGORY_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setNewCategoryColor(c)} className={`w-6 h-6 rounded-full transition-transform ${newCategoryColor === c ? 'ring-2 ring-offset-1 ring-neutral-900 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {showIconPicker && (
          <div className="p-2 bg-neutral-50 rounded-xl border border-neutral-200 grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto">
            {useEmoji ? (
              SUGGESTED_EMOJIS.map(emoji => (
                <button key={emoji} type="button" onClick={() => { setNewCategoryIcon(emoji); setShowIconPicker(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-neutral-200 ${newCategoryIcon === emoji ? 'bg-neutral-900 text-white' : ''}`}>
                  {emoji}
                </button>
              ))
            ) : (
              AVAILABLE_ICONS.map(code => (
                <button key={code} type="button" onClick={() => { setNewCategoryIcon(code); setShowIconPicker(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-200 ${newCategoryIcon === code ? 'bg-neutral-900' : ''}`} title={iconLabels[code]}>
                  <CategoryIcon name={code} className={`w-4 h-4 ${newCategoryIcon === code ? 'text-white' : 'text-neutral-600'}`} />
                </button>
              ))
            )}
          </div>
        )}

        {/* Toggle iconos/emojis */}
        <div className="flex gap-1.5">
          <button type="button" onClick={() => { setUseEmoji(false); setNewCategoryIcon('cart'); }} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${!useEmoji ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>Iconos</button>
          <button type="button" onClick={() => { setUseEmoji(true); setNewCategoryIcon('💰'); }} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${useEmoji ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>Emojis</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-2 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}
      </form>

      {/* Categories List */}
      <div>
        <h3 className="font-bold text-neutral-900 mb-3">Mis Categorías ({categories.length})</h3>
        <div className="space-y-2">
          {categories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-neutral-200">
              <Tag className="h-10 w-10 mx-auto mb-2 text-neutral-300" />
              <p className="text-neutral-500 font-medium">No tienes categorías</p>
            </div>
          ) : (
            categories.map(category => (
              <div key={category.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-100 group">
                {editingId === category.id ? (
                  <div className="flex-1 space-y-3">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-lg font-medium" />

                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditUseEmoji(false); setEditIcon('cart'); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!editUseEmoji ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}>Iconos</button>
                      <button type="button" onClick={() => { setEditUseEmoji(true); setEditIcon('💰'); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${editUseEmoji ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}>Emojis</button>
                    </div>

                    <button type="button" onClick={() => setShowEditIconPicker(!showEditIconPicker)} className="w-12 h-12 rounded-xl border border-neutral-200 flex items-center justify-center" style={{ backgroundColor: `${editColor}15` }}>
                      <CategoryIcon name={editIcon} className="w-5 h-5" style={{ color: editColor }} />
                    </button>

                    {showEditIconPicker && (
                      <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-200 grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
                        {editUseEmoji ? (
                          SUGGESTED_EMOJIS.map(emoji => (
                            <button key={emoji} type="button" onClick={() => { setEditIcon(emoji); setShowEditIconPicker(false); }} className={`w-8 h-8 rounded flex items-center justify-center text-lg hover:bg-neutral-200 ${editIcon === emoji ? 'bg-neutral-900 text-white' : ''}`}>
                              {emoji}
                            </button>
                          ))
                        ) : (
                          AVAILABLE_ICONS.map(code => (
                            <button key={code} type="button" onClick={() => { setEditIcon(code); setShowEditIconPicker(false); }} className={`w-8 h-8 rounded flex items-center justify-center hover:bg-neutral-200 ${editIcon === code ? 'bg-neutral-900' : ''}`}>
                              <CategoryIcon name={code} className={`w-4 h-4 ${editIcon === code ? 'text-white' : 'text-neutral-600'}`} />
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setEditColor(c)} className={`w-6 h-6 rounded-full ${editColor === c ? 'ring-2 ring-offset-1 ring-neutral-900' : ''}`} style={{ backgroundColor: c }}>
                          {editColor === c && <Check className="w-3 h-3 text-white mx-auto" />}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={handleUpdateCategory} disabled={loading} className="flex-1 bg-neutral-900 text-white py-2 rounded-lg text-sm font-bold">Guardar</button>
                      <button onClick={() => { setEditingId(null); setShowEditIconPicker(false); }} className="flex-1 bg-neutral-100 text-neutral-700 py-2 rounded-lg text-sm font-bold">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${category.color || '#3B82F6'}15` }}>
                        <CategoryIcon name={category.icon} className="w-5 h-5" style={{ color: category.color || '#3B82F6' }} />
                      </div>
                      <span className="font-bold text-neutral-900">{category.name}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => startEditing(category)}
                        className="p-2 text-blue-700 bg-blue-100 border border-blue-200 hover:bg-blue-200 rounded-xl shadow-sm transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="p-2 text-rose-700 bg-rose-100 border border-rose-200 hover:bg-rose-200 rounded-xl shadow-sm transition-colors"
                        title="Eliminar"
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
      </div>
    </div>
  );
}