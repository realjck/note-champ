import { create } from 'zustand';
import type { JournalEntry, UserPreferences } from '../types';
import { db, defaultPreferences } from '../lib/db';

interface State {
  entries: JournalEntry[];
  preferences: UserPreferences;
  isLoading: boolean;
  loadEntries: () => Promise<void>;
  addEntry: (entry: JournalEntry) => Promise<void>;
  updateEntry: (entry: JournalEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  loadPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

export const useStore = create<State>((set, get) => ({
  entries: [],
  preferences: defaultPreferences,
  isLoading: true,

  loadEntries: async () => {
    const entries = await db.getAll('journal_entries');
    set({ entries, isLoading: false });
  },

  addEntry: async (entry) => {
    await db.add('journal_entries', entry);
    get().loadEntries();
  },

  updateEntry: async (entry) => {
    await db.put('journal_entries', entry);
    get().loadEntries();
  },

  deleteEntry: async (id) => {
    await db.delete('journal_entries', id);
    get().loadEntries();
  },

  loadPreferences: async () => {
    const prefs = await db.get('preferences', 'user') || defaultPreferences;
    set({ preferences: prefs });
  },

  updatePreferences: async (prefs) => {
    const newPrefs = { ...get().preferences, ...prefs };
    await db.put('preferences', newPrefs, 'user');
    set({ preferences: newPrefs });
  },
}));