'use client';

import { useRef } from 'react';
import { motion, useAnimationControls, type PanInfo } from 'motion/react';
import { Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
    onDelete: () => void;
    onEdit: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
};

const ACTION_THRESHOLD = 88;
const MAX_DRAG = 112;

/**
 * Fila con gestos de swipe: deslizar a la izquierda revela "eliminar" (rojo, derecha),
 * deslizar a la derecha revela "editar" (primary, izquierda). Un tap simple también edita.
 */
export default function SwipeActionRow({ onDelete, onEdit, disabled, children, className }: Props) {
    const controls = useAnimationControls();
    const wasDragged = useRef(false);

    const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
        wasDragged.current = Math.abs(info.offset.x) > 8;
        // Siempre vuelve a su sitio: si onDelete pide confirmación y se cancela, la fila
        // ya está en su posición normal en vez de haber "volado" fuera de la pantalla.
        controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });

        if (info.offset.x <= -ACTION_THRESHOLD) {
            onDelete();
        } else if (info.offset.x >= ACTION_THRESHOLD) {
            onEdit();
        }
    };

    const handleClick = () => {
        if (wasDragged.current) {
            wasDragged.current = false;
            return;
        }
        if (!disabled) onEdit();
    };

    return (
        <div className="relative overflow-hidden isolate">
            {/* Editar (izquierda, revelado al deslizar a la derecha) */}
            <div className="absolute inset-y-0 left-0 z-0 flex w-28 items-center justify-start bg-primary pl-5 text-primary-foreground">
                <Pencil className="h-5 w-5" />
            </div>
            {/* Eliminar (derecha, revelado al deslizar a la izquierda) */}
            <div className="absolute inset-y-0 right-0 z-0 flex w-28 items-center justify-end bg-rose-500 pr-5 text-white">
                <Trash2 className="h-5 w-5" />
            </div>

            {/*
             * Capa frontal: `relative z-10` es imprescindible. Sin position, este motion.div
             * es un elemento estático y, en el orden de pintado de CSS, los hermanos con
             * `position: absolute` (las capas traseras de arriba) siempre se pintan DESPUÉS
             * -es decir, por delante- de los hermanos estáticos, aunque aparezcan antes en el
             * DOM. Eso es lo que dejaba "filtrarse" el rojo/primary en reposo. Al posicionar
             * también esta capa (y venir después en el DOM), pasa a pintarse por encima.
             */}
            <motion.div
                className={cn('relative z-10 bg-card', className)}
                drag={disabled ? false : 'x'}
                dragDirectionLock
                dragConstraints={{ left: -MAX_DRAG, right: MAX_DRAG }}
                dragElastic={0.06}
                animate={controls}
                onDragEnd={handleDragEnd}
                onClick={handleClick}
                whileTap={{ scale: disabled ? 1 : 0.99 }}
                style={{ touchAction: 'pan-y', cursor: disabled ? 'default' : 'pointer' }}
            >
                {children}
            </motion.div>
        </div>
    );
}
