import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useStore } from '../store/useStore';
import { db } from '../lib/db';
import { exportBackup, readBackupFile, restoreBackup, type RestorableBackup } from '../lib/backup';
import { formatBytes, getStorageUsage } from '../lib/storage';
import ConfirmModal from './ConfirmModal';

/** Espace occupé par l'application, relu à la demande (null si le navigateur ne l'estime pas). */
function useStorageUsage() {
  const [usage, setUsage] = useState<number | null>(null);
  const refresh = () => getStorageUsage(navigator.storage).then(setUsage);

  useEffect(() => {
    refresh();
  }, []);

  return { usage, refresh };
}

export default function Settings() {
  const { preferences, updatePreferences, entries, loadEntries, loadPreferences } = useStore();
  const [pendingBackup, setPendingBackup] = useState<RestorableBackup | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const storage = useStorageUsage();

  const toggleTheme = () => {
    updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' });
  };

  const handleExportData = async () => {
    setBusyMessage('Préparation de la sauvegarde…');
    try {
      const url = URL.createObjectURL(await exportBackup(db));
      const link = document.createElement('a');
      link.href = url;
      link.download = `notechamp-backup-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      setNotice({ title: 'Export impossible', message: "La sauvegarde n'a pas pu être créée." });
    } finally {
      setBusyMessage(null);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusyMessage('Lecture de la sauvegarde…');
    try {
      setPendingBackup(await readBackupFile(file));
    } catch (error) {
      showImportError(error);
    } finally {
      setBusyMessage(null);
    }
  };

  const handleImportConfirm = async () => {
    if (!pendingBackup) return;
    setPendingBackup(null);
    try {
      await restoreBackup(db, pendingBackup);
      await Promise.all([loadEntries(), loadPreferences(), storage.refresh()]);
      setNotice({ title: 'Import terminé', message: 'Journal importé avec succès.' });
    } catch (error) {
      showImportError(error);
    }
  };

  const showImportError = (error: unknown) => {
    console.error('Import error:', error);
    const reason = error instanceof Error ? `\n${error.message}` : '';
    setNotice({
      title: 'Import impossible',
      message: `Vos notes n'ont pas été modifiées.${reason}`,
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 dark:text-white">Paramètres</h1>
      
      <div className="space-y-8">
      <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-medium dark:text-white">Thème</h3>
            <p className="text-lg text-gray-500 dark:text-gray-400">Mode clair / Mode sombre</p>
          </div>
          <button
            onClick={toggleTheme}
            aria-label={preferences.theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow"
          >
            {preferences.theme === 'light' ? (
              <Sun className="w-8 h-8 text-gray-600 dark:text-gray-300" />
            ) : (
              <Moon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Gestion des données</h2>
          <div className="space-y-4">
            <button
              onClick={handleExportData}
              disabled={busyMessage !== null}
              className="text-lg w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Exporter le journal
            </button>
            
            <label className="text-lg block w-full p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-center cursor-pointer">
              Importer le journal
              <input
                type="file"
                accept=".zip,.json,application/zip,application/json"
                onChange={handleImportData}
                disabled={busyMessage !== null}
                className="hidden"
              />
            </label>
            {busyMessage && (
              <p role="status" className="text-lg text-center text-gray-500 dark:text-gray-400">
                {busyMessage}
              </p>
            )}
            {storage.usage !== null && (
              <p className="text-lg text-gray-500 dark:text-gray-400">
                Espace utilisé : {formatBytes(storage.usage)}
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={pendingBackup !== null}
        title="Importer le journal"
        message={`Remplacer vos ${entries.length} note(s) actuelle(s) par les ${pendingBackup?.entries.length ?? 0} note(s) et ${pendingBackup?.images.length ?? 0} photo(s) du fichier ?`}
        confirmLabel="Remplacer"
        cancelLabel="Annuler"
        tone="danger"
        onConfirm={handleImportConfirm}
        onClose={() => setPendingBackup(null)}
      />

      <ConfirmModal
        isOpen={notice !== null}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        confirmLabel="OK"
        onConfirm={() => setNotice(null)}
        onClose={() => setNotice(null)}
      />
    </div>
  );
}
