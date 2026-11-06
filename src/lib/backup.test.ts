import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { initDB } from './db';
import { parseBackup, restoreBackup } from './backup';
import type { JournalEntry } from '../types';

const makeEntry = (id: string, title = `Note ${id}`): JournalEntry => ({
  id,
  title,
  content: 'Contenu',
  color: '#FF6B6B',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
});

const backupText = (data: unknown) => JSON.stringify(data);

describe('parseBackup', () => {
  it('accepts a file produced by the export', () => {
    const data = {
      entries: [makeEntry('a'), makeEntry('b')],
      preferences: { theme: 'dark' },
      exportDate: '2026-11-07T10:00:00.000Z',
    };

    expect(parseBackup(backupText(data))).toEqual({
      entries: data.entries,
      preferences: { theme: 'dark' },
    });
  });

  it('rejects text that is not JSON', () => {
    expect(() => parseBackup('pas du json')).toThrow();
  });

  it('rejects a file without an entries array', () => {
    expect(() => parseBackup(backupText({ notes: [] }))).toThrow();
  });

  it('rejects an entry with a missing field', () => {
    const withoutTitle: Partial<JournalEntry> = makeEntry('a');
    delete withoutTitle.title;
    expect(() => parseBackup(backupText({ entries: [withoutTitle] }))).toThrow();
  });

  it('rejects an entry with an empty id', () => {
    expect(() => parseBackup(backupText({ entries: [makeEntry('')] }))).toThrow();
  });

  it('rejects an entry with an invalid date', () => {
    const entry = { ...makeEntry('a'), createdAt: 'hier' };
    expect(() => parseBackup(backupText({ entries: [entry] }))).toThrow();
  });

  it('rejects duplicate entry ids', () => {
    const entries = [makeEntry('a'), makeEntry('a', 'Autre')];
    expect(() => parseBackup(backupText({ entries }))).toThrow();
  });

  it('rejects an unknown theme', () => {
    const data = { entries: [], preferences: { theme: 'rose' } };
    expect(() => parseBackup(backupText(data))).toThrow();
  });

  it('accepts a file without preferences', () => {
    expect(parseBackup(backupText({ entries: [] }))).toEqual({ entries: [] });
  });
});

describe('restoreBackup', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('replaces all entries and preferences', async () => {
    const db = await initDB();
    await db.add('journal_entries', makeEntry('old'));

    await restoreBackup(db, {
      entries: [makeEntry('new')],
      preferences: { theme: 'dark' },
    });

    expect(await db.getAllKeys('journal_entries')).toEqual(['new']);
    expect(await db.get('preferences', 'user')).toEqual({ theme: 'dark' });
  });

  it('keeps existing data when the restore fails midway', async () => {
    const db = await initDB();
    await db.add('journal_entries', makeEntry('old'));

    const conflicting = [makeEntry('x'), makeEntry('x')];
    await expect(restoreBackup(db, { entries: conflicting })).rejects.toThrow();

    expect(await db.getAllKeys('journal_entries')).toEqual(['old']);
  });
});
