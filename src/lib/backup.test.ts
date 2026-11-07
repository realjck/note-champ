import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { strToU8, zipSync } from 'fflate';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initDB } from './db';
import { exportBackup, parseBackup, readBackupFile, restoreBackup } from './backup';
import { createThumbnail } from './images';
import type { JournalEntry, NoteImage } from '../types';

// Node ne sait ni décoder ni dessiner une image.
vi.mock('./images', () => ({ createThumbnail: vi.fn() }));

const makeEntry = (id: string, title = `Note ${id}`): JournalEntry => ({
  id,
  title,
  content: 'Contenu',
  color: '#FF6B6B',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
});

const imageMeta = (id: string, entryId: string) => ({
  id,
  entryId,
  width: 1600,
  height: 1200,
  createdAt: '2026-01-01T10:00:00.000Z',
});

const makeImage = (id: string, entryId: string): NoteImage => ({
  ...imageMeta(id, entryId),
  blob: new Blob([`jpeg ${id}`], { type: 'image/jpeg' }),
  thumbnail: new Blob(['vignette'], { type: 'image/jpeg' }),
});

const backupText = (data: unknown) => JSON.stringify(data);

const zipFile = (files: Record<string, Uint8Array>) =>
  new File([zipSync(files, { level: 0 })], 'sauvegarde.zip', { type: 'application/zip' });

/** Contenu comparable d'une photo : les Blob ne se comparent pas directement. */
const describeImage = async ({ thumbnail, blob, ...meta }: NoteImage) => ({
  ...meta,
  type: blob.type,
  data: await blob.text(),
  thumbnail: await thumbnail.text(),
});

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.mocked(createThumbnail)
    .mockReset()
    .mockResolvedValue(new Blob(['vignette'], { type: 'image/jpeg' }));
});

describe('parseBackup', () => {
  it("accepte un fichier produit par l'ancien export, sans photo", () => {
    const data = {
      entries: [makeEntry('a'), makeEntry('b')],
      preferences: { theme: 'dark' },
      exportDate: '2026-11-07T10:00:00.000Z',
    };

    expect(parseBackup(backupText(data))).toEqual({
      entries: data.entries,
      images: [],
      preferences: { theme: 'dark' },
    });
  });

  it('accepte la liste des photos du nouveau format', () => {
    const data = { format: 2, entries: [makeEntry('a')], images: [imageMeta('p', 'a')] };

    expect(parseBackup(backupText(data)).images).toEqual([imageMeta('p', 'a')]);
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
    expect(parseBackup(backupText({ entries: [] }))).toEqual({ entries: [], images: [] });
  });

  it("refuse une photo rattachée à une note absente", () => {
    const data = { entries: [makeEntry('a')], images: [imageMeta('p', 'inconnue')] };
    expect(() => parseBackup(backupText(data))).toThrow('Photo 1 : note introuvable');
  });

  it('refuse des photos ayant le même id', () => {
    const data = { entries: [makeEntry('a')], images: [imageMeta('p', 'a'), imageMeta('p', 'a')] };
    expect(() => parseBackup(backupText(data))).toThrow('Le fichier contient des photos en double');
  });

  it('refuse une photo aux dimensions invalides', () => {
    const data = { entries: [makeEntry('a')], images: [{ ...imageMeta('p', 'a'), width: 0 }] };
    expect(() => parseBackup(backupText(data))).toThrow('Photo 1 : dimensions invalides');
  });
});

describe('export puis import', () => {
  it("retrouve à l'identique les notes, les photos et les préférences", async () => {
    const source = await initDB();
    const entries = [makeEntry('a'), makeEntry('b')];
    const images = [makeImage('p1', 'a'), makeImage('p2', 'a'), makeImage('p3', 'b')];
    for (const entry of entries) await source.add('journal_entries', entry);
    for (const image of images) await source.add('images', image);
    await source.put('preferences', { theme: 'dark' }, 'user');

    const zip = await exportBackup(source);
    source.close();
    globalThis.indexedDB = new IDBFactory();
    const target = await initDB();
    await restoreBackup(target, await readBackupFile(new File([zip], 'sauvegarde.zip')));

    expect(await target.getAll('journal_entries')).toEqual(entries);
    expect(await Promise.all((await target.getAll('images')).map(describeImage))).toEqual(
      await Promise.all(images.map(describeImage))
    );
    expect(await target.get('preferences', 'user')).toEqual({ theme: 'dark' });
  });
});

describe('readBackupFile', () => {
  it('accepte encore un ancien export .json', async () => {
    const file = new File([backupText({ entries: [makeEntry('a')] })], 'ancien.json');

    expect(await readBackupFile(file)).toEqual({ entries: [makeEntry('a')], images: [] });
  });

  it('refuse un .json qui déclare des photos, puisque les fichiers manquent', async () => {
    const data = { entries: [makeEntry('a')], images: [imageMeta('p', 'a')] };
    const file = new File([backupText(data)], 'notes.json');

    await expect(readBackupFile(file)).rejects.toThrow('importez le fichier .zip complet');
  });

  it('refuse un ZIP sans notes.json', async () => {
    const file = zipFile({ 'autre.txt': strToU8('?') });

    await expect(readBackupFile(file)).rejects.toThrow('notes.json');
  });

  it("refuse un ZIP dont une photo déclarée est absente", async () => {
    const notes = { format: 2, entries: [makeEntry('a')], images: [imageMeta('p', 'a')] };
    const file = zipFile({ 'notes.json': strToU8(backupText(notes)) });

    await expect(readBackupFile(file)).rejects.toThrow('Photo 1 : fichier absent');
  });

  it('refuse une photo illisible', async () => {
    vi.mocked(createThumbnail).mockRejectedValue(new Error('décodage impossible'));
    const notes = { format: 2, entries: [makeEntry('a')], images: [imageMeta('p', 'a')] };
    const file = zipFile({
      'notes.json': strToU8(backupText(notes)),
      'images/p.jpg': strToU8('pas une image'),
    });

    await expect(readBackupFile(file)).rejects.toThrow('Photo 1 : image illisible');
  });
});

describe('restoreBackup', () => {
  it('remplace toutes les notes, les photos et les préférences', async () => {
    const db = await initDB();
    await db.add('journal_entries', makeEntry('old'));
    await db.add('images', makeImage('old-photo', 'old'));

    await restoreBackup(db, {
      entries: [makeEntry('new')],
      images: [makeImage('new-photo', 'new')],
      preferences: { theme: 'dark' },
    });

    expect(await db.getAllKeys('journal_entries')).toEqual(['new']);
    expect(await db.getAllKeys('images')).toEqual(['new-photo']);
    expect(await db.get('preferences', 'user')).toEqual({ theme: 'dark' });
  });

  it("conserve les données existantes si l'import échoue en cours de route", async () => {
    const db = await initDB();
    await db.add('journal_entries', makeEntry('old'));
    await db.add('images', makeImage('old-photo', 'old'));

    const conflicting = [makeImage('x', 'new'), makeImage('x', 'new')];
    await expect(
      restoreBackup(db, { entries: [makeEntry('new')], images: conflicting })
    ).rejects.toThrow();

    expect(await db.getAllKeys('journal_entries')).toEqual(['old']);
    expect(await db.getAllKeys('images')).toEqual(['old-photo']);
  });
});
