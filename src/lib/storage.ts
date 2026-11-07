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

/**
 * Espace occupé par l'application en octets, ou null si le navigateur ne l'estime pas.
 * Le quota n'est pas exposé : les navigateurs l'arrondissent ou le figent, et il
 * ne reflète pas l'espace libre de l'appareil.
 */
export async function getStorageUsage(
  storage: Partial<Pick<StorageManager, 'estimate'>> | undefined
): Promise<number | null> {
  if (!storage?.estimate) return null;
  const { usage } = await storage.estimate();
  return usage ?? null;
}

const UNITS = ['o', 'ko', 'Mo', 'Go'];
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** Taille lisible en unités décimales, comme les gestionnaires de fichiers des téléphones. */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${decimal.format(value)} ${UNITS[unit]}`;
}