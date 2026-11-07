import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialize } from './db';
import { addImage, deleteImage, getImages } from './noteImages';
import type { NoteImage } from '../types';

const image = (id: string, entryId: string, createdAt: string): NoteImage => ({
  id,
  entryId,
  blob: new Blob(['photo'], { type: 'image/jpeg' }),
  thumbnail: new Blob(['vignette'], { type: 'image/jpeg' }),
  width: 1600,
  height: 1200,
  createdAt,
});

const ids = (images: NoteImage[]) => images.map((img) => img.id);

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  await initialize();
});

describe('photos des notes', () => {
  it("renvoie les photos d'une note dans l'ordre d'ajout", async () => {
    // Identifiants choisis pour que l'ordre des clés diffère de l'ordre d'ajout.
    await addImage(image('z', 'note', '2026-01-01T10:00:00.000Z'));
    await addImage(image('a', 'note', '2026-01-01T10:00:02.000Z'));
    await addImage(image('m', 'note', '2026-01-01T10:00:01.000Z'));

    expect(ids(await getImages('note'))).toEqual(['z', 'm', 'a']);
  });

  it("ne renvoie que les photos de la note demandée", async () => {
    await addImage(image('1', 'note', '2026-01-01T10:00:00.000Z'));
    await addImage(image('2', 'autre', '2026-01-01T10:00:00.000Z'));

    expect(ids(await getImages('note'))).toEqual(['1']);
  });

  it('conserve le contenu des fichiers', async () => {
    await addImage(image('1', 'note', '2026-01-01T10:00:00.000Z'));

    const [stored] = await getImages('note');

    expect(await stored.blob.text()).toBe('photo');
    expect(stored.blob.type).toBe('image/jpeg');
  });

  it('deleteImage supprime une seule photo', async () => {
    await addImage(image('1', 'note', '2026-01-01T10:00:00.000Z'));
    await addImage(image('2', 'note', '2026-01-01T10:00:01.000Z'));

    await deleteImage('1');

    expect(ids(await getImages('note'))).toEqual(['2']);
  });
});
