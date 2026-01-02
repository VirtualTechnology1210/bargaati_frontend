import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import ConfirmationModal from '../ConfirmationModal';
import { BASE_URL } from '../../util';

const ViewOfferTitle = () => {
  const [offerTitles, setOfferTitles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Close',
    onConfirm: () => setIsModalOpen(false),
  });

  useEffect(() => {
    fetchOfferTitles();
  }, []);

  const fetchOfferTitles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/offertitle`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setOfferTitles(response.data);
    } catch (error) {
      console.error('Error fetching offer titles:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to load offer titles. Please try again.',
        confirmText: 'OK',
        cancelText: 'Close',
        onConfirm: () => setIsModalOpen(false),
      });
      setIsModalOpen(true);
    }
  };

  const handleDelete = async (id) => {
    setModalConfig({
      title: 'Delete Offer Title',
      message: 'Are you sure you want to delete this offer title?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${BASE_URL}/api/offertitle/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setIsModalOpen(false);
          fetchOfferTitles();
          setModalConfig({
            title: 'Deleted',
            message: 'Offer title has been deleted.',
            confirmText: 'OK',
            cancelText: 'Close',
            onConfirm: () => setIsModalOpen(false),
          });
          setIsModalOpen(true);
        } catch (error) {
          console.error('Error deleting offer title:', error);
          setIsModalOpen(false);
          setModalConfig({
            title: 'Error',
            message: 'Failed to delete offer title.',
            confirmText: 'OK',
            cancelText: 'Close',
            onConfirm: () => setIsModalOpen(false),
          });
          setIsModalOpen(true);
        }
      },
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id, title, isActive) => {
    const activeTitles = offerTitles.filter(t => t.is_active).length;

    if (!isActive && activeTitles >= 2) {
      setModalConfig({
        title: 'Limit Reached',
        message: 'Only two active titles are allowed at a time.',
        confirmText: 'OK',
        cancelText: 'Close',
        onConfirm: () => setIsModalOpen(false),
      });
      setIsModalOpen(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', title);
      formData.append('is_active', String(!isActive));
      await axios.put(`${BASE_URL}/api/offertitle/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchOfferTitles();
      setModalConfig({
        title: 'Success',
        message: isActive ? 'Offer title deactivated.' : 'Offer title activated.',
        confirmText: 'OK',
        cancelText: 'Close',
        onConfirm: () => setIsModalOpen(false),
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error updating offer title:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to update offer title.',
        confirmText: 'OK',
        cancelText: 'Close',
        onConfirm: () => setIsModalOpen(false),
      });
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-[60vh] bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl bg-white shadow-lg rounded-xl">
        <div className="px-6 py-4 border-b">
          <h2 className="text-2xl font-semibold">View Offer Titles</h2>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Title</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {offerTitles.map((offer) => (
                <tr key={offer.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900">{offer.title}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${offer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {offer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 space-x-2">
                    <button
                      onClick={() => handleToggleActive(offer.id, offer.title, offer.is_active)}
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${offer.is_active ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    >
                      {offer.is_active ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                      {offer.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 shadow-sm"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

export default ViewOfferTitle;
