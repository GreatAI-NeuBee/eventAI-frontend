import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import Button from './Button';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  isLoading?: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Event",
  message = "Are you sure you want to delete this event? This action cannot be undone.",
  itemName,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300" />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md transform transition-all duration-300 scale-100 opacity-100">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            </div>
            {!isLoading && (
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              {message}
            </p>
            {itemName && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Event:</span> {itemName}
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              This action is permanent and cannot be undone.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="min-w-[80px] bg-red-600 hover:bg-red-700 text-white"
              icon={isLoading ? undefined : Trash2}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </div>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
