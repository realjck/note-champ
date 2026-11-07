import { useNavigate, useLocation } from 'react-router-dom';
import { Book, PlusCircle, Settings } from 'lucide-react';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isEditing = location.pathname === '/new' || location.pathname.startsWith('/edit/');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex justify-around py-3">
          <button
            onClick={() => navigate('/')}
            className={`p-2 rounded-lg ${
              location.pathname === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Book className="w-7 h-7" />
          </button>
          <button
            onClick={() => navigate('/new')}
            disabled={isEditing}
            className={`p-2 rounded-lg ${
              isEditing 
                ? 'text-gray-400 cursor-not-allowed opacity-50' 
                : location.pathname === '/new'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <PlusCircle className="w-7 h-7" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className={`p-2 rounded-lg ${
              location.pathname === '/settings' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Settings className="w-7 h-7" />
          </button>
        </div>
      </div>
    </nav>
  );
}
