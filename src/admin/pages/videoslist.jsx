import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Video, 
  Eye, 
  EyeOff, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Play, 
  Clock, 
  Tag, 
  Calendar,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { BASE_URL, getImageUrl } from '../../util';

const VideosList = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchVideos();
    fetchCategories();
  }, [currentPage, searchTerm, selectedCategory, statusFilter]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(statusFilter && { isActive: statusFilter })
      });

      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/videos?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setVideos(response.data.data.videos);
        setTotalPages(response.data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/videos/categories`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleToggleStatus = async (videoId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`${BASE_URL}/api/videos/${videoId}/toggle-status`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        toast.success(`Video ${currentStatus ? 'deactivated' : 'activated'} successfully`);
        fetchVideos();
      }
    } catch (error) {
      console.error('Error toggling video status:', error);
      toast.error('Failed to update video status');
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${BASE_URL}/api/videos/${videoToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        toast.success('Video deleted successfully');
        fetchVideos();
        setShowDeleteModal(false);
        setVideoToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  const handleEditVideo = async (updatedData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${BASE_URL}/api/videos/${editingVideo.id}`, updatedData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        toast.success('Video updated successfully');
        fetchVideos();
        setShowEditModal(false);
        setEditingVideo(null);
        setEditForm(null);
      }
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error('Failed to update video');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const resolveVideoUrl = (video) => {
    return (
      video.videoUrl ||
      video.videourl ||
      video.url ||
      video.link ||
      video.video_link ||
      video.fileUrl ||
      video.fileurl ||
      video.path ||
      video.videoPath ||
      video.videopath ||
      ''
    );
  };

  const getVideoThumbnail = (video) => {
    let thumb =
      video.thumbnailUrl ||
      video.thumbnail ||
      video.thumbnailurl ||
      video.thumnailurl ||
      video.thumbUrl ||
      video.thumburl;

    if (thumb) {
      if (typeof thumb === 'object') {
        thumb = thumb.imageurl || thumb.url || thumb.imageUrl || '';
      }
      if (typeof thumb === 'string' && thumb.length > 0) {
        return getImageUrl(thumb);
      }
    }

    const rawUrl = resolveVideoUrl(video);
    if (rawUrl && (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be'))) {
      let videoId = '';
      if (rawUrl.includes('youtube.com/watch?v=')) {
        videoId = rawUrl.split('v=')[1].split('&')[0];
      } else if (rawUrl.includes('youtu.be/')) {
        videoId = rawUrl.split('youtu.be/')[1].split('?')[0];
      }
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    }

    if (rawUrl) {
      const lower = rawUrl.toLowerCase();
      const isVideo = ['.mp4', '.webm', '.mov', '.ogg', '.mkv', '.avi'].some(ext => lower.endsWith(ext));
      if (isVideo) return getImageUrl(rawUrl);
    }
    return null;
  };

  const openVideoInNewTab = (url) => {
    window.open(getImageUrl(url), '_blank');
  };

  const startEdit = (video) => {
    setEditingVideo(video);
    setEditForm({
      title: video.title || '',
      description: video.description || '',
      category: video.category || '',
      videoUrl: resolveVideoUrl(video) || '',
      thumbnailUrl: (video.thumbnailUrl || video.thumbnail || '') || '',
      price: video.price || '',
      mrp: video.mrp || '',
      isActive: !!video.isActive,
      tags: video.tags || ''
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const renderEditThumbnailPreview = () => {
    if (!editForm?.thumbnailUrl) return null;
    const url = getImageUrl(editForm.thumbnailUrl);
    const isVid = /\.(mp4|webm|mov|ogg|mkv|avi)(\?.*)?$/i.test(url || '');
    return isVid ? (
      <video src={url} autoPlay loop muted playsInline className="w-full h-40 object-cover rounded" />
    ) : (
      <img src={url} alt="Thumbnail" className="w-full h-40 object-cover rounded" />
    );
  };

  const renderEditVideoPreview = () => {
    if (!editForm?.videoUrl) return null;
    const url = getImageUrl(editForm.videoUrl);
    const isVid = /\.(mp4|webm|mov|ogg|mkv|avi)(\?.*)?$/i.test(url || '');
    return isVid ? (
      <video src={url} controls className="w-full h-40 object-cover rounded" />
    ) : null;
  };

  const filteredVideos = videos;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Video className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">Videos Management</h1>
              </div>
              <div className="text-sm text-gray-500">
                Total: {videos.length} videos
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category, index) => (
                  <option key={index} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setStatusFilter('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or add some videos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <div key={video.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Video Thumbnail */}
                <div className="relative h-48 bg-gray-200">
                  {(() => {
                    const thumbUrl = getVideoThumbnail(video);
                    const isVideo = typeof thumbUrl === 'string' && /\.(mp4|webm|mov|ogg|mkv|avi)(\?.*)?$/i.test(thumbUrl);
                    if (thumbUrl) {
                      return isVideo ? (
                        <video src={thumbUrl} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                      ) : (
                        <img src={thumbUrl} alt={video.title} className="w-full h-full object-cover" />
                      );
                    }
                    return (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-16 w-16 text-gray-400" />
                    </div>
                    );
                  })()}
                  
                  {/* Play Button Overlay */
                  }
                  <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openVideoInNewTab(resolveVideoUrl(video))}
                      className="bg-white bg-opacity-90 rounded-full p-3 hover:bg-opacity-100 transition-all"
                    >
                      <Play className="h-6 w-6 text-gray-800" />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      video.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {video.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Duration Badge */}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2">
                      <span className="bg-black bg-opacity-75 text-white px-2 py-1 text-xs rounded">
                        {formatDuration(video.duration)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                      {video.title}
                    </h3>
                    <div className="relative ml-2">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {video.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {video.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center">
                      <Tag className="h-3 w-3 mr-1" />
                      {video.category}
                    </div>
                    <div className="flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      {video.viewCount || 0} views
                    </div>
                  </div>

                  {(video.price || video.mrp) && (
                    <div className="flex items-center justify-between text-sm mb-3">
                      <div className="flex items-center space-x-3">
                        {video.price && (
                          <span className="text-green-600 font-semibold">
                            ₹{parseFloat(video.price).toFixed(2)}
                          </span>
                        )}
                        {video.mrp && (
                          <span className="text-gray-500 line-through text-xs">
                            MRP: ₹{parseFloat(video.mrp).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {video.price && video.mrp && parseFloat(video.mrp) > parseFloat(video.price) && (
                        <span className="text-red-600 text-xs font-medium">
                          {Math.round(((parseFloat(video.mrp) - parseFloat(video.price)) / parseFloat(video.mrp)) * 100)}% OFF
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(video.createdAt)}
                    </div>
                    {video.tags && (
                      <div className="text-right">
                        {video.tags.split(',').slice(0, 2).map((tag, index) => (
                          <span key={index} className="inline-block bg-gray-100 text-gray-600 px-2 py-1 text-xs rounded mr-1">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openVideoInNewTab(resolveVideoUrl(video))}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View Video"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => startEdit(video)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Edit Video"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(video.id, video.isActive)}
                        className={`p-2 rounded-md transition-colors ${
                          video.isActive 
                            ? 'text-orange-600 hover:bg-orange-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={video.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {video.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setVideoToDelete(video);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Video"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === index + 1
                      ? 'text-white bg-blue-600 border border-blue-600'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Video</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete "{videoToDelete?.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setVideoToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVideo}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Video</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => { setShowEditModal(false); setEditingVideo(null); setEditForm(null); }}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  name="category"
                  value={editForm.category}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2 h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL or Path</label>
                <input
                  type="text"
                  name="videoUrl"
                  value={editForm.videoUrl}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://... or /uploads/videos/..."
                />
                <div className="mt-2">{renderEditVideoPreview()}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
                <input
                  type="text"
                  name="thumbnailUrl"
                  value={editForm.thumbnailUrl}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://... or /uploads/..."
                />
                <div className="mt-2">{renderEditThumbnailPreview()}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={editForm.price}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
                <input
                  type="number"
                  step="0.01"
                  name="mrp"
                  value={editForm.mrp}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  name="tags"
                  value={editForm.tags}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="isActive"
                  type="checkbox"
                  name="isActive"
                  checked={!!editForm.isActive}
                  onChange={handleEditChange}
                />
                <label htmlFor="isActive" className="text-sm">Active</label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => { setShowEditModal(false); setEditingVideo(null); setEditForm(null); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={() => handleEditVideo(editForm)}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideosList;