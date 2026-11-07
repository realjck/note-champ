import { useEffect, useState } from 'react';

const LINE_HEIGHT_PX = 16;

const canScroll = (el: HTMLElement, delta: number) =>
  delta < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth;

/**
 * Fait défiler horizontalement l'élément avec la molette verticale de la
 * souris (haut = gauche, bas = droite). Aux extrémités, la page défile
 * normalement. Renvoie une ref à poser sur l'élément.
 */
export function useHorizontalWheel<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);

  useEffect(() => {
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      // Un geste horizontal (pavé tactile) défile déjà nativement.
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * LINE_HEIGHT_PX : event.deltaY;
      if (!canScroll(element, delta)) return;
      event.preventDefault();
      element.scrollLeft += delta;
    };
    // Non passif, pour pouvoir empêcher le défilement de la page (onWheel de React est passif).
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [element]);

  return setElement;
}
