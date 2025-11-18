'use client';

import { useState } from 'react';
import { Plus, Trash2, Tag, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Category = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
};

type Props = {
  initialCategories: Category[];
  userId: string;
};

// Categorías sugeridas para el usuario
const SUGGESTED_CATEGORIES = [
  'Alimentación',
  'Restauración',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Ocio',
  'Salud',
  'Educación',
  'Ropa',
  'Tecnología',
  'Viajes',
  'Ahorro',
  'Inversiones',
  'Suscripciones',
  'Regalos',
  'Mascotas',
  'Deportes',
  'Otros',
];

export default function CategoriesManager({ initialCategories, userId }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const supabase = createClient();

  const handleAddCategory = async (categoryName: string) => {
    setError('');
    
    const trimmedName = categoryName.trim();
    
    if (!trimmedName) {
      setError('El nombre de la categoría no puede estar vacío');
      return;
    }

    // Verificar si ya existe
    if (categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Esta categoría ya existe');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('categories')
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
        setCategories([...categories, data]);
        setNewCategoryName('');
        setShowSuggestions(false);
      }
    } catch (err: any) {
      console.error('Error adding category:', err);
      setError(err.message || 'Error al añadir la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddCategory(newCategoryName);
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${categoryName}"?\n\nLas transacciones con esta categoría quedarán sin categorizar.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(categories.filter(cat => cat.id !== categoryId));
    } catch (err: any) {
      console.error('Error deleting category:', err);
      alert('Error al eliminar la categoría: ' + err.message);
    }
  };

  const availableSuggestions = SUGGESTED_CATEGORIES.filter(
    suggestion => !categories.some(cat => cat.name.toLowerCase() === suggestion.toLowerCase())
  );

  return (
    <div>
      {/* Formulario para añadir categoría */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex space-x-2">
          <div className="flex-1">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Nombre de la categoría (ej: Alimentación...)"
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? '#94a3b8' : '#22c55e',
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
            <AlertCircle className="h-4 w-4 text-accent-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-accent-800">{error}</p>
          </div>
        )}

        {/* Sugerencias */}
        {showSuggestions && availableSuggestions.length > 0 && (
          <div className="mt-2 p-3 bg-secondary-50 border border-secondary-200 rounded-lg">
            <p className="text-xs font-semibold text-secondary-800 mb-2">💡 Sugerencias:</p>
            <div className="flex flex-wrap gap-2">
              {availableSuggestions.slice(0, 8).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleAddCategory(suggestion)}
                  disabled={loading}
                  className="px-3 py-1 text-xs bg-white border border-secondary-300 rounded-full hover:bg-secondary-100 transition-colors text-neutral-700 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Lista de categorías */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <Tag className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
            <p className="text-sm">No tienes categorías añadidas</p>
            <p className="text-xs mt-1">Añade tu primera categoría arriba</p>
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Tag className="h-5 w-5 text-secondary-600" />
                <span className="font-medium text-neutral-900">{category.name}</span>
              </div>
              <button
                onClick={() => handleDeleteCategory(category.id, category.name)}
                className="text-accent-500 hover:text-accent-700 p-2 rounded-lg hover:bg-accent-50 transition-colors"
                title="Eliminar categoría"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {categories.length > 0 && (
        <div className="mt-4 text-xs text-neutral-500 text-center">
          {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'} en total
        </div>
      )}
    </div>
  );
}