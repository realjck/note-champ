// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { strToU8, zipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { db, defaultPreferences, initialize } from '../lib/db';
import { createThumbnail } from '../lib/images';
import { useStore } from '../store/useStore';
import type { JournalEntry } from '../types';

// jsdom ne sait ni décoder ni dessiner une image.
vi.mock('../lib/images', () => ({ createThumbnail: vi.fn() }));

// jsdom n'implémente pas Blob.arrayBuffer(), que tous les navigateurs fournissent.
Blob.prototype.arrayBuffer ??= function (this: Blob) {
  return new Promise<ArrayBuffer>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(this);
  });
};

const entry: JournalEntry = {
  id: 'a',
  title: 'Importée',
  content: 'Contenu',
  color: '#FF6B6B',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

const photo = (id: string) => ({ id, entryId: 'a', width: 1600, height: 1200, createdAt: entry.createdAt });

const backupZip = () => {
  const notes = { format: 2, entries: [entry], images: [photo('p1'), photo('p2')] };
  const zip = zipSync(
    {
      'notes.json': strToU8(JSON.stringify(notes)),
      'images/p1.jpg': strToU8('jpeg 1'),
      'images/p2.jpg': strToU8('jpeg 2'),
    },
    { level: 0 }
  );
  return new File([zip], 'sauvegarde.zip', { type: 'application/zip' });
};

const chooseBackup = (file: File) =>
  fireEvent.change(screen.getByLabelText('Importer le journal'), { target: { files: [file] } });

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  await initialize();
  useStore.setState({ entries: [], imageCounts: {}, isLoading: false, preferences: defaultPreferences });
  vi.mocked(createThumbnail).mockResolvedValue(new Blob(['vignette'], { type: 'image/jpeg' }));
});

afterEach(cleanup);

const fakeEstimate = (...usages: number[]) => {
  const estimate = vi.fn();
  for (const usage of usages) estimate.mockResolvedValueOnce({ usage, quota: 1e10 });
  Object.defineProperty(navigator, 'storage', { value: { estimate }, configurable: true });
};

describe('Paramètres : espace utilisé', () => {
  afterEach(() => Reflect.deleteProperty(navigator, 'storage'));

  it("affiche l'espace occupé par l'application", async () => {
    fakeEstimate(12_345_678);
    render(<MemoryRouter><Settings /></MemoryRouter>);

    expect(await screen.findByText('Espace utilisé : 12,3 Mo')).toBeTruthy();
  });

  it("met à jour l'espace utilisé après un import", async () => {
    fakeEstimate(1_000, 5_000_000);
    render(<MemoryRouter><Settings /></MemoryRouter>);
    await screen.findByText('Espace utilisé : 1 ko');

    chooseBackup(backupZip());
    fireEvent.click(await screen.findByRole('button', { name: 'Remplacer' }));

    expect(await screen.findByText('Espace utilisé : 5 Mo')).toBeTruthy();
  });
});

describe('Paramètres : import', () => {
  it('annonce les notes et les photos du fichier, puis les importe', async () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    chooseBackup(backupZip());

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('par les 1 note(s) et 2 photo(s) du fichier');

    fireEvent.click(screen.getByRole('button', { name: 'Remplacer' }));

    await screen.findByText('Journal importé avec succès.');
    expect(await db.getAllKeys('images')).toEqual(['p1', 'p2']);
    expect(useStore.getState().imageCounts).toEqual({ a: 2 });
  });

  it("explique le refus d'un ZIP incohérent sans rien modifier", async () => {
    await db.add('journal_entries', { ...entry, id: 'existante' });
    const notes = { format: 2, entries: [entry], images: [photo('p1')] };
    const file = new File([zipSync({ 'notes.json': strToU8(JSON.stringify(notes)) })], 'casse.zip');
    render(<MemoryRouter><Settings /></MemoryRouter>);

    chooseBackup(file);

    await waitFor(() => expect(screen.getByRole('dialog').textContent).toContain('Photo 1 : fichier absent'));
    expect(await db.getAllKeys('journal_entries')).toEqual(['existante']);
  });
});
