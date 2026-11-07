# NoteChamp

PWA de prise de notes (React, Vite, Tailwind, Zustand). Les notes sont stockées
dans IndexedDB via `idb`, sans serveur.

## Langues

Le projet est entièrement en français :

- Interface utilisateur : textes, messages et libellés `aria-label`.
- Commentaires de code et JSDoc.
- Noms de tests (`describe` / `it`), sauf quand ils reprennent le nom d'une fonction.
- README et documentation.
- Messages de commit.

## Commandes

- `npm run dev` : serveur de développement.
- `npm test` : tests Vitest (IndexedDB simulée par `fake-indexeddb`, composants
  testés avec Testing Library et jsdom).
- `npm run lint` : ESLint.
- `npm run build` : build de production avec génération du service worker.
- Déploiement : un push sur `main` publie sur GitHub Pages
  (`.github/workflows/deploy.yml`, domaine `notechamp.pxly.fr`).

## Points d'attention

- Toute évolution du schéma IndexedDB passe par une nouvelle étape
  `if (oldVersion < N)` dans `upgrade` (`src/lib/db.ts`) et l'incrément de `DB_VERSION`.
- Les types de fichiers à servir hors ligne doivent figurer dans `globPatterns`
  (`vite.config.ts`).
- jsdom et Node n'ont ni canvas ni `createImageBitmap` : les tests qui passent
  par le traitement d'image simulent `processImage` ou `createThumbnail`
  (`vi.mock('../lib/images')`) et vérifient le reste dans le navigateur.
- La sauvegarde est un ZIP (`notes.json` au format 2 et `images/<id>.jpg`,
  voir `src/lib/backup.ts`). Les anciens exports `.json` restent acceptés à
  l'import : toute évolution du format doit les garder lisibles.

## Photos dans les notes

Réalisé selon `docs/photos.md`, qui reste la référence des choix faits.
