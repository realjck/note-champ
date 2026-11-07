import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, initialize } from '../lib/db';
import { addImage, getImages } from '../lib/noteImages';
import { useStore } from './useStore';
import type { JournalEntry, NoteImage } from '../types';

const entry = (fields: Partial<JournalEntry> = {}): JournalEntry => ({
  id: 'note',
  title: 'Titre',
  content: 'Contenu',
  color: '#FF6B6B',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  ...fields,
});

const photo: NoteImage = {
  id: 'photo',
  entryId: 'note',
  blob: new Blob(['photo'], { type: 'image/jpeg' }),
  thumbnail: new Blob(['vignette'], { type: 'image/jpeg' }),
  width: 1600,
  height: 1200,
  createdAt: '2026-01-01T10:00:00.000Z',
};

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  await initialize();
});

describe('deleteEntry', () => {
  it('supprime aussi les photos de la note', async () => {
    await addImage(entry(), photo);

    await useStore.getState().deleteEntry('note');

    expect(await db.get('journal_entries', 'note')).toBeUndefined();
    expect(await getImages('note')).toEqual([]);
  });
});

describe('saveEntry avec une note sans texte', () => {
  const blank = entry({ title: ' ', content: '' });

  it("garde la note si elle contient des photos", async () => {
    await addImage(entry(), photo);

    await useStore.getState().saveEntry(blank);

    expect(await db.get('journal_entries', 'note')).toEqual(blank);
  });

  it("supprime la note si elle n'a pas de photo", async () => {
    await db.put('journal_entries', entry());

    await useStore.getState().saveEntry(blank);

    expect(await db.get('journal_entries', 'note')).toBeUndefined();
  });
});
