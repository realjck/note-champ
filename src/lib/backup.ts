import { Zip, ZipPassThrough, strFromU8, strToU8, unzipSync } from 'fflate';
import type { JournalEntry, NoteImage, UserPreferences } from '../types';
import { defaultPreferences, type db as Database } from './db';
import { createThumbnail } from './images';

/** Description d'une photo dans `notes.json` ; le fichier est dans `images/<id>.jpg`. */
export type ImageMeta = Omit<NoteImage, 'blob' | 'thumbnail'>;

/** Contenu validé de `notes.json` (ou d'un ancien export `.json`). */
export interface Backup {
  entries: JournalEntry[];
  images: ImageMeta[];
  preferences?: UserPreferences;
}

/** Sauvegarde prête à restaurer : photos et vignettes déjà reconstituées. */
export interface RestorableBackup {
  entries: JournalEntry[];
  images: NoteImage[];
  preferences?: UserPreferences;
}

const BACKUP_FORMAT = 2;
const NOTES_FILE = 'notes.json';
const STRING_FIELDS = ['title', 'content', 'color'] as const;
const DATE_FIELDS = ['createdAt', 'updatedAt'] as const;
const THEMES: readonly string[] = ['light', 'dark'];

const imagePath = (id: string) => `images/${id}.jpg`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDateString = (value: unknown) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value !== '';

const isPositiveInteger = (value: unknown) => Number.isInteger(value) && (value as number) > 0;

function toEntry(value: unknown, index: number): JournalEntry {
  const fail = (reason: string): never => {
    throw new Error(`Note ${index + 1} : ${reason}`);
  };
  if (!isRecord(value)) fail('format invalide');
  const raw = value as Record<string, unknown>;
  if (!isNonEmptyString(raw.id)) fail('identifiant manquant');
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

function toImageMeta(value: unknown, index: number, entryIds: Set<string>): ImageMeta {
  const fail = (reason: string): never => {
    throw new Error(`Photo ${index + 1} : ${reason}`);
  };
  if (!isRecord(value)) fail('format invalide');
  const raw = value as Record<string, unknown>;
  if (!isNonEmptyString(raw.id)) fail('identifiant manquant');
  if (!isNonEmptyString(raw.entryId) || !entryIds.has(raw.entryId)) fail('note introuvable');
  if (!isPositiveInteger(raw.width) || !isPositiveInteger(raw.height)) fail('dimensions invalides');
  if (!isDateString(raw.createdAt)) fail('date invalide');
  return {
    id: raw.id as string,
    entryId: raw.entryId as string,
    width: raw.width as number,
    height: raw.height as number,
    createdAt: raw.createdAt as string,
  };
}

function toPreferences(value: unknown): UserPreferences {
  if (!isRecord(value) || typeof value.theme !== 'string' || !THEMES.includes(value.theme)) {
    throw new Error('Préférences invalides');
  }
  return { theme: value.theme as UserPreferences['theme'] };
}

function assertUniqueIds(items: { id: string }[], message: string) {
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(message);
}

/** Valide un fichier de sauvegarde exporté et ne renvoie que les champs connus. */
export function parseBackup(text: string): Backup {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || !Array.isArray(data.entries)) {
    throw new Error('Le fichier ne contient pas de liste de notes');
  }

  const entries = data.entries.map(toEntry);
  assertUniqueIds(entries, 'Le fichier contient des notes en double');

  const entryIds = new Set(entries.map((entry) => entry.id));
  const rawImages = Array.isArray(data.images) ? data.images : [];
  const images = rawImages.map((value, i) => toImageMeta(value, i, entryIds));
  assertUniqueIds(images, 'Le fichier contient des photos en double');

  const backup: Backup = { entries, images };
  if (data.preferences !== undefined) backup.preferences = toPreferences(data.preferences);
  return backup;
}

/** Un ZIP commence par la signature « PK\x03\x04 ». */
const isZip = (bytes: Uint8Array) =>
  bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

