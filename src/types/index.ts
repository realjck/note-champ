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
}

/** Photo jointe à une note. */
export interface NoteImage {
  id: string;
  entryId: string;
  /** JPEG, 1600 px maximum sur le plus grand côté. */
  blob: Blob;
  /** JPEG carré d'environ 200 px, recadré au centre. */
  thumbnail: Blob;
  /** Dimensions de `blob`, nécessaires à la visionneuse. */
  width: number;
  height: number;
  /** Date ISO, qui fixe l'ordre d'affichage. */
  createdAt: string;
}
