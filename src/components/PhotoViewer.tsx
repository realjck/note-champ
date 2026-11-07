import { useEffect, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import type { NoteImage } from '../types';

const LABELS = {
  Lightbox: 'Visionneuse de photos',
  'Photo gallery': 'Photos de la note',
  Carousel: 'carrousel',
  Slide: 'photo',
  '{index} of {total}': 'Photo {index} sur {total}',
  Close: 'Fermer',
  'Zoom in': 'Zoomer',
  'Zoom out': 'Dézoomer',
};

interface PhotoViewerProps {
  images: NoteImage[];
  /** Photo affichée à l'ouverture. */
  index: number;
  onClose: () => void;
}

/** URL temporaires des photos, libérées à la fermeture de la visionneuse. */
function usePhotoUrls(images: NoteImage[]) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = images.map((image) => URL.createObjectURL(image.blob));
    setUrls(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  return urls;
}

/** Visionneuse plein écran : zoom par pincement, double tap ou molette, et glissement d'une photo à l'autre. */
export default function PhotoViewer({ images, index, onClose }: PhotoViewerProps) {
  const urls = usePhotoUrls(images);
  if (urls.length !== images.length) return null;

  const slides = images.map((image, i) => ({
    src: urls[i],
    width: image.width,
    height: image.height,
    alt: `Photo ${i + 1}`,
  }));

  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom]}
      labels={LABELS}
      // Les photos font 1600 px au plus : autoriser à grossir au-delà, sinon le zoom est à peine visible sur un téléphone.
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      carousel={{ finite: true }}
      controller={{ closeOnPullDown: true, closeOnBackdropClick: true }}
      // Pas de flèches : on passe d'une photo à l'autre en glissant (ou avec les flèches du clavier).
      render={{ buttonPrev: () => null, buttonNext: () => null }}
    />
  );
}
