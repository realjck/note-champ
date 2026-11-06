type PersistableStorage = Partial<Pick<StorageManager, 'persisted' | 'persist'>>;

/**
 * Demande au navigateur de ne pas effacer nos données IndexedDB (manque d'espace,
 * ou règle des 7 jours d'inactivité de Safari). Renvoie true si le stockage est persistant.
 */
export async function requestPersistentStorage(
  storage: PersistableStorage | undefined
): Promise<boolean> {
  if (!storage?.persisted || !storage.persist) return false;
  if (await storage.persisted()) return true;
  return storage.persist();
}
