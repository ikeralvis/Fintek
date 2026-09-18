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
    /**
     * Esquina redondeada que debe compartir esta fila con la tarjeta/lista que la contiene
     * ('top' para la primera fila, 'bottom' para la última, 'both' si es la única, 'none' para
     * el resto). Se aplica IGUAL a la capa trasera y a la capa frontal para que nunca "asome"
     * una esquina de color en los bordes redondeados de la tarjeta, ni en reposo ni al arrastrar.
     */
    edge?: 'top' | 'bottom' | 'both' | 'none';
};

const ACTION_THRESHOLD = 88;
const MAX_DRAG = 112;

const EDGE_CLASS: Record<NonNullable<Props['edge']>, string> = {
    top: 'rounded-t-xl',
    bottom: 'rounded-b-xl',
    both: 'rounded-xl',
    none: '',
};

/**
 * Fila con gestos de swipe: deslizar a la izquierda revela "eliminar" (rojo, derecha),
 * deslizar a la derecha revela "editar" (primary, izquierda). Un tap simple también edita.
 */
export default function SwipeActionRow({ onDelete, onEdit, disabled, children, className, edge = 'none' }: Props) {
    const controls = useAnimationControls();
    const wasDragged = useRef(false);
    const edgeClass = EDGE_CLASS[edge];

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
        <div className={cn('relative overflow-hidden isolate', edgeClass)}>
            {/*
             * Capa trasera ÚNICA: un solo contenedor `absolute inset-0` (exactamente la misma
             * caja que la capa frontal, sin cálculo de alto por separado vía inset-y-0) con su
             * propio `overflow-hidden` + el mismo `edgeClass` que el resto de capas. Editar y
             * Eliminar son hijos flex de ESTE contenedor (h-full real, no una altura calculada
             * de forma independiente), así que nunca puede haber un desajuste de 1px entre
             * ambos colores y el borde de la tarjeta, ni en reposo ni durante el arrastre.
             */}
            <div className={cn('absolute inset-0 z-0 flex overflow-hidden border-0', edgeClass)}>
                <div className="flex h-full w-28 shrink-0 items-center justify-start border-0 bg-primary pl-5 text-primary-foreground">
                    <Pencil className="h-5 w-5" />
                </div>
                <div className="flex h-full flex-1 items-center justify-end border-0 bg-rose-500 pr-5 text-white">
                    <Trash2 className="h-5 w-5" />
                </div>
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
                className={cn('relative z-10 border-0 bg-card', edgeClass, className)}
                drag={disabled ? false : 'x'}
                dragDirectionLock
                dragConstraints={{ left: -MAX_DRAG, right: MAX_DRAG }}
                // Sin rebote elástico: MAX_DRAG ya coincide con el ancho exacto de los botones
                // traseros (w-28), así que cualquier "elastic" > 0 deja que la fila se pase de
                // ese borde y asome una tira del fondo de la fila (la "línea rara" al deslizar).
                dragElastic={0}
                animate={controls}
                onDragEnd={handleDragEnd}
                onClick={handleClick}
                whileTap={{ scale: disabled ? 1 : 0.99 }}
                style={{
                    touchAction: 'pan-y',
                    cursor: disabled ? 'default' : 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                }}
            >
                {children}
            </motion.div>
        </div>
    );
}
