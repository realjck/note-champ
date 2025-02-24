export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  sortBy: 'date' | 'color' | 'length';
  sortOrder: 'asc' | 'desc';
}