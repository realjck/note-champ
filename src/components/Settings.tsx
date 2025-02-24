import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Settings() {
  const { preferences, updatePreferences } = useStore();

  const toggleTheme = () => {
    updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' });
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6 dark:text-white">Settings</h2>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium dark:text-white">Theme</h3>
            <p className="text-gray-500 dark:text-gray-400">Toggle between light and dark mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
          >
            {preferences.theme === 'light' ? (
              <Moon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            ) : (
              <Sun className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2 dark:text-white">Sort Entries</h3>
          <select
            value={preferences.sortBy}
            onChange={(e) => updatePreferences({ sortBy: e.target.value as 'date' | 'color' | 'length' })}
            className="w-full p-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="date">Date</option>
            <option value="color">Color</option>
            <option value="length">Length</option>
          </select>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2 dark:text-white">Sort Order</h3>
          <select
            value={preferences.sortOrder}
            onChange={(e) => updatePreferences({ sortOrder: e.target.value as 'asc' | 'desc' })}
            className="w-full p-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
    </div>
  );
}