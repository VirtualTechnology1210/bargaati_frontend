import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  icon: Icon = FaExclamationTriangle,
  iconColor = "text-yellow-500",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-in-out" onClick={e => e.stopPropagation()}>
        <div className="flex items-start">
          <div className={`mr-4 flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 ${iconColor}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-grow">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
