import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Trash2, Edit2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import DeleteModal from './DeleteModal';

export default function EntryList() {
  const navigate = useNavigate();
  const { entries, deleteEntry, preferences } = useStore();
  const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<{ id: string; title: string } | null>(null);

  const filteredEntries = entries.filter(entry => 
    entry.title.toLowerCase().includes(search.toLowerCase()) ||
    entry.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteClick = (id: string, title: string) => {
    setSelectedEntry({ id, title });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedEntry) {
      await deleteEntry(selectedEntry.id);
      setDeleteModalOpen(false);
      setSelectedEntry(null);
    }
  };

  return (
    <div className="p-4">
      <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {filteredEntries.map(entry => (
          <div
            key={entry.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            style={{ borderLeft: `4px solid ${entry.color}` }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg dark:text-white">{entry.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(entry.createdAt), 'PPP')}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/edit/${entry.id}`)}
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(entry.id, entry.title)}
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-300 line-clamp-3">
              {entry.content}
            </p>
          </div>
        ))}
      </div>

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedEntry(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={selectedEntry?.title || ''}
      />
    </div>
  );
}