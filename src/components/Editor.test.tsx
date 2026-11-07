// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Editor from './Editor';
import { db, initialize } from '../lib/db';
import { useStore } from '../store/useStore';
import { addImage, getImages } from '../lib/noteImages';
import { processImage } from '../lib/images';
import type { JournalEntry, NoteImage } from '../types';

// jsdom ne sait ni décoder ni dessiner une image.
vi.mock('../lib/images', () => ({ processImage: vi.fn() }));

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

describe("Éditeur : sauvegarde auto d'une nouvelle note", () => {
  beforeEach(() => useStore.getState().loadEntries());

  it('enregistre la note après une pause dans la frappe', async () => {
    renderEditor('/new');
    typeContent('Idée');

    await waitFor(async () => {
      expect((await storedEntries()).map((e) => e.content)).toEqual(['Idée']);
    });
  });

  it('attribue un UUID à la nouvelle note', async () => {
    const { unmount } = renderEditor('/new');
    typeContent('Idée');
    unmount();

    await waitFor(async () => {
      const [saved] = await storedEntries();
      expect(saved.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  it('garde une seule note au fil des sauvegardes', async () => {
    renderEditor('/new');
    typeContent('Idée');
    await waitFor(async () => expect(await storedEntries()).toHaveLength(1));

    typeContent('Idée géniale');
    await waitFor(async () => {
      expect((await storedEntries()).map((e) => e.content)).toEqual(['Idée géniale']);
    });
  });

  it("enregistre les modifications en attente en quittant l'éditeur", async () => {
    const { unmount } = renderEditor('/new');
    typeContent('Vite');
    unmount();

    await waitFor(async () => {
      expect((await storedEntries()).map((e) => e.content)).toEqual(['Vite']);
    });
  });

  it("enregistre les modifications en attente quand l'appli passe en arrière-plan", async () => {
    renderEditor('/new');
    typeContent('Avant de verrouiller');

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

    await waitFor(async () => expect(await storedEntries()).toHaveLength(1));
  });

  it("n'enregistre pas une note laissée vide", async () => {
    const { unmount } = renderEditor('/new');
    typeContent('   ');
    unmount();

    await pause(100);
    expect(await storedEntries()).toEqual([]);
  });
});

describe("Éditeur : sauvegarde auto d'une note existante", () => {
  beforeEach(async () => {
    await db.add('journal_entries', existingEntry);
    await useStore.getState().loadEntries();
  });

  it('enregistre les modifications et revient à la liste avec « Terminé »', async () => {
    renderEditor('/edit/existing');
    typeContent('Pain, lait');
    fireEvent.click(screen.getByRole('button', { name: 'Terminé' }));

    await screen.findByText('Liste des notes');
    const [saved] = await storedEntries();
    expect(saved.content).toBe('Pain, lait');
    expect(saved.updatedAt > existingEntry.updatedAt).toBe(true);
  });

  it('garde le texte en cours de saisie quand les notes se rechargent', async () => {
    renderEditor('/edit/existing');
    typeContent('Pain, lait, œufs');

    await act(() => useStore.getState().loadEntries());

    expect(screen.getByPlaceholderText('Écrivez votre note...')).toHaveProperty(
      'value',
      'Pain, lait, œufs'
    );
  });

  it("revient à la liste quand la note n'existe pas", async () => {
    renderEditor('/edit/missing');

    await screen.findByText('Liste des notes');
    expect((await storedEntries()).map((e) => e.id)).toEqual(['existing']);
  });

  it('supprime la note quand elle est vidée', async () => {
    const { unmount } = renderEditor('/edit/existing');
    fireEvent.change(screen.getByPlaceholderText('Titre'), { target: { value: '' } });
    typeContent('');
    unmount();

    await waitFor(async () => expect(await storedEntries()).toEqual([]));
  });
});

describe('Éditeur : photos', () => {
  const processed = {
    blob: new Blob(['photo'], { type: 'image/jpeg' }),
    thumbnail: new Blob(['vignette'], { type: 'image/jpeg' }),
    width: 1600,
    height: 1200,
  };

  const storedPhoto: NoteImage = {
    id: 'photo',
    entryId: 'existing',
    ...processed,
    createdAt: '2026-01-01T10:00:00.000Z',
  };

  const jpeg = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

  const choosePhotos = (...files: File[]) =>
    fireEvent.change(screen.getByLabelText('Ajouter des photos'), { target: { files } });

  /** Photo affichée : les autres diapositives restent dans le DOM, rendues inertes. */
  const currentSlide = () =>
    screen.getAllByRole('group').find((slide) => !slide.hasAttribute('inert'));

  const thumbnails = () => screen.queryAllByRole('img', { name: /^Photo \d+$/ });

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:vignette');
    URL.revokeObjectURL = vi.fn();
    vi.mocked(processImage).mockReset().mockResolvedValue(processed);
    await useStore.getState().loadEntries();
  });

  it('ajoute les photos choisies sous le texte et enregistre la nouvelle note', async () => {
    renderEditor('/new');
    choosePhotos(jpeg('a.jpg'), jpeg('b.jpg'));

    await waitFor(() => expect(thumbnails()).toHaveLength(2));
    const [saved] = await storedEntries();
    expect(await getImages(saved.id)).toHaveLength(2);
  });

  it('indique que les photos sont en cours de traitement', async () => {
    let finish: (value: typeof processed) => void = () => {};
    vi.mocked(processImage).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderEditor('/new');
    choosePhotos(jpeg('a.jpg'));

    expect(await screen.findByRole('status')).toBeTruthy();
    finish(processed);
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it("affiche un message quand une photo ne peut pas être ajoutée", async () => {
    vi.mocked(processImage).mockRejectedValue(new Error('« a.heic » : format non pris en charge.'));
    renderEditor('/new');
    choosePhotos(jpeg('a.heic'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('« a.heic » : format non pris en charge.');
    expect(thumbnails()).toHaveLength(0);
  });

  describe('avec une photo enregistrée', () => {
    beforeEach(async () => {
      await addImage(existingEntry, storedPhoto);
      await useStore.getState().loadEntries();
    });

    it('supprime la photo après confirmation', async () => {
      renderEditor('/edit/existing');
      fireEvent.click(await screen.findByRole('button', { name: 'Supprimer la photo 1' }));
      fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

      await waitFor(() => expect(thumbnails()).toHaveLength(0));
      expect(await getImages('existing')).toEqual([]);
    });

    it('ouvre la visionneuse sur la photo touchée', async () => {
      await addImage(existingEntry, { ...storedPhoto, id: 'photo-2', createdAt: '2026-01-01T10:00:01.000Z' });
      renderEditor('/edit/existing');

      fireEvent.click(await screen.findByRole('button', { name: 'Agrandir la photo 2' }));

      expect(await screen.findByRole('dialog', { name: 'Visionneuse de photos' })).toBeTruthy();
      expect(currentSlide()?.getAttribute('aria-label')).toBe('Photo 2 sur 2');
    });

    it('ferme la visionneuse avec le bouton retour, sans quitter la note', async () => {
      renderEditor('/edit/existing');
      fireEvent.click(await screen.findByRole('button', { name: 'Agrandir la photo 1' }));
      await screen.findByRole('dialog', { name: 'Visionneuse de photos' });

      act(() => window.history.back());

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.getByPlaceholderText('Écrivez votre note...')).toBeTruthy();
    });

    it('ferme la visionneuse avec le bouton Fermer', async () => {
      renderEditor('/edit/existing');
      fireEvent.click(await screen.findByRole('button', { name: 'Agrandir la photo 1' }));

      fireEvent.click(await screen.findByRole('button', { name: 'Fermer' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it("garde la photo quand la suppression est annulée", async () => {
      renderEditor('/edit/existing');
      fireEvent.click(await screen.findByRole('button', { name: 'Supprimer la photo 1' }));
      fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

      expect(thumbnails()).toHaveLength(1);
      expect(await getImages('existing')).toHaveLength(1);
    });
  });
});
