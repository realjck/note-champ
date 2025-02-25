import React from 'react';
import { X } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

export default function DeleteModal({ isOpen, onClose, onConfirm, title }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h3 className="text-xl font-semibold mb-4 dark:text-white">Effacer la note</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Êtes-vous sûr(e) de vouloir supprimer "{title}"&nbsp;?
        </p>
        
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Effacer
          </button>
        </div>
      </div>
    </div>
  );
}