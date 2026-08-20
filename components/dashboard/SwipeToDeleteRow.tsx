'use client';

import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

type Props = {
    onDelete: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
};

const SWIPE_THRESHOLD = 72;
const MAX_SWIPE = 96;

export default function SwipeToDeleteRow({ onDelete, disabled, children, className }: Props) {
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const isHorizontal = useRef<boolean | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled) return;
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        isHorizontal.current = null;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (disabled || !isDragging) return;
        const dx = e.touches[0].clientX - startX.current;
        const dy = e.touches[0].clientY - startY.current;

        if (isHorizontal.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
            isHorizontal.current = Math.abs(dx) > Math.abs(dy);
        }
        if (!isHorizontal.current) return;

        // Solo permitir arrastre hacia la izquierda (revela borrar a la derecha)
        const next = Math.min(0, Math.max(dx, -MAX_SWIPE * 1.3));
        setDragX(next);
    };

    const handleTouchEnd = () => {
        if (disabled) return;
        setIsDragging(false);
        if (dragX <= -SWIPE_THRESHOLD) {
            onDelete();
        }
        setDragX(0);
    };

    return (
        <div className="relative overflow-hidden">
            <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-5 bg-rose-500 text-white">
                <Trash2 className="w-5 h-5" />
            </div>
            <div
                className={className}
                style={{
                    transform: `translateX(${dragX}px)`,
                    transition: isDragging ? 'none' : 'transform 200ms ease-out',
                    touchAction: 'pan-y',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
}
