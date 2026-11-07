import { describe, expect, it } from 'vitest';
import { centerSquare, fitWithin, processImage } from './images';

describe('fitWithin', () => {
  it('réduit une photo paysage à la taille maximale sur la largeur', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('réduit une photo portrait à la taille maximale sur la hauteur', () => {
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("n'agrandit pas une petite photo", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('arrondit au pixel sans descendre sous 1 px', () => {
    expect(fitWithin(3001, 2000, 1600)).toEqual({ width: 1600, height: 1066 });
    expect(fitWithin(10000, 1, 1600)).toEqual({ width: 1600, height: 1 });
  });
});

describe('centerSquare', () => {
  it('recadre une photo paysage au centre', () => {
    expect(centerSquare(4000, 3000)).toEqual({ x: 500, y: 0, size: 3000 });
  });

  it('recadre une photo portrait au centre', () => {
    expect(centerSquare(3000, 4000)).toEqual({ x: 0, y: 500, size: 3000 });
  });
});

describe('processImage', () => {
  it("refuse un fichier qui n'est pas une image", async () => {
    const file = new File(['%PDF'], 'document.pdf', { type: 'application/pdf' });

    await expect(processImage(file)).rejects.toThrow("« document.pdf » n'est pas une image.");
  });
});
