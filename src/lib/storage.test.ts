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
  it('asks for persistence when storage is not yet persistent', async () => {
    const { storage, calls } = fakeStorage({ persisted: false, grant: true });

    expect(await requestPersistentStorage(storage)).toBe(true);
    expect(calls.persist).toBe(1);
  });

  it('reports a refusal from the browser', async () => {
    const { storage } = fakeStorage({ persisted: false, grant: false });

    expect(await requestPersistentStorage(storage)).toBe(false);
  });

  it('does not ask again when storage is already persistent', async () => {
    const { storage, calls } = fakeStorage({ persisted: true, grant: true });

    expect(await requestPersistentStorage(storage)).toBe(true);
    expect(calls.persist).toBe(0);
  });

  it('returns false when the browser has no storage API', async () => {
    expect(await requestPersistentStorage(undefined)).toBe(false);
  });
});
