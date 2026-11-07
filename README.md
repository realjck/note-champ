# NoteChamp

Application de journal pour capturer vos pensées et prises de notes quotidiennes

[![React.js](https://img.shields.io/badge/-React.js-0A1A2F?style=flat&logo=react)](https://react.dev/)
[![React.js](https://img.shields.io/badge/-Tailwind%20CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

### Démo : [notechamp.pxly.fr](https://notechamp.pxly.fr)

Utilisable sur mobile en Progressive Web App, hors ligne et sans serveur : les
données restent dans l'IndexedDB du navigateur.

## Fonctionnalités

- Notes avec titre, couleur et recherche.
- Photos dans les notes : redimensionnées à 1600 px, métadonnées (dont la
  position GPS) retirées, visionneuse plein écran avec zoom.
- Sauvegarde complète en ZIP (`notes.json` et photos), réimportable. Les
  anciens exports `.json` restent acceptés.
- Thème clair ou sombre.

## Utilisation

```bash
npm install      # installation
npm run dev      # serveur de développement
npm test         # tests (Vitest)
npm run lint     # ESLint
npm run build    # build de production
```

**Mise en production :** chaque push sur `main` lance le lint, les tests et le
build, puis publie l'application sur GitHub Pages (`.github/workflows/deploy.yml`).
