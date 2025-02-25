import { openDB } from 'idb';
import type { JournalEntry, UserPreferences } from '../types';

const DB_NAME = 'journal_db';
const DB_VERSION = 1;

// Au lieu d'utiliser top-level await, créons une fonction d'initialisation
export const initDB = () => openDB<{
  journal_entries: JournalEntry;
  preferences: UserPreferences;
}>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // Journal entries store
    const journalStore = db.createObjectStore('journal_entries', {
      keyPath: 'id',
    });
    journalStore.createIndex('createdAt', 'createdAt');
    journalStore.createIndex('color', 'color');

    // Preferences store
    db.createObjectStore('preferences');
  },
});

export const defaultPreferences: UserPreferences = {
  theme: 'light'
};

// Exportons l'instance de la base de données
export let db: Awaited<ReturnType<typeof initDB>>;

// Fonction pour initialiser la base de données
export const initialize = async () => {
  db = await initDB();
  return db;
};
