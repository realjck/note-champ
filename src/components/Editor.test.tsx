// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Editor from './Editor';
import { db, initialize } from '../lib/db';
import { useStore } from '../store/useStore';
import type { JournalEntry } from '../types';

const existingEntry: JournalEntry = {
  id: 'existing',
  title: 'Courses',
  content: 'Pain',
  color: '#FF6B6B',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

function renderEditor(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<p>Liste des notes</p>} />
        <Route path="/new" element={<Editor />} />
        <Route path="/edit/:id" element={<Editor />} />
      </Routes>
    </MemoryRouter>
  );
}

const typeContent = (value: string) =>
  fireEvent.change(screen.getByPlaceholderText('Écrivez votre note...'), { target: { value } });

const storedEntries = () => db.getAll('journal_entries');

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  await initialize();
  useStore.setState({ entries: [], isLoading: true });
});

afterEach(cleanup);

describe('Editor autosave on a new note', () => {
  beforeEach(() => useStore.getState().loadEntries());

  it('saves the note after a pause in typing', async () => {
    renderEditor('/new');
    typeContent('Idée');

    await waitFor(async () => {
      expect((await storedEntries()).map((e) => e.content)).toEqual(['Idée']);
    });
  });

  it('keeps a single entry across successive saves', async () => {
    renderEditor('/new');
    typeContent('Idée');
    await waitFor(async () => expect(await storedEntries()).toHaveLength(1));

    typeContent('Idée géniale');
    await waitFor(async () => {
      expect((await storedEntries()).map((e) => e.content)).toEqual(['Idée géniale']);
    });
  });

  it('saves pending changes when leaving the editor', async () => {
    const { unmount } = renderEditor('/new');
    typeContent('Vite');
    unmount();

    await waitFor(async () => {
      expect((await storedEntries()).map((e) => e.content)).toEqual(['Vite']);
    });
  });

  it('saves pending changes when the app goes to the background', async () => {
    renderEditor('/new');
    typeContent('Avant de verrouiller');

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

    await waitFor(async () => expect(await storedEntries()).toHaveLength(1));
  });

  it('does not store a note left blank', async () => {
    const { unmount } = renderEditor('/new');
    typeContent('   ');
    unmount();

    await pause(100);
    expect(await storedEntries()).toEqual([]);
  });
});

describe('Editor autosave on an existing note', () => {
  beforeEach(async () => {
    await db.add('journal_entries', existingEntry);
    await useStore.getState().loadEntries();
  });

  it('saves the changes and returns to the list on "Terminé"', async () => {
    renderEditor('/edit/existing');
    typeContent('Pain, lait');
    fireEvent.click(screen.getByRole('button', { name: 'Terminé' }));

    await screen.findByText('Liste des notes');
    const [saved] = await storedEntries();
    expect(saved.content).toBe('Pain, lait');
    expect(saved.updatedAt > existingEntry.updatedAt).toBe(true);
  });

  it('keeps the text being typed when the entries reload', async () => {
    renderEditor('/edit/existing');
    typeContent('Pain, lait, œufs');

    await act(() => useStore.getState().loadEntries());

    expect(screen.getByPlaceholderText('Écrivez votre note...')).toHaveProperty(
      'value',
      'Pain, lait, œufs'
    );
  });

  it('deletes the note when it is emptied', async () => {
    const { unmount } = renderEditor('/edit/existing');
    fireEvent.change(screen.getByPlaceholderText('Titre'), { target: { value: '' } });
    typeContent('');
    unmount();

    await waitFor(async () => expect(await storedEntries()).toEqual([]));
  });
});
