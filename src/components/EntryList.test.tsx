// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EntryList from './EntryList';
import { useStore } from '../store/useStore';

const EMPTY_STATE_TEXT = /pour créer une nouvelle note/;

const renderList = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <EntryList />
    </MemoryRouter>
  );

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => useStore.setState({ entries: [], isLoading: true }));

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
