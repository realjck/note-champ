import { useEffect, useState } from 'react';
import { processImage } from '../lib/images';
import { addImage, deleteImage, getImages } from '../lib/noteImages';
import { useStore } from '../store/useStore';
import type { JournalEntry, NoteImage } from '../types';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Photos de la note ouverte dans l'éditeur : chargement, ajout et suppression. */
export function useNoteImages(entry: JournalEntry | null) {
  const [images, setImages] = useState<NoteImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const entryId = entry?.id;

  useEffect(() => {
    if (!entryId) return;
    let active = true;
    getImages(entryId).then((stored) => active && setImages(stored));
    return () => {
      active = false;
    };
  }, [entryId]);

  /** Ajoute les fichiers un par un et renvoie les messages d'erreur des fichiers refusés. */
  const add = async (note: JournalEntry, files: File[]): Promise<string[]> => {
    const errors: string[] = [];
    setIsProcessing(true);
    for (const file of files) {
      try {
        const image: NoteImage = {
          id: crypto.randomUUID(),
          entryId: note.id,
          ...(await processImage(file)),
          createdAt: new Date().toISOString(),
        };
        await addImage(note, image);
        setImages((current) => [...current, image]);
      } catch (error) {
        errors.push(errorMessage(error));
      }
    }
    setIsProcessing(false);
    // Une note neuve vient peut-être d'être créée : la liste doit la connaître.
    await useStore.getState().loadEntries();
    return errors;
  };

  const remove = async (image: NoteImage) => {
    await deleteImage(image.id);
    setImages((current) => current.filter((img) => img.id !== image.id));
  };

  return { images, isProcessing, add, remove };
}
