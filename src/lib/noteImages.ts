import { db } from './db';
import type { JournalEntry, NoteImage } from '../types';

/**
 * Enregistre la photo et, si elle n'existe pas encore, sa note, dans une seule
 * transaction : aucune photo ne reste orpheline. Une note déjà enregistrée
 * n'est pas remplacée, car la sauvegarde différée a pu en écrire une version
 * plus récente pendant le traitement de la photo.
 */
export async function addImage(entry: JournalEntry, image: NoteImage): Promise<void> {
  const tx = db.transaction(['journal_entries', 'images'], 'readwrite');
  const entries = tx.objectStore('journal_entries');
  const addEntryIfMissing = async () => {
    if ((await entries.getKey(entry.id)) === undefined) await entries.add(entry);
  };
  await Promise.all([addEntryIfMissing(), tx.objectStore('images').add(image), tx.done]);
}

/** Photos d'une note, dans l'ordre d'ajout. */
export async function getImages(entryId: string): Promise<NoteImage[]> {
  const images = await db.getAllFromIndex('images', 'entryId', entryId);
  return images.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function deleteImage(id: string): Promise<void> {
  await db.delete('images', id);
}

/** Supprime la note et ses photos dans une seule transaction. */
export async function deleteEntryWithImages(entryId: string): Promise<void> {
  const tx = db.transaction(['journal_entries', 'images'], 'readwrite');
  const images = tx.objectStore('images');
  const imageIds = await images.index('entryId').getAllKeys(entryId);
  await Promise.all([
    tx.objectStore('journal_entries').delete(entryId),
    ...imageIds.map((id) => images.delete(id)),
    tx.done,
  ]);
}

export async function countImages(entryId: string): Promise<number> {
  return db.countFromIndex('images', 'entryId', entryId);
}

/**
 * Toutes les notes et le nombre de photos de chacune, en une seule
 * transaction. Le comptage parcourt uniquement les clés de l'index, sans
 * lire les photos.
 */
export async function getEntriesWithImageCounts() {
  const tx = db.transaction(['journal_entries', 'images']);
  const entries = await tx.objectStore('journal_entries').getAll();
  const imageCounts: Record<string, number> = {};
  let cursor = await tx.objectStore('images').index('entryId').openKeyCursor();
  while (cursor) {
    imageCounts[cursor.key] = (imageCounts[cursor.key] ?? 0) + 1;
    cursor = await cursor.continue();
  }
  return { entries, imageCounts };
}
