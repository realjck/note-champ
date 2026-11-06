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

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('database upgrade', () => {
  it('keeps existing notes when the database version is bumped', async () => {
    const v1 = await openDB('journal_db', 1, { upgrade });
    await v1.add('journal_entries', entry);
    v1.close();

    const v2 = await openDB('journal_db', 2, { upgrade });

    expect(await v2.getAll('journal_entries')).toEqual([entry]);
    v2.close();
  });
});
