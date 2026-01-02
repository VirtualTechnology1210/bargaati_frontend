import React from 'react';

const RemoveAlert = ({ isOpen, onClose, onRemove, itemName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-white/60 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Remove Item
          </h3>
          
          <p className="text-gray-600 mb-6">
            Are you sure you want to remove this item?
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onRemove}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              REMOVE
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-white text-gray-700 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoveAlert; 