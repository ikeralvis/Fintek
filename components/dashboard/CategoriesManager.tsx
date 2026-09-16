'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Tag, AlertCircle, Pencil, Check, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CategoryIcon, { AVAILABLE_ICONS, iconLabels } from '@/components/ui/CategoryIcon';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { groupCategories } from '@/lib/categoryGroups';

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
  const [listQuery, setListQuery] = useState('');

  const supabase = createClient();
  const groupedList = useMemo(() => groupCategories(categories, listQuery), [categories, listQuery]);

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
      toast.error('Error al eliminar');
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
      toast.error('Error al actualizar. Asegúrate de usar códigos cortos para iconos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Quick suggestions - always visible */}
      {availableSuggestions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Añadir rápido</p>
          <div className="flex flex-wrap gap-1.5">
            {availableSuggestions.slice(0, 12).map(s => (
              <button key={s.name} type="button" onClick={() => handleAddCategory(s.name, s.icon, s.color)} disabled={loading} className="px-2.5 py-1.5 text-xs bg-muted/60 border border-border rounded-lg hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors">
                <CategoryIcon name={s.icon} className="w-3.5 h-3.5" style={{ color: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Compact Add Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">O crear personalizada</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="flex-1 px-3 py-2.5 border border-border rounded-xl bg-muted/60 text-sm text-foreground font-medium focus:ring-2 focus:ring-ring outline-none"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !newCategoryName.trim()} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:bg-muted disabled:text-muted-foreground transition-colors shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Icon + Color row */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setShowIconPicker(!showIconPicker)} className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:border-primary/40 shrink-0" style={{ backgroundColor: `${newCategoryColor}10` }}>
            <CategoryIcon name={newCategoryIcon} className="w-5 h-5" style={{ color: newCategoryColor }} />
          </button>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {CATEGORY_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setNewCategoryColor(c)} className={`w-6 h-6 rounded-full transition-transform ${newCategoryColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {showIconPicker && (
          <div className="p-2 bg-muted/60 rounded-xl border border-border grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto">
            {useEmoji ? (
              SUGGESTED_EMOJIS.map(emoji => (
                <button key={emoji} type="button" onClick={() => { setNewCategoryIcon(emoji); setShowIconPicker(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-muted ${newCategoryIcon === emoji ? 'bg-primary text-primary-foreground' : ''}`}>
                  {emoji}
                </button>
              ))
            ) : (
              AVAILABLE_ICONS.map(code => (
                <button key={code} type="button" onClick={() => { setNewCategoryIcon(code); setShowIconPicker(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted ${newCategoryIcon === code ? 'bg-primary' : ''}`} title={iconLabels[code]}>
                  <CategoryIcon name={code} className={`w-4 h-4 ${newCategoryIcon === code ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                </button>
              ))
            )}
          </div>
        )}

        {/* Toggle iconos/emojis */}
        <div className="flex gap-1.5">
          <button type="button" onClick={() => { setUseEmoji(false); setNewCategoryIcon('cart'); }} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${!useEmoji ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Iconos</button>
          <button type="button" onClick={() => { setUseEmoji(true); setNewCategoryIcon('💰'); }} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${useEmoji ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Emojis</button>
        </div>

        {error && (
          <div className="bg-accent-500/10 border border-accent-500/20 rounded-lg p-2 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400 shrink-0" />
            <p className="text-xs text-accent-700 dark:text-accent-400">{error}</p>
          </div>
        )}
      </form>

      {/* Categories List */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold text-foreground">Mis Categorías ({categories.length})</h3>
        </div>

        {categories.length > 8 && (
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder="Buscar categoría..."
              className="w-full rounded-xl border border-border bg-muted/60 py-2.5 pl-9 pr-3 text-sm font-medium text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {categories.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
            <Tag className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No tienes categorías</p>
          </div>
        ) : groupedList.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados para "{listQuery}"</p>
        ) : (
          <div className="space-y-4">
            {groupedList.map(({ group, items }) => (
              <div key={group}>
                <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group}</p>
                <div className="space-y-2">
                  {items.map(category => (
                    <div key={category.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${category.color || '#3B82F6'}15` }}>
                          <CategoryIcon name={category.icon} className="w-5 h-5" style={{ color: category.color || '#3B82F6' }} />
                        </div>
                        <span className="font-bold text-foreground">{category.name}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => startEditing(category)}
                          className="p-2 text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 rounded-xl shadow-sm transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          className="p-2 text-accent-700 dark:text-accent-400 bg-accent-500/15 border border-accent-500/20 hover:bg-accent-500/25 rounded-xl shadow-sm transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edición: Bottom Sheet (idéntico patrón al resto de la app) */}
      <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) { setEditingId(null); setShowEditIconPicker(false); } }}>
        <DialogContent className="w-full sm:max-w-md p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <DialogTitle>Editar Categoría</DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-muted/60 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />

            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditUseEmoji(false); setEditIcon('cart'); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!editUseEmoji ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Iconos</button>
              <button type="button" onClick={() => { setEditUseEmoji(true); setEditIcon('💰'); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${editUseEmoji ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Emojis</button>
            </div>

            <button type="button" onClick={() => setShowEditIconPicker(!showEditIconPicker)} className="w-12 h-12 rounded-xl border border-border flex items-center justify-center" style={{ backgroundColor: `${editColor}15` }}>
              <CategoryIcon name={editIcon} className="w-5 h-5" style={{ color: editColor }} />
            </button>

            {showEditIconPicker && (
              <div className="p-2 bg-muted/60 rounded-lg border border-border grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                {editUseEmoji ? (
                  SUGGESTED_EMOJIS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => { setEditIcon(emoji); setShowEditIconPicker(false); }} className={`w-8 h-8 rounded flex items-center justify-center text-lg hover:bg-muted ${editIcon === emoji ? 'bg-primary text-primary-foreground' : ''}`}>
                      {emoji}
                    </button>
                  ))
                ) : (
                  AVAILABLE_ICONS.map(code => (
                    <button key={code} type="button" onClick={() => { setEditIcon(code); setShowEditIconPicker(false); }} className={`w-8 h-8 rounded flex items-center justify-center hover:bg-muted ${editIcon === code ? 'bg-primary' : ''}`}>
                      <CategoryIcon name={code} className={`w-4 h-4 ${editIcon === code ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setEditColor(c)} className={`w-6 h-6 rounded-full ${editColor === c ? 'ring-2 ring-offset-1 ring-primary' : ''}`} style={{ backgroundColor: c }}>
                  {editColor === c && <Check className="w-3 h-3 text-white mx-auto" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              <button onClick={handleUpdateCategory} disabled={loading} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">Guardar</button>
              <button onClick={() => { setEditingId(null); setShowEditIconPicker(false); }} className="flex-1 bg-muted text-foreground py-2.5 rounded-lg text-sm font-bold">Cancelar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}