import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/useStore';
import type { JournalEntry } from '../types';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEEAD', '#D4A5A5',
  '#9B59B6', '#3498DB', '#2ECC71'
];

export default function Editor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { entries, addEntry, updateEntry } = useStore();
  const [entry, setEntry] = useState<JournalEntry>({
    id: '',
    title: '',
    content: '',
    color: COLORS[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (id) {
      const existingEntry = entries.find(e => e.id === id);
      if (existingEntry) {
        setEntry(existingEntry);
      }
    } else {
      setEntry({
        ...entry,
        id: uuidv4()
      });
    }
  }, [id, entries]);

  useEffect(() => {
    const adjustTextareaHeight = () => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto'; // Reset height to recalculate
        textarea.style.height = `${textarea.scrollHeight}px`; // Set height to scrollHeight
      }
    };

    adjustTextareaHeight();
    window.addEventListener('resize', adjustTextareaHeight);

    return () => {
      window.removeEventListener('resize', adjustTextareaHeight);
    };
  }, [entry.content]);

  const handleSave = async () => {
    const now = new Date().toISOString();
    const updatedEntry = {
      ...entry,
      updatedAt: now
    };

    if (id) {
      await updateEntry(updatedEntry);
    } else {
      await addEntry(updatedEntry);
    }
    navigate('/');
  };

  return (
    <div className="p-4 h-[calc(100vh-5rem)] flex flex-col">
      <input
        type="text"
        value={entry.title}
        onChange={(e) => setEntry({ ...entry, title: e.target.value })}
        placeholder="Entry title"
        className="w-full mb-4 p-2 text-xl font-semibold rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />

      <div className="mb-4 flex space-x-2">
        {COLORS.map(color => (
          <button
            key={color}
            onClick={() => setEntry({ ...entry, color })}
            className={`w-8 h-8 rounded-full ${entry.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={entry.content}
        onChange={(e) => setEntry({ ...entry, content: e.target.value })}
        placeholder="Write your thoughts..."
        className="w-full flex-1 mb-4 p-4 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none"
        style={{ height: 'calc(100vh - 16rem)' }}
      />

      <button
        onClick={handleSave}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Save Entry
      </button>
    </div>
  );
}