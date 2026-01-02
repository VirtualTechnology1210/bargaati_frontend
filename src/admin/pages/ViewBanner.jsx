import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Image as ImageIcon, Trash2, AlertTriangle, Search, Plus, CheckCircle2, Power } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../../util';
import ConfirmationModal from '../ConfirmationModal';

const ViewBanner = () => {
  const [banners, setBanners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Fetch banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/api/banner/getbanner`);
        const result = response.data;
        
        if (result.success) {
          setBanners(result.data || []);
          setError(null);
        } else {
          console.error('API returned an error:', result.message || 'Unknown error');
          setError(result.message || 'Failed to load banners. Please try again.');
          setBanners([]);
        }
      } catch (error) {
        console.error('Error fetching banners:', error);
        setError('Failed to load banners. Please try again.');
        setBanners([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBanners();
  }, []);

  // Delete banner handler
  const handleDeleteBanner = (id) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this banner?',
      onConfirm: () => confirmDelete(id),
    });
  };

  const confirmDelete = async (id) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/banner/deletebanner/${id}`);
      if (response.data.success) {
        setBanners(banners.filter(banner => banner.id !== id));
        toast.success('Banner deleted successfully');
      } else {
        console.error('Error response:', response.data);
        toast.error(response.data.message || 'Failed to delete banner');
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error(error.response?.data?.message || 'Failed to delete banner');
    } finally {
      setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    }
  };

  // Toggle banner activation status
  const handleActivateBanner = async (id, isActive) => {
    try {
      setLoading(true);
      // Enforce max 5 active banners
      const activeCount = banners.filter(b => b.isactive).length;
      if (!isActive && activeCount >= 5) {
        toast.error('A maximum of 5 banners can be active at the same time.');
        return;
      }
      const response = await axios.put(`${BASE_URL}/api/banner/updatebanner/${id}`);
      
      if (response.data.success) {
        // Update local state to reflect only the clicked banner toggle
        setBanners(banners.map(banner => (
          banner.id === id ? { ...banner, isactive: !isActive } : banner
        )));
        
        toast.success('Banner status updated successfully');
      } else {
        console.error('Error response:', response.data);
        toast.error(response.data.message || 'Failed to update banner status');
      }
    } catch (error) {
      console.error('Error updating banner status:', error);
      toast.error(error.response?.data?.message || 'Failed to update banner status');
    } finally {
      setLoading(false);
    }
  };

  // Filter banners based on search term
  const filteredBanners = banners.filter(banner => 
    (banner.bannertitle ? banner.bannertitle.toLowerCase().includes(searchTerm.toLowerCase()) : false)
  );

  // Get banner type label with proper capitalization
  const getBannerTypeLabel = (type) => {
    switch(type) {
      case 'home':
        return 'Home Page';
      case 'category':
        return 'Category Page';
      case 'product':
        return 'Product Page';
      case 'promotion':
        return 'Promotion';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 sm:p-4 mt-12 sm:mt-0">
      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText="Yes, Delete"
        icon={Trash2}
        iconColor="text-red-500"
      />
      <div className="max-w-7xl mx-auto">
        <Toaster position="top-right" />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shadow-md">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Banner Management</h2>
              <p className="text-gray-500 mt-0.5 text-sm">View and manage promotional banners</p>
            </div>
          </div>
          <div className="px-3 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shadow-sm w-max">Admin</div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-800">
            <AlertTriangle size={18} />
            <div>
              <p className="font-medium text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
          {/* Search Bar */}
          <div className="relative flex-grow max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search banners..."
              className="pl-10 w-full px-3 py-2 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/70 backdrop-blur"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Banners List */}
        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-gray-500">Loading banners...</p>
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-gray-100 rounded-full p-3 inline-flex items-center justify-center mb-3">
                <ImageIcon size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg mb-1">No banners found</p>
              <p className="text-gray-400 text-sm mb-4">
                {searchTerm ? 'Try adjusting your search' : 'Add your first banner to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Banner
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBanners.map((banner) => (
                    <tr key={banner.id} className={`transition-colors ${banner.isactive ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-16 w-40 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                          {banner.bannerimageurl ? (
                            <img 
                              src={`${BASE_URL}/uploads/${banner.bannerimageurl}`} 
                              alt={banner.bannertitle || 'Banner'} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon size={24} className="text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {banner.bannertitle || 'Untitled Banner'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {banner.isactive ? (
                          <span className="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            <CheckCircle2 size={14} className="mr-1" />
                            Currently Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleActivateBanner(banner.id, banner.isactive)}
                            disabled={loading}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${banner.isactive ? 'bg-blue-600' : 'bg-gray-200'} cursor-pointer`}
                          >
                            <span 
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform ${banner.isactive ? 'translate-x-5' : 'translate-x-0.5'}`}
                            />
                          </button>
                          <span className="text-sm font-medium text-gray-700">
                            {banner.isactive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => handleDeleteBanner(banner.id)}
                            className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 ml-4"
                            disabled={loading}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewBanner;
