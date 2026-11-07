import { db } from './db';
import type { NoteImage } from '../types';

export async function addImage(image: NoteImage): Promise<void> {
  await db.add('images', image);
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
