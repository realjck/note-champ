import { describe, expect, it } from 'vitest';
import { requestPersistentStorage } from './storage';

function fakeStorage({ persisted, grant }: { persisted: boolean; grant: boolean }) {
  const calls = { persist: 0 };
  const storage = {
    persisted: async () => persisted,
    persist: async () => {
      calls.persist++;
      return grant;
    },
  };
  return { storage, calls };
}

describe('requestPersistentStorage', () => {
  it("demande la persistance quand le stockage n'est pas encore persistant", async () => {
    const { storage, calls } = fakeStorage({ persisted: false, grant: true });

    expect(await requestPersistentStorage(storage)).toBe(true);
    expect(calls.persist).toBe(1);
  });

  it('signale un refus du navigateur', async () => {
    const { storage } = fakeStorage({ persisted: false, grant: false });

    expect(await requestPersistentStorage(storage)).toBe(false);
  });

  it('ne redemande pas quand le stockage est déjà persistant', async () => {
    const { storage, calls } = fakeStorage({ persisted: true, grant: true });

    expect(await requestPersistentStorage(storage)).toBe(true);
    expect(calls.persist).toBe(0);
  });

  it("renvoie false quand le navigateur n'a pas d'API de stockage", async () => {
    expect(await requestPersistentStorage(undefined)).toBe(false);
  });
});
