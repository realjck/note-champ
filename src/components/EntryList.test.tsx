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

describe('EntryList loading state', () => {
  it('shows the spinner, not the empty state, while notes are loading', async () => {
    renderList();
    await act(() => pause(50));

    expect(screen.getByRole('status', { name: 'Chargement' })).toBeTruthy();
    expect(screen.queryByText(EMPTY_STATE_TEXT)).toBeNull();
  });

  it('shows the empty state once loading is done with no notes', async () => {
    renderList();
    act(() => useStore.setState({ isLoading: false }));

    expect(screen.getByText(EMPTY_STATE_TEXT)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
