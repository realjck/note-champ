import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  /** Facultatif : une question en titre peut suffire. */
  message?: ReactNode;
  confirmLabel: string;
  /** Sans libellé d'annulation, la modale devient un simple message avec un seul bouton. */
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onClose: () => void;
}

const TONE_CLASSES = {
  primary: 'bg-blue-600 hover:bg-blue-700',
  danger: 'bg-red-600 hover:bg-red-700',
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 id="confirm-modal-title" className={`text-xl font-semibold pr-6 dark:text-white ${message ? 'mb-4' : 'mb-6'}`}>
          {title}
        </h3>
        {message && <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">{message}</p>}

        <div className="flex space-x-4">
          {cancelLabel && (
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 px-4 text-white rounded-lg ${TONE_CLASSES[tone]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
