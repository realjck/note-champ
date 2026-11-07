import { useEffect, useRef } from 'react';

/**
 * Ferme une vue plein écran avec le bouton retour (Android, navigateur).
 *
 * À l'ouverture, une entrée d'historique est ajoutée en recopiant l'état de
 * React Router : au retour, le routeur retrouve la même page et ne fait rien.
 * Si la vue est fermée autrement, l'entrée est retirée avec `history.back()`.
 *
 * Le hook doit vivre dans un composant qui reste monté : l'ouverture se lit au
 * passage de `isOpen` à `true`, ce que le StrictMode ne rejoue pas.
 */
export function useCloseOnBack(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState(window.history.state, '');
    let closedByBack = false;
    const onPopState = () => {
      closedByBack = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (!closedByBack) window.history.back();
    };
  }, [isOpen]);
}
