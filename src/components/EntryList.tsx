import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Trash2, X, PlusCircle, Image as ImageIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import DeleteModal from './DeleteModal';
import logo from '../assets/images/logo.png';
import type { JournalEntry } from '../types';

const UNTITLED = 'Sans titre';

const displayTitle = (entry: JournalEntry) => entry.title.trim() || UNTITLED;

function PhotoCount({ count }: { count: number }) {
  return (
    <span
      role="img"
      aria-label={`${count} ${count > 1 ? 'photos' : 'photo'}`}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900"
    >
      <ImageIcon className="w-4 h-4" aria-hidden="true" />
      <span aria-hidden="true">{count}</span>
    </span>
  );
}

export default function EntryList() {
  const navigate = useNavigate();
  const { entries, imageCounts, isLoading, deleteEntry } = useStore();
  const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<{ id: string; title: string } | null>(null);

  // Restaurer la position du scroll au chargement
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('scrollPosition');
    if (savedScrollPosition !== null) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      sessionStorage.removeItem('scrollPosition');
    }
  }, []);

  // Sauvegarder la position du scroll avant de naviguer
  const handleNavigate = (path: string) => {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    sessionStorage.setItem('scrollPosition', scrollPosition.toString());
    navigate(path);
  };

  const filteredEntries = entries.filter(entry => 
    entry.title.toLowerCase().includes(search.toLowerCase()) ||
    entry.content.toLowerCase().includes(search.toLowerCase())
  );

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

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

  const clearSearch = () => {
    setSearch('');
  };

  return (
    <div className="p-4">
      <div className="text-xl sticky top-0 z-10 bg-gray-100 dark:bg-gray-900 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2 h-12 -mt-1 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          {search && (
            <button
              onClick={clearSearch}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
            <div
              role="status"
              aria-label="Chargement"
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"
            ></div>
          </div>
        ) : (
          <>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-[calc(100vh-12rem)]">
                <div className="flex items-center mb-4">
                  <img src={logo} alt="Logo" className="w-12 h-12 mr-2" />
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    NoteChamp
                  </h1>
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  <p className="text-xl">
                    Cliquez sur <PlusCircle className="w-6 h-6 inline mx-1" /> pour créer une nouvelle note
                  </p>
                </div>
              </div>
            ) : (
              sortedEntries.map(entry => (
                <div
                  key={entry.id}
                  className="relative bg-white dark:bg-gray-800 rounded-lg shadow p-3 hover:shadow-md transition-shadow"
                  style={{ borderLeft: `8px solid ${entry.color}` }}
                >
                  {/* Bouton invisible couvrant la carte : évite d'imbriquer le bouton Supprimer dans un autre bouton. */}
                  <button
                    onClick={() => handleNavigate(`/edit/${entry.id}`)}
                    aria-label={`Ouvrir la note « ${displayTitle(entry)} »`}
                    className="absolute inset-0 w-full rounded-lg"
                  />
                  <div className="flex justify-between items-start">
                    <div>
                      <h3
                        className={`font-semibold text-xl mb-2 ${
                          entry.title.trim() ? 'dark:text-white' : 'italic text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {displayTitle(entry)}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <p>{format(new Date(entry.createdAt), 'PPP', { locale: fr })}</p>
                        {imageCounts[entry.id] && <PhotoCount count={imageCounts[entry.id]} />}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(entry.id, displayTitle(entry))}
                      aria-label={`Supprimer la note « ${displayTitle(entry)} »`}
                      className="relative p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                  <p className="mt-2 text-lg pb-1 -mb-1 text-gray-600 dark:text-gray-300 line-clamp-3">
                    {entry.content}
                  </p>
                </div>
              ))
            )}
          </>
        )}
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
