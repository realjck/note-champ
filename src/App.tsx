import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import Navigation from './components/Navigation';
import EntryList from './components/EntryList';
import Editor from './components/Editor';
import Settings from './components/Settings';

function App() {
  const { loadEntries, loadPreferences, preferences } = useStore();

  useEffect(() => {
    loadEntries();
    loadPreferences();
  }, []);

  return (
    <BrowserRouter>
      <div className={`min-h-screen ${preferences.theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-2xl mx-auto pb-20">
          <Routes>
            <Route path="/" element={<EntryList />} />
            <Route path="/new" element={<Editor />} />
            <Route path="/edit/:id" element={<Editor />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          <Navigation />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;