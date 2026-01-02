import React, { useState } from 'react';
import axios from 'axios';
import ConfirmationModal from '../ConfirmationModal';
import { BASE_URL } from '../../util';


const AddOfferTitle = () => {
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Close',
    onConfirm: () => setIsModalOpen(false),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setModalConfig({
          title: 'Login required',
          message: 'You must be logged in to add an offer title.',
          confirmText: 'OK',
          cancelText: 'Close',
          onConfirm: () => setIsModalOpen(false),
        });
        setIsModalOpen(true);
        return;
      }
      const formData = new FormData();
      formData.append('title', title);
      formData.append('is_active', String(isActive));
      await axios.post(
        `${BASE_URL}/api/offertitle`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setModalConfig({
        title: 'Success',
        message: 'Offer title added successfully.',
        confirmText: 'OK',
        cancelText: 'Close',
        onConfirm: () => setIsModalOpen(false),
      });
      setIsModalOpen(true);
      setTitle('');
      setIsActive(false);
    } catch (error) {
      console.error('Error adding offer title:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to add offer title. Please try again.',
        confirmText: 'OK',
        cancelText: 'Close',
        onConfirm: () => setIsModalOpen(false),
      });
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-6">Add Offer Title</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Active</span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`}
              />
            </button>
          </div>
          <button
            type="submit"
            className="w-full inline-flex justify-center items-center rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Add Title
          </button>
        </form>
      </div>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />
    </div>
  );
};

export default AddOfferTitle;
