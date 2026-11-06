import { useCallback, useEffect, useRef } from 'react';

/**
 * Retarde la sauvegarde jusqu'à une pause dans les modifications, et force la
 * sauvegarde en attente au démontage du composant ou quand la page est masquée
 * (changement d'appli, écran verrouillé).
 */
export function useDebouncedSave<T>(save: (value: T) => Promise<void>, delayMs: number) {
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    await save(next.value);
  }, [save]);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, delayMs);
    },
    [flush, delayMs]
  );

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flush();
    };
  }, [flush]);

  return { schedule, flush };
}
