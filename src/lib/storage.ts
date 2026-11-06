type PersistableStorage = Partial<Pick<StorageManager, 'persisted' | 'persist'>>;

/**
 * Asks the browser not to evict our IndexedDB data (storage pressure, or
 * Safari's 7-day inactivity rule). Resolves to whether storage is persistent.
 */
export async function requestPersistentStorage(
  storage: PersistableStorage | undefined
): Promise<boolean> {
  if (!storage?.persisted || !storage.persist) return false;
  if (await storage.persisted()) return true;
  return storage.persist();
}
