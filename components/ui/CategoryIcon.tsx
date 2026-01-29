'use client';

import {
    ShoppingCart, Coffee, Briefcase, Car, Home, Plane, Heart, Music, Film, Book,
    Gift, Utensils, ShoppingBag, Wallet, CreditCard, DollarSign, TrendingUp, TrendingDown,
    Zap, Smartphone, Monitor, Gamepad2, Dumbbell, Pill, Stethoscope, GraduationCap,
    Bus, Train, Fuel, PartyPopper, Beer, Wine, Pizza, Sandwich, Shirt, Scissors,
    Wrench, Lightbulb, Droplets, Wifi, Receipt, Building, Baby, Dog, Cat,
    type LucideIcon
} from 'lucide-react';
import React from 'react';

// Short codes that fit in varchar(10) - max 10 characters each
// Map short codes to Lucide icons
const iconMap: Record<string, LucideIcon> = {
    // Short codes (for database storage)
    'cart': ShoppingCart,
    'coffee': Coffee,
    'work': Briefcase,
    'car': Car,
    'home': Home,
    'plane': Plane,
    'heart': Heart,
    'music': Music,
    'film': Film,
    'book': Book,
    'gift': Gift,
    'food': Utensils,
    'shop': ShoppingBag,
    'wallet': Wallet,
    'card': CreditCard,
    'money': DollarSign,
    'up': TrendingUp,
    'down': TrendingDown,
    'zap': Zap,
    'phone': Smartphone,
    'pc': Monitor,
    'game': Gamepad2,
    'gym': Dumbbell,
    'pill': Pill,
    'doctor': Stethoscope,
    'edu': GraduationCap,
    'bus': Bus,
    'train': Train,
    'fuel': Fuel,
    'party': PartyPopper,
    'beer': Beer,
    'wine': Wine,
    'pizza': Pizza,
    'snack': Sandwich,
    'shirt': Shirt,
    'cut': Scissors,
    'tool': Wrench,
    'light': Lightbulb,
    'water': Droplets,
    'wifi': Wifi,
    'bill': Receipt,
    'rent': Building,
    'baby': Baby,
    'dog': Dog,
    'cat': Cat,
};

export const AVAILABLE_ICONS = Object.keys(iconMap);

// Spanish labels for icons
export const iconLabels: Record<string, string> = {
    'cart': 'Compras',
    'coffee': 'Café',
    'work': 'Trabajo',
    'car': 'Coche',
    'home': 'Hogar',
    'plane': 'Viajes',
    'heart': 'Salud',
    'music': 'Música',
    'film': 'Cine',
    'book': 'Libros',
    'gift': 'Regalos',
    'food': 'Restaurante',
    'shop': 'Moda',
    'wallet': 'Dinero',
    'card': 'Tarjeta',
    'money': 'Ingreso',
    'up': 'Inversión',
    'down': 'Pérdida',
    'zap': 'Electricidad',
    'phone': 'Móvil',
    'pc': 'Tecnología',
    'game': 'Juegos',
    'gym': 'Gym',
    'pill': 'Farmacia',
    'doctor': 'Médico',
    'edu': 'Estudios',
    'bus': 'Bus',
    'train': 'Tren',
    'fuel': 'Gasolina',
    'party': 'Ocio',
    'beer': 'Bar',
    'wine': 'Vino',
    'pizza': 'Comida',
    'snack': 'Snack',
    'shirt': 'Ropa',
    'cut': 'Peluquería',
    'tool': 'Reparación',
    'light': 'Luz',
    'water': 'Agua',
    'wifi': 'Internet',
    'bill': 'Facturas',
    'rent': 'Alquiler',
    'baby': 'Niños',
    'dog': 'Mascotas',
    'cat': 'Gato',
};

type Props = {
    name?: string;
    className?: string;
    fallback?: string;
    style?: React.CSSProperties;
};

export default function CategoryIcon({ name, className = 'w-5 h-5', fallback, style }: Props) {
    // Check if it's an emoji (Unicode emoji characters)
    if (name) {
        const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
        if (emojiRegex.test(name)) {
            return <span className="text-lg">{name}</span>;
        }
    }

    // Check if we have a Lucide icon for this code
    if (name && iconMap[name]) {
        const Icon = iconMap[name];
        // Ensure color is applied to stroke
        const strokeColor = style?.color as string || 'currentColor';
        return <Icon className={className} style={style} stroke={strokeColor} />;
    }

    // Fallback to emoji or default
    return <span className="text-lg">{fallback || name || '💰'}</span>;
}
