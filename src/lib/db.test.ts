import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { upgrade } from './db';
import type { JournalEntry } from '../types';

const entry: JournalEntry = {
  id: 'a',
  title: 'Note',
  content: 'Contenu',
  color: '#FF6B6B',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

/** Schéma figé de la version 1, telle qu'elle existe chez les utilisateurs. */
const openV1 = () =>
  openDB('journal_db', 1, {
    upgrade(db) {
      const store = db.createObjectStore('journal_entries', { keyPath: 'id' });
      store.createIndex('createdAt', 'createdAt');
      store.createIndex('color', 'color');
      db.createObjectStore('preferences');
    },
  });

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('mise à jour de la base de la version 1 vers la 2', () => {
  it('conserve les notes existantes', async () => {
    const v1 = await openV1();
    await v1.add('journal_entries', entry);
    v1.close();

    const v2 = await openDB('journal_db', 2, { upgrade });

    expect(await v2.getAll('journal_entries')).toEqual([entry]);
    v2.close();
  });

  it('crée le store des photos, indexé par note', async () => {
    (await openV1()).close();

    const v2 = await openDB('journal_db', 2, { upgrade });
    const store = v2.transaction('images').objectStore('images');

    expect(store.keyPath).toBe('id');
    expect(store.index('entryId').keyPath).toBe('entryId');
    v2.close();
  });
});
