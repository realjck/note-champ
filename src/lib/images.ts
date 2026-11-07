const MAX_SIZE = 1600;
const THUMBNAIL_SIZE = 200;
const JPEG_QUALITY = 0.85;

export interface ProcessedImage {
  blob: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
}

/** Dimensions réduites pour tenir dans `max` px, sans jamais agrandir. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Plus grand carré centré dans l'image. */
export function centerSquare(width: number, height: number) {
  const size = Math.min(width, height);
  return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2), size };
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("La photo n'a pas pu être convertie."))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

function draw(
  source: ImageBitmap,
  crop: { x: number; y: number; width: number; height: number },
  width: number,
  height: number
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  return toJpeg(canvas);
}

function drawThumbnail(bitmap: ImageBitmap): Promise<Blob> {
  const square = centerSquare(bitmap.width, bitmap.height);
  const size = Math.min(THUMBNAIL_SIZE, square.size);
  return draw(bitmap, { ...square, width: square.size, height: square.size }, size, size);
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    // Respecte l'orientation EXIF des photos de téléphone.
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`Le format de « ${file.name} » n'est pas pris en charge par ce navigateur.`);
  }
}

/**
 * Prépare une photo pour le stockage : JPEG réduit à 1600 px et vignette
 * carrée. Le passage par le canvas retire les métadonnées EXIF, y compris la
 * position GPS.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`« ${file.name} » n'est pas une image.`);
  }

  const bitmap = await decode(file);
  try {
    const full = { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIZE);

    const [blob, thumbnail] = await Promise.all([draw(bitmap, full, width, height), drawThumbnail(bitmap)]);
    return { blob, thumbnail, width, height };
  } finally {
    bitmap.close();
  }
}

/** Recrée la vignette d'une photo déjà enregistrée (import d'une sauvegarde). */
export async function createThumbnail(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    return await drawThumbnail(bitmap);
  } finally {
    bitmap.close();
  }
}
