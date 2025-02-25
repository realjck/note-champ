import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useStore } from '../store/useStore';
import { db } from '../lib/db';

export default function Settings() {
  const { preferences, updatePreferences, entries, loadEntries } = useStore();

  const toggleTheme = () => {
    updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' });
  };

  const handleExportData = async () => {
    const exportData = {
      entries: entries,
      preferences: preferences,
      exportDate: new Date().toISOString()
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memochamp-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.entries || !Array.isArray(importData.entries)) {
        throw new Error('Invalid data format');
      }

      const entriesStore = db.transaction('journal_entries', 'readwrite').objectStore('journal_entries');
      await entriesStore.clear();

      for (const entry of importData.entries) {
        await db.add('journal_entries', entry);
      }

      if (importData.preferences) {
        await updatePreferences(importData.preferences);
      }

      await loadEntries();

      alert('Data imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing data. Please check the file format.');
    }

    event.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 dark:text-white">Paramètres</h1>
      
      <div className="space-y-8">
      <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium dark:text-white">Thème</h3>
            <p className="text-gray-500 dark:text-gray-400">Mode clair / Mode sombre</p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow"
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
              className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Exporter le journal
            </button>
            
            <label className="block w-full p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-center cursor-pointer">
              Importer le journal
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
