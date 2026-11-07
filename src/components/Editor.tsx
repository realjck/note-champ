import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { useNoteImages } from '../hooks/useNoteImages';
import { useCloseOnBack } from '../hooks/useCloseOnBack';
import ConfirmModal from './ConfirmModal';
import PhotoStrip from './PhotoStrip';
import PhotoViewer from './PhotoViewer';
import type { JournalEntry, NoteImage } from '../types';

const COLORS = [
  { value: '#FF6B6B', name: 'Rouge' },
  { value: '#4ECDC4', name: 'Turquoise' },
  { value: '#3498DB', name: 'Bleu' },
  { value: '#f5d222', name: 'Jaune' },
  { value: '#D4A5A5', name: 'Rose' },
  { value: '#9B59B6', name: 'Violet' },
  { value: '#2ECC71', name: 'Vert' },
];

const AUTOSAVE_DELAY_MS = 500;

type EditableFields = Partial<Pick<JournalEntry, 'title' | 'content' | 'color'>>;

const createEntry = (): JournalEntry => {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title: '', content: '', color: COLORS[0].value, createdAt: now, updatedAt: now };
};

export default function Editor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { entries, isLoading, saveEntry } = useStore();
  const [entry, setEntry] = useState<JournalEntry | null>(() => (id ? null : createEntry()));
  const { schedule, flush } = useDebouncedSave(saveEntry, AUTOSAVE_DELAY_MS);
  const photos = useNoteImages(entry);
  const [photoToDelete, setPhotoToDelete] = useState<NoteImage | null>(null);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const closeViewer = useCallback(() => setViewerIndex(null), []);
  useCloseOnBack(viewerIndex !== null, closeViewer);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Charge la note une seule fois : les rechargements du store (après chaque sauvegarde auto)
  // ne doivent pas écraser la saisie en cours.
  useEffect(() => {
    if (entry || isLoading) return;
    const existingEntry = entries.find(e => e.id === id);
    if (existingEntry) {
      setEntry(existingEntry);
    } else {
      navigate('/', { replace: true });
    }
  }, [entry, entries, id, isLoading, navigate]);

  useEffect(() => {
    const adjustTextareaHeight = () => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto'; // Réinitialise la hauteur pour la recalculer
        textarea.style.height = `${textarea.scrollHeight}px`; // Ajuste la hauteur au contenu
      }
    };

    adjustTextareaHeight();
    window.addEventListener('resize', adjustTextareaHeight);

    return () => {
      window.removeEventListener('resize', adjustTextareaHeight);
    };
  }, [entry?.content]);

  if (!entry) return null;

  const update = (changes: EditableFields) => {
    const next = { ...entry, ...changes, updatedAt: new Date().toISOString() };
    setEntry(next);
    schedule(next);
  };

  const handleDone = async () => {
    await flush();
    navigate('/');
  };

  const handleAddPhotos = async (files: File[]) => {
    setPhotoErrors(await photos.add(entry, files));
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;
    await photos.remove(photoToDelete);
    setPhotoToDelete(null);
    // Applique la règle de la note vide, qui dépend aussi des photos.
    schedule(entry);
  };

  return (
    <div className="p-4 h-[calc(100dvh-5rem)] flex flex-col">
      <input
        type="text"
        value={entry.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Titre"
        className="w-full mb-4 p-2 h-12 -mt-1 text-xl font-semibold rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />

      <div className="mb-4 flex space-x-3">
        {COLORS.map(({ value, name }) => (
          <button
            key={value}
            onClick={() => update({ color: value })}
            aria-label={name}
            aria-pressed={entry.color === value}
            className={`w-8 h-8 rounded-full ${entry.color === value ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
            style={{ backgroundColor: value }}
          />
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={entry.content}
        onChange={(e) => update({ content: e.target.value })}
        placeholder="Écrivez votre note..."
        className="text-xl w-full flex-1 mb-4 p-4 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none"
        style={{ height: 'calc(100dvh - 16rem)' }}
      />

      <PhotoStrip
        images={photos.images}
        isProcessing={photos.isProcessing}
        onAdd={handleAddPhotos}
        onDelete={setPhotoToDelete}
        onOpen={setViewerIndex}
      />

      {viewerIndex !== null && (
        <PhotoViewer images={photos.images} index={viewerIndex} onClose={closeViewer} />
      )}

      <button
        onClick={handleDone}
        className="text-xl w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Terminé
      </button>

      <ConfirmModal
        isOpen={photoToDelete !== null}
        title="Supprimer la photo"
        message={<>Supprimer cette photo&nbsp;?</>}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        tone="danger"
        onConfirm={handleDeletePhoto}
        onClose={() => setPhotoToDelete(null)}
      />

      <ConfirmModal
        isOpen={photoErrors.length > 0}
        title={photoErrors.length > 1 ? 'Photos non ajoutées' : 'Photo non ajoutée'}
        message={photoErrors.join('\n')}
        confirmLabel="OK"
        onConfirm={() => setPhotoErrors([])}
        onClose={() => setPhotoErrors([])}
      />
    </div>
  );
}
