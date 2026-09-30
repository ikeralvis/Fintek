'use client';

import { useEffect } from 'react';

/**
 * iOS Safari no reduce el layout viewport cuando sale el teclado: los elementos `fixed` abajo
 * quedan tapados. visualViewport sí lo refleja, así que publicamos dos variables CSS en <html>:
 *  --kb   alto que ocupa el teclado (para `bottom: var(--kb)` en sheets)
 *  --vvh  alto visible real (para limitar el max-height del sheet)
 * Se recalcula en cada resize/scroll del visualViewport, también mientras el teclado anima, así
 * el sheet acompaña al teclado desde el primer toque (no solo al reenfocar).
 */
export function useKeyboardInset(active = true) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const root = document.documentElement;

    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--kb', `${Math.round(kb)}px`);
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.removeProperty('--kb');
      root.style.removeProperty('--vvh');
    };
  }, [active]);
}
