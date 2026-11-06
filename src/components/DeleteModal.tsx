import ConfirmModal from './ConfirmModal';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

export default function DeleteModal({ isOpen, onClose, onConfirm, title }: DeleteModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      title="Effacer la note"
      message={<>Êtes-vous sûr(e) de vouloir supprimer "{title}"&nbsp;?</>}
      confirmLabel="Effacer"
      cancelLabel="Annuler"
      tone="danger"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
