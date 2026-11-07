import { useEffect, useState } from 'react';

/** URL temporaire pour afficher un Blob, libérée au démontage pour éviter les fuites de mémoire. */
export function useObjectUrl(blob: Blob): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}
