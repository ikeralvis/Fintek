'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Utensils, Fuel } from 'lucide-react';

const EXAMPLES = [
  { text: 'Mercadona', icon: ShoppingCart, category: 'Supermercado', color: '#10b981' },
  { text: 'Cena en Casa Paco', icon: Utensils, category: 'Restaurantes', color: '#f59e0b' },
  { text: 'Repsol A-2', icon: Fuel, category: 'Transporte', color: '#3b82f6' },
];

const TYPE_SPEED = 55;
const HOLD_AFTER_CATEGORY = 1400;
const HOLD_AFTER_TYPE = 250;

/** Simula escribir un concepto de gasto y la auto-categorización instantánea que ya hace TransactionForm. */
export default function AutoCategorizeDemo() {
  const [exampleIdx, setExampleIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [showCategory, setShowCategory] = useState(false);

  const example = EXAMPLES[exampleIdx];

  useEffect(() => {
    setTyped('');
    setShowCategory(false);

    let charIdx = 0;
    const typeTimer = setInterval(() => {
      charIdx += 1;
      setTyped(example.text.slice(0, charIdx));
      if (charIdx >= example.text.length) {
        clearInterval(typeTimer);
        setTimeout(() => setShowCategory(true), HOLD_AFTER_TYPE);
      }
    }, TYPE_SPEED);

    return () => clearInterval(typeTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exampleIdx]);

  useEffect(() => {
    if (!showCategory) return;
    const next = setTimeout(() => {
      setExampleIdx((i) => (i + 1) % EXAMPLES.length);
    }, HOLD_AFTER_CATEGORY);
    return () => clearTimeout(next);
  }, [showCategory]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-neutral-300">
        <span className="tabular-nums">{typed}</span>
        <span className="inline-block h-4 w-px bg-white/40 animate-pulse" />
      </div>
      <div className="mt-2.5 h-7">
        <AnimatePresence mode="wait">
          {showCategory && (
            <motion.div
              key={example.category}
              initial={{ opacity: 0, y: 6, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: `${example.color}22`, color: example.color }}
            >
              <example.icon className="h-3 w-3" />
              {example.category}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
