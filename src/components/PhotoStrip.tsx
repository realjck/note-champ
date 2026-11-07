import { ImagePlus, Loader2, X } from 'lucide-react';
import { useHorizontalWheel } from '../hooks/useHorizontalWheel';
import { useObjectUrl } from '../hooks/useObjectUrl';
import type { NoteImage } from '../types';

interface PhotoStripProps {
  images: NoteImage[];
  isProcessing: boolean;
  onAdd: (files: File[]) => void;
  onDelete: (image: NoteImage) => void;
  /** Ouvre la visionneuse sur la photo à cette position (à partir de 0). */
  onOpen: (index: number) => void;
}

interface ThumbnailProps {
  image: NoteImage;
  index: number;
  onOpen: () => void;
  onDelete: () => void;
}

function Thumbnail({ image, index, onOpen, onDelete }: ThumbnailProps) {
  const url = useObjectUrl(image.thumbnail);

  return (
    <li className="relative shrink-0 snap-start">
      <button onClick={onOpen} aria-label={`Agrandir la photo ${index}`} className="block rounded-lg">
        <img src={url} alt={`Photo ${index}`} className="w-20 h-20 rounded-lg object-cover" />
      </button>
      <button
        onClick={onDelete}
        aria-label={`Supprimer la photo ${index}`}
        className="absolute -top-1 -right-1 w-8 h-8 flex items-center justify-center"
      >
        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white">
          <X className="w-4 h-4" />
        </span>
      </button>
    </li>
  );
}

/** Bouton d'ajout et bande de vignettes défilant horizontalement. */
export default function PhotoStrip({ images, isProcessing, onAdd, onDelete, onOpen }: PhotoStripProps) {
  const stripRef = useHorizontalWheel<HTMLUListElement>();

  return (
    <div className="mb-4 flex items-start gap-3">
      <label className="shrink-0 w-20 h-20 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 dark:border-gray-600 dark:text-gray-400">
        {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
        ) : (
          <ImagePlus className="w-6 h-6" aria-hidden="true" />
        )}
        <span className="text-xs text-center leading-tight">Ajouter des photos</span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={isProcessing}
          className="sr-only"
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []));
            // Permet de choisir à nouveau le même fichier.
            e.target.value = '';
          }}
        />
      </label>

      {isProcessing && (
        <span role="status" className="sr-only">
          Ajout des photos en cours
        </span>
      )}

      {images.length > 0 && (
        // La marge intérieure laisse dépasser les croix ; la marge négative la compense.
        <ul ref={stripRef} className="thin-scrollbar-x -mt-1 pt-1 pr-1 flex gap-3 snap-x">
          {images.map((image, i) => (
            <Thumbnail
              key={image.id}
              image={image}
              index={i + 1}
              onOpen={() => onOpen(i)}
              onDelete={() => onDelete(image)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
