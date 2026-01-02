import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Check, AlertTriangle } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { BASE_URL } from '../../util';

const AddBanner = () => {
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImage, setBannerImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!bannerImage) {
      setError('Please select an image for the banner');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('bannerTitle', bannerTitle);
      formData.append('image', bannerImage);

      const response = await axios.post(`${BASE_URL}/api/banner/createbanner`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Banner added successfully!');
        // Reset form
        setBannerTitle('');
        setBannerImage(null);
        setImagePreview(null);
      } else {
        setError(response.data.message || 'Failed to add banner');
      }
    } catch (error) {
      console.error('Error adding banner:', error);
      setError('Error adding banner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 sm:p-4 mt-12 sm:mt-0">
    {/* <div className="w-100 min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 sm:p-4 mt-12 sm:mt-0"> */}
      <div className="max-w-5xl mx-auto">
        <Toaster position="top-right" />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-5 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 sm:p-2 rounded-lg shadow-md">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Add Banner
              </h2>
              <p className="text-gray-500 mt-0.5 text-xs sm:text-sm">Upload new promotional banners</p>
            </div>
          </div>
          <div className="px-3 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shadow-sm w-max">
            Admin
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-2.5 sm:p-3 flex items-center gap-2 text-red-800">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <div>
              <p className="font-medium text-xs sm:text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Banner Form */}
        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="bannerTitle" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Banner Title
              </label>
              <input
                id="bannerTitle"
                type="text"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/70 backdrop-blur text-sm"
                placeholder="Enter banner title"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="bannerImage" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Banner Image
              </label>
              
              <div className="flex flex-col">
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center mb-3 cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => document.getElementById('bannerImage').click()}
                >
                  <input
                    type="file"
                    id="bannerImage"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {!imagePreview ? (
                    <div className="py-4 sm:py-6">
                      <Upload className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
                      <p className="text-xs sm:text-sm text-gray-500">Click to upload or drag and drop</p>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Banner preview" 
                        className="max-h-48 sm:max-h-64 mx-auto rounded-md object-contain"
                      />
                      <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                        <Check size={14} className="sm:w-4 sm:h-4" />
                      </div>
                    </div>
                  )}
                </div>
                
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setBannerImage(null);
                      setImagePreview(null);
                    }}
                    className="self-end text-xs sm:text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 
                text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md 
                transition-all duration-200 flex items-center justify-center gap-2
                ${loading ? 'opacity-75 cursor-not-allowed' : 'hover:translate-y-[-1px]'}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Upload size={16} className="sm:w-4 sm:h-4" />
                  <span>Add Banner</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddBanner;
