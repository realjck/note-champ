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

/** Espace occupé et quota accordé à l'application, en octets. */
export interface StorageUsage {
  usage: number;
  quota: number;
}

/** Estimation du navigateur, ou null s'il ne la fournit pas en entier. */
export async function getStorageUsage(
  storage: Partial<Pick<StorageManager, 'estimate'>> | undefined
): Promise<StorageUsage | null> {
  if (!storage?.estimate) return null;
  const { usage, quota } = await storage.estimate();
  return usage === undefined || !quota ? null : { usage, quota };
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

/** Par exemple « 5,9 Mo sur 10,7 Go (0,1 %) ». */
export function formatStorageUsage({ usage, quota }: StorageUsage): string {
  const percent = decimal.format((usage / quota) * 100);
  return `${formatBytes(usage)} sur ${formatBytes(quota)} (${percent} %)`;
}
