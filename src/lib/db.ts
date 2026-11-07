import { openDB, type DBSchema, type OpenDBCallbacks } from 'idb';
import type { JournalEntry, NoteImage, UserPreferences } from '../types';

const DB_NAME = 'journal_db';
const DB_VERSION = 2;

interface Schema extends DBSchema {
  journal_entries: {
    key: string;
    value: JournalEntry;
    indexes: { createdAt: string; color: string };
  };
  images: {
    key: string;
    value: NoteImage;
    indexes: { entryId: string };
  };
  preferences: {
    key: string;
    value: UserPreferences;
  };
}

/** Chaque étape migre depuis la version précédente : ajouter les suivantes en dessous, sous la forme `if (oldVersion < N)`. */
export const upgrade: OpenDBCallbacks<Schema>['upgrade'] = (db, oldVersion) => {
  if (oldVersion < 1) {
    const journalStore = db.createObjectStore('journal_entries', {
      keyPath: 'id',
    });
    journalStore.createIndex('createdAt', 'createdAt');
    journalStore.createIndex('color', 'color');

    db.createObjectStore('preferences');
  }
  if (oldVersion < 2) {
    const imageStore = db.createObjectStore('images', { keyPath: 'id' });
    imageStore.createIndex('entryId', 'entryId');
  }
};

// Au lieu d'utiliser top-level await, créons une fonction d'initialisation
export const initDB = () => openDB<Schema>(DB_NAME, DB_VERSION, { upgrade });

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
