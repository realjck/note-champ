// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import Navigation from './Navigation';
import EntryList from './EntryList';
import Editor from './Editor';
import Settings from './Settings';
import { defaultPreferences, initialize } from '../lib/db';
import { useStore } from '../store/useStore';

const renderAt = (path: string, element: ReactNode) =>
  render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>
  );

const button = (name: string) => screen.getByRole('button', { name });

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  await initialize();
  useStore.setState({ entries: [], isLoading: false, preferences: defaultPreferences });
});

afterEach(cleanup);

describe('libellés accessibles des boutons', () => {
  it('nomme les boutons de la barre de navigation', () => {
    renderAt('/', <Navigation />);

    expect(button('Liste des notes')).toBeTruthy();
    expect(button('Nouvelle note')).toBeTruthy();
    expect(button('Paramètres')).toBeTruthy();
  });

  it("nomme le bouton d'effacement de la recherche", () => {
    renderAt('/', <EntryList />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher...'), { target: { value: 'pain' } });

    expect(button('Effacer la recherche')).toBeTruthy();
  });

  it('nomme les couleurs et indique celle qui est sélectionnée', () => {
    renderAt('/new', <Editor />);

    expect(button('Rouge').getAttribute('aria-pressed')).toBe('true');
    expect(button('Vert').getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(button('Vert'));
    expect(button('Vert').getAttribute('aria-pressed')).toBe('true');
    expect(button('Rouge').getAttribute('aria-pressed')).toBe('false');
  });

  it("décrit l'action du bouton de thème", async () => {
    renderAt('/settings', <Settings />);
    fireEvent.click(button('Activer le mode sombre'));

    expect(await screen.findByRole('button', { name: 'Activer le mode clair' })).toBeTruthy();
  });
});
