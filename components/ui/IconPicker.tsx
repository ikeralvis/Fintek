'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import CategoryIcon, { AVAILABLE_ICONS, iconLabels } from './CategoryIcon';

type Props = {
    value?: string;
    onChange: (iconName: string) => void;
    onClose: () => void;
};

export default function IconPicker({ value, onChange, onClose }: Props) {
    const [search, setSearch] = useState('');

    const filteredIcons = AVAILABLE_ICONS.filter(name => {
        if (!search) return true;
        const label = iconLabels[name] || name;
        return label.toLowerCase().includes(search.toLowerCase()) ||
            name.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="fixed inset-0 bg-black/50 z-[250] flex items-end sm:items-center justify-center animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100">
                    <h3 className="text-base font-bold text-neutral-900">Elegir Icono</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100">
                        <X className="w-5 h-5 text-neutral-600" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-neutral-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Buscar icono..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-neutral-50 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium text-neutral-900 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-200"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Icons Grid */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    <div className="grid grid-cols-4 gap-3">
                        {filteredIcons.map(name => (
                            <button
                                key={name}
                                onClick={() => onChange(name)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${value === name
                                        ? 'bg-neutral-900 text-white'
                                        : 'hover:bg-neutral-50 text-neutral-600'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${value === name ? 'bg-white/10' : 'bg-neutral-100'
                                    }`}>
                                    <CategoryIcon
                                        name={name}
                                        className={`w-7 h-7 ${value === name ? 'text-white' : 'text-neutral-600'}`}
                                    />
                                </div>
                                <span className={`text-[10px] font-bold truncate w-full text-center leading-tight ${value === name ? 'text-white' : 'text-neutral-500'
                                    }`}>
                                    {iconLabels[name] || name}
                                </span>
                            </button>
                        ))}
                    </div>
                    {filteredIcons.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-neutral-400 text-sm">No se encontraron iconos</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
