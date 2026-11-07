// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useCloseOnBack } from './useCloseOnBack';

function Viewer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useCloseOnBack(isOpen, onClose);
  return null;
}

/** État posé par React Router sur l'entrée courante. */
const routerState = { usr: null, key: 'abc', idx: 3 };

function renderViewer(onClose = vi.fn()) {
  window.history.replaceState(routerState, '');
  const view = render(<Viewer isOpen={false} onClose={onClose} />);
  const open = () => view.rerender(<Viewer isOpen onClose={onClose} />);
  const close = () => view.rerender(<Viewer isOpen={false} onClose={onClose} />);
  return { onClose, open, close };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useCloseOnBack', () => {
  it("ajoute à l'ouverture une entrée d'historique qui garde l'état du routeur", () => {
    const { open } = renderViewer();
    const length = window.history.length;

    open();

    expect(window.history.length).toBe(length + 1);
    expect(window.history.state).toMatchObject(routerState);
  });

  it('se ferme avec le bouton retour, sans revenir une page de plus en arrière', async () => {
    const { onClose, open, close } = renderViewer();
    open();

    act(() => window.history.back());
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const back = vi.spyOn(window.history, 'back');
    close();

    expect(back).not.toHaveBeenCalled();
  });

  it("retire son entrée d'historique quand on ferme autrement", async () => {
    const { onClose, open, close } = renderViewer();
    open();
    const back = vi.spyOn(window.history, 'back');

    close();

    expect(back).toHaveBeenCalledOnce();
    await waitFor(() => expect(window.history.state).toEqual(routerState));
    expect(onClose).not.toHaveBeenCalled();
  });
});