async function toNoteImage(meta: ImageMeta, index: number, data: Uint8Array | undefined): Promise<NoteImage> {
  if (!data) throw new Error(`Photo ${index + 1} : fichier absent de la sauvegarde`);
  const blob = new Blob([data], { type: 'image/jpeg' });
  try {
    return { ...meta, blob, thumbnail: await createThumbnail(blob) };
  } catch {
    throw new Error(`Photo ${index + 1} : image illisible`);
  }
}

async function readZip(bytes: Uint8Array): Promise<RestorableBackup> {
  const files = unzipSync(bytes);
  const notes = files[NOTES_FILE];
  if (!notes) throw new Error(`Le fichier ZIP ne contient pas ${NOTES_FILE}`);
  const { images: metas, ...backup } = parseBackup(strFromU8(notes));

  // Une à une : les vignettes sollicitent le décodeur d'images et la mémoire.
  const images: NoteImage[] = [];
  for (const [i, meta] of metas.entries()) {
    images.push(await toNoteImage(meta, i, files[imagePath(meta.id)]));
  }
  return { ...backup, images };
}

/**
 * Lit et valide une sauvegarde : le ZIP actuel ou un ancien export `.json`.
 * Les vignettes sont recréées ici, avant toute transaction : une transaction
 * IndexedDB se ferme si elle attend autre chose qu'une requête.
 */
export async function readBackupFile(file: File): Promise<RestorableBackup> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isZip(bytes)) return readZip(bytes);

  const { images, ...backup } = parseBackup(strFromU8(bytes));
  if (images.length > 0) {
    throw new Error('Ce fichier déclare des photos : importez le fichier .zip complet.');
  }
  return { ...backup, images: [] };
}

/** Remplace toutes les données en une seule transaction : en cas d'échec, rien n'est modifié. */
export async function restoreBackup(db: typeof Database, backup: RestorableBackup): Promise<void> {
  const tx = db.transaction(['journal_entries', 'images', 'preferences'], 'readwrite');
  const entriesStore = tx.objectStore('journal_entries');
  const imagesStore = tx.objectStore('images');
  // Une requête en échec annule toute la transaction, y compris les clear().
  await Promise.all([
    entriesStore.clear(),
    imagesStore.clear(),
    ...backup.entries.map((entry) => entriesStore.add(entry)),
    ...backup.images.map((image) => imagesStore.add(image)),
    backup.preferences && tx.objectStore('preferences').put(backup.preferences, 'user'),
    tx.done,
  ]);
}

/** Ajoute un fichier non compressé : les JPEG le sont déjà. */
function addStored(zip: Zip, name: string, data: Uint8Array) {
  const file = new ZipPassThrough(name);
  zip.add(file);
  file.push(data, true);
}

/**
 * Exporte tout le journal en ZIP : `notes.json` et les photos dans `images/`.
 * L'archive est construite en flux, photo par photo, sans tampon géant.
 */
export async function exportBackup(db: typeof Database): Promise<Blob> {
  const tx = db.transaction(['journal_entries', 'images', 'preferences']);
  const [entries, images, preferences] = await Promise.all([
    tx.objectStore('journal_entries').getAll(),
    tx.objectStore('images').getAll(),
    tx.objectStore('preferences').get('user'),
  ]);

  const chunks: Uint8Array[] = [];
  let zip!: Zip;
  const done = new Promise<void>((resolve, reject) => {
    zip = new Zip((error, chunk, final) => {
      if (error) return reject(error);
      chunks.push(chunk);
      if (final) resolve();
    });
  });

  const notes = {
    format: BACKUP_FORMAT,
    entries,
    images: images.map(({ id, entryId, width, height, createdAt }) => ({ id, entryId, width, height, createdAt })),
    preferences: preferences ?? defaultPreferences,
    exportDate: new Date().toISOString(),
  };
  addStored(zip, NOTES_FILE, strToU8(JSON.stringify(notes, null, 2)));
  for (const image of images) {
    addStored(zip, imagePath(image.id), new Uint8Array(await image.blob.arrayBuffer()));
  }
  zip.end();

  await done;
  return new Blob(chunks, { type: 'application/zip' });
}
