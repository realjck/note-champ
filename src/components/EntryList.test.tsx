// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import EntryList from './EntryList';
import { useStore } from '../store/useStore';
import type { JournalEntry } from '../types';

const EMPTY_STATE_TEXT = /pour créer une nouvelle note/;

const entry: JournalEntry = {
  id: 'courses',
  title: 'Courses',
  content: 'Pain, lait',
  color: '#FF6B6B',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

function EditPage() {
  const { id } = useParams();
  return <p>Édition de {id}</p>;
}

const renderList = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<EntryList />} />
        <Route path="/edit/:id" element={<EditPage />} />
      </Routes>
    </MemoryRouter>
  );

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  // La liste restaure le défilement mémorisé lors d'une navigation d'un test précédent.
  sessionStorage.clear();
  useStore.setState({ entries: [], isLoading: true });
});

afterEach(cleanup);

describe('Liste des notes : chargement', () => {
  it("affiche le spinner et non l'écran d'accueil pendant le chargement", async () => {
    renderList();
    await act(() => pause(50));

    expect(screen.getByRole('status', { name: 'Chargement' })).toBeTruthy();
    expect(screen.queryByText(EMPTY_STATE_TEXT)).toBeNull();
  });

  it("affiche l'écran d'accueil une fois le chargement terminé sans note", async () => {
    renderList();
    act(() => useStore.setState({ isLoading: false }));

    expect(screen.getByText(EMPTY_STATE_TEXT)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('Liste des notes : carte', () => {
  beforeEach(() => useStore.setState({ entries: [entry], isLoading: false }));

  it('ouvre la note quand on clique sur la carte', async () => {
    renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la note « Courses »' }));

    expect(await screen.findByText('Édition de courses')).toBeTruthy();
  });

  it("propose seulement l'ouverture et la suppression de la note", () => {
    renderList();
    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));

    expect(names).toEqual(['Ouvrir la note « Courses »', 'Supprimer la note « Courses »']);
  });
});
