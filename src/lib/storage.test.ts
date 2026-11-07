import { describe, expect, it } from 'vitest';
import { formatBytes, getStorageUsage, requestPersistentStorage } from './storage';

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

describe('getStorageUsage', () => {
  // Le quota n'est pas utilisé : il ne reflète pas l'espace libre de l'appareil.
  it("renvoie l'espace occupé estimé par le navigateur", async () => {
    const storage = { estimate: async () => ({ usage: 12_300_000, quota: 1e10 }) };

    expect(await getStorageUsage(storage)).toBe(12_300_000);
  });

  it("renvoie null quand le navigateur ne fournit pas d'estimation", async () => {
    expect(await getStorageUsage(undefined)).toBeNull();
    expect(await getStorageUsage({})).toBeNull();
    expect(await getStorageUsage({ estimate: async () => ({}) })).toBeNull();
  });
});

describe('formatBytes', () => {
  it('affiche les octets, ko, Mo et Go à la française', () => {
    expect(formatBytes(0)).toBe('0 o');
    expect(formatBytes(512)).toBe('512 o');
    expect(formatBytes(1_500)).toBe('1,5 ko');
    expect(formatBytes(12_345_678)).toBe('12,3 Mo');
    expect(formatBytes(2_000_000_000)).toBe('2 Go');
  });
});
