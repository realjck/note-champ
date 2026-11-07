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
  it("accepte un fichier produit par l'export", () => {
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

  it("refuse un texte qui n'est pas du JSON", () => {
    expect(() => parseBackup('pas du json')).toThrow();
  });

  it('refuse un fichier sans liste de notes', () => {
    expect(() => parseBackup(backupText({ notes: [] }))).toThrow();
  });

  it('refuse une note avec un champ manquant', () => {
    const withoutTitle: Partial<JournalEntry> = makeEntry('a');
    delete withoutTitle.title;
    expect(() => parseBackup(backupText({ entries: [withoutTitle] }))).toThrow();
  });

  it('refuse une note avec un id vide', () => {
    expect(() => parseBackup(backupText({ entries: [makeEntry('')] }))).toThrow();
  });

  it('refuse une note avec une date invalide', () => {
    const entry = { ...makeEntry('a'), createdAt: 'hier' };
    expect(() => parseBackup(backupText({ entries: [entry] }))).toThrow();
  });

  it('refuse des notes ayant le même id', () => {
    const entries = [makeEntry('a'), makeEntry('a', 'Autre')];
    expect(() => parseBackup(backupText({ entries }))).toThrow();
  });

  it('refuse un thème inconnu', () => {
    const data = { entries: [], preferences: { theme: 'rose' } };
    expect(() => parseBackup(backupText(data))).toThrow();
  });

  it('accepte un fichier sans préférences', () => {
    expect(parseBackup(backupText({ entries: [] }))).toEqual({ entries: [] });
  });
});

describe('restoreBackup', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('remplace toutes les notes et les préférences', async () => {
    const db = await initDB();
    await db.add('journal_entries', makeEntry('old'));

    await restoreBackup(db, {
      entries: [makeEntry('new')],
      preferences: { theme: 'dark' },
    });

    expect(await db.getAllKeys('journal_entries')).toEqual(['new']);
    expect(await db.get('preferences', 'user')).toEqual({ theme: 'dark' });
  });

  it("conserve les données existantes si l'import échoue en cours de route", async () => {
    const db = await initDB();
    await db.add('journal_entries', makeEntry('old'));

    const conflicting = [makeEntry('x'), makeEntry('x')];
    await expect(restoreBackup(db, { entries: conflicting })).rejects.toThrow();

    expect(await db.getAllKeys('journal_entries')).toEqual(['old']);
  });
});
