# NoteChamp

PWA de prise de notes (React, Vite, Tailwind, Zustand). Les notes sont stockées
dans IndexedDB via `idb`, sans serveur.

## Langues

Le projet est entièrement en français :

- Interface utilisateur : textes, messages et libellés `aria-label`.
- Commentaires de code et JSDoc.
- README et documentation.
- Messages de commit.

Exception : les noms de tests (`describe` / `it`) sont pour l'instant en anglais.

## Commandes

- `npm run dev` : serveur de développement.
- `npm test` : tests Vitest (IndexedDB simulée par `fake-indexeddb`, composants
  testés avec Testing Library et jsdom).
- `npm run lint` : ESLint.
- `npm run build` : build de production avec génération du service worker.

## Points d'attention

- Toute évolution du schéma IndexedDB passe par une nouvelle étape
  `if (oldVersion < N)` dans `upgrade` (`src/lib/db.ts`) et l'incrément de `DB_VERSION`.
- Les types de fichiers à servir hors ligne doivent figurer dans `globPatterns`
  (`vite.config.ts`).
