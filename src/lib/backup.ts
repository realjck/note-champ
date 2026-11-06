import type { JournalEntry, UserPreferences } from '../types';
import type { db as Database } from './db';

export interface Backup {
  entries: JournalEntry[];
  preferences?: UserPreferences;
}

const STRING_FIELDS = ['title', 'content', 'color'] as const;
const DATE_FIELDS = ['createdAt', 'updatedAt'] as const;
const THEMES: readonly string[] = ['light', 'dark'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDateString = (value: unknown) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

function toEntry(value: unknown, index: number): JournalEntry {
  const fail = (reason: string): never => {
    throw new Error(`Note ${index + 1} : ${reason}`);
  };
  if (!isRecord(value)) fail('format invalide');
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id === '') fail('identifiant manquant');
  for (const field of STRING_FIELDS) {
    if (typeof raw[field] !== 'string') fail(`champ "${field}" manquant`);
  }
  for (const field of DATE_FIELDS) {
    if (!isDateString(raw[field])) fail(`date "${field}" invalide`);
  }
  return {
    id: raw.id as string,
    title: raw.title as string,
    content: raw.content as string,
    color: raw.color as string,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  };
}

function toPreferences(value: unknown): UserPreferences {
  if (!isRecord(value) || typeof value.theme !== 'string' || !THEMES.includes(value.theme)) {
    throw new Error('Préférences invalides');
  }
  return { theme: value.theme as UserPreferences['theme'] };
}

/** Valide un fichier de sauvegarde exporté et ne renvoie que les champs connus. */
export function parseBackup(text: string): Backup {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || !Array.isArray(data.entries)) {
    throw new Error('Le fichier ne contient pas de liste de notes');
  }

  const entries = data.entries.map(toEntry);
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) {
    throw new Error('Le fichier contient des notes en double');
  }

  const backup: Backup = { entries };
  if (data.preferences !== undefined) backup.preferences = toPreferences(data.preferences);
  return backup;
}

/** Remplace toutes les données en une seule transaction : en cas d'échec, rien n'est modifié. */
export async function restoreBackup(db: typeof Database, backup: Backup): Promise<void> {
  const tx = db.transaction(['journal_entries', 'preferences'], 'readwrite');
  const entriesStore = tx.objectStore('journal_entries');
  // Une requête en échec annule toute la transaction, y compris le clear().
  await Promise.all([
    entriesStore.clear(),
    ...backup.entries.map((entry) => entriesStore.add(entry)),
    backup.preferences && tx.objectStore('preferences').put(backup.preferences, 'user'),
    tx.done,
  ]);
}
