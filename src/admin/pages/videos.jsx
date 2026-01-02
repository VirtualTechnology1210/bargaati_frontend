import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Video, Eye, EyeOff, Save, X, Plus, Link, Clock, Tag, FileText, Image } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { BASE_URL, getImageUrl } from '../../util';

const Videos = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    duration: '',
    category: 'general',
    tags: '',
    isActive: true,
    orderNumber: 0,
    productId: '',
    price: '',
    mrp: '',
    gst: '',
    availableSizes: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadMethod, setUploadMethod] = useState('url'); // 'url' or 'file'
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isThumbnailVideo, setIsThumbnailVideo] = useState(false);

  const predefinedCategories = [
    'general',
    'product-demo',
    'tutorial',
    'promotional',
    'testimonial',
    'behind-the-scenes',
    'how-to',
    'unboxing',
    'review',
  ];

  // Helper function to get product name safely
  const getProductName = (product) => {
    if (!product) return '';
    return product.productName || product.productname || product.name || '';
  };

  // Helper function for product selection
  const handleProductSelect = (product) => {
    try {
      if (!product) {
        setFormData(prev => ({
          ...prev,
          productId: '',
          price: '',
          mrp: '',
          gst: '',
          availableSizes: []
        }));
        setSearchTerm('');
        return;
      }

      const productId = product.id || product.productId;
      if (!productId) {
        toast.error('Invalid product selected');
        return;
      }

      // Get available sizes from product
      const availableSizes = Array.isArray(product.availableSizes) 
        ? product.availableSizes 
        : (product.sizes || '').split(',').map(s => s.trim()).filter(Boolean);

      // Log the selected product
      console.log('Selected product:', {
        id: productId,
        price: product.price,
        mrp: product.mrp,
        gst: product.gst,
        availableSizes
      });

      setFormData(prev => ({
        ...prev,
        productId: productId.toString(),
        price: product.price || '0',
        mrp: product.mrp || '0',
        gst: product.gst || '0',
        availableSizes
      }));
      setSearchTerm(getProductName(product));
      toast.success('Product linked successfully');
      setFilteredProducts([]); // Hide dropdown after selection
    } catch (error) {
      console.error('Error selecting product:', error);
      toast.error('Failed to select product');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchAllProducts();
  }, []);

  // When productId changes, fetch and preview the linked product
  useEffect(() => {
    const loadLinkedProduct = async () => {
      try {
        if (!formData.productId) {
          setSelectedProduct(null);
          return;
        }
        const res = await axios.get(`${BASE_URL}/api/products/${formData.productId}`);
        if (res.data && res.data.success && res.data.product) {
          setSelectedProduct(res.data.product);
        } else {
          setSelectedProduct(null);
        }
      } catch (e) {
        console.warn('Failed to fetch linked product', e);
        setSelectedProduct(null);
      }
    };
    loadLinkedProduct();
  }, [formData.productId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = allProducts.filter(p => {
        const productName = getProductName(p);
        return productName.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredProducts(filtered);

      // If there's only one exact match, auto-select it
      const exactMatch = filtered.find(p =>
        getProductName(p).toLowerCase() === searchTerm.toLowerCase()
      );
      if (exactMatch) {
        handleProductSelect(exactMatch);
      }
    } else {
      setFilteredProducts([]);
    }
  }, [searchTerm, allProducts]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/videos/categories`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setCategories([...predefinedCategories, ...response.data.data]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(predefinedCategories);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/products`);
      if (response.data && Array.isArray(response.data)) {
        // Transform the data to ensure proper image URLs (handles multiple shapes)
        const productsWithImages = response.data.map(product => {
          // Normalize images into an array of objects with imageurl
          let images = [];
          if (Array.isArray(product.images) && product.images.length > 0) {
            images = product.images.map(img => {
              // img can be string or object with various keys
              const raw = typeof img === 'string' ? img : (img.imageurl || img.imageUrl || img.url || img.path || '');
              return { ...img, imageurl: getImageUrl(raw) };
            });
          } else if (product.imageUrl || product.imageurl || product.image) {
            const raw = product.imageUrl || product.imageurl || product.image;
            images = [{ imageurl: getImageUrl(raw) }];
          } else if (typeof product.images === 'string') {
            images = [{ imageurl: getImageUrl(product.images) }];
          }

          return { ...product, images };
        });
        setAllProducts(productsWithImages);
      } else {
        console.error("Invalid response format for products:", response.data);
        toast.error('Failed to load products: Invalid data format.');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products.');
    }
  };

  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleVideoUrlChange = e => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, videoUrl: url }));

    if (url && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.endsWith('.mp4') || url.endsWith('.webm'))) {
      setVideoPreview(url);
    } else {
      setVideoPreview(null);
    }

    // Auto-derive a thumbnail for YouTube links if none is set
    try {
      if ((url.includes('youtube.com') || url.includes('youtu.be')) && !formData.thumbnailUrl) {
        let videoId = '';
        if (url.includes('youtube.com/watch?v=')) {
          videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1].split('?')[0];
        }
        if (videoId) {
          const ytThumb = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
          setFormData(prev => ({ ...prev, thumbnailUrl: ytThumb }));
        }
      }
    } catch {}
  };

  const handleVideoFileChange = e => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid video file (MP4, WebM, OGG, AVI, MOV)');
        return;
      }

      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        setError('Video file size must be less than 100MB');
        return;
      }

      setVideoFile(file);
      setError(null);

      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setFormData(prev => ({ ...prev, duration: Math.round(video.duration) }));
        URL.revokeObjectURL(video.src);
      };
      video.src = previewUrl;
    }
  };

  const handleThumbnailFileChange = e => {
    const file = e.target.files[0];
    if (file) {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
      const allowedImageExtensions = ['.jpeg', '.jpg', '.png', '.webp', '.gif'];
      const allowedVideoExtensions = ['.mp4', '.webm', '.mov', '.ogg', '.avi'];

      const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`;
      const isVideo = allowedVideoTypes.includes(file.type) || allowedVideoExtensions.includes(fileExtension);
      const isImage = allowedImageTypes.includes(file.type) || allowedImageExtensions.includes(fileExtension);

      if (!isImage && !isVideo) {
        setError('Please select a valid image (JPEG, PNG, GIF) or video (MP4, WebM, MOV) file.');
        return;
      }

      const maxSize = 15 * 1024 * 1024; // 15MB
      if (file.size > maxSize) {
        setError(`File size must be less than 15MB. Your file is ${Math.round(file.size / 1024 / 1024)}MB.`);
        return;
      }

      setThumbnailFile(file);
      setError(null);
      setIsThumbnailVideo(isVideo);

      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, thumbnailUrl: previewUrl }));
    }
  };

  const handleCategoryChange = e => {
    const value = e.target.value;
    if (value === 'custom') {
      setShowCustomCategory(true);
      setFormData(prev => ({ ...prev, category: '' }));
    } else {
      setShowCustomCategory(false);
      setFormData(prev => ({ ...prev, category: value }));
    }
  };

  const handleCustomCategoryChange = e => {
    const value = e.target.value;
    setCustomCategory(value);
    setFormData(prev => ({ ...prev, category: value }));
  };

  const handleSearchChange = e => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.trim() === '') {
      setFormData(prev => ({ ...prev, productId: '' }));
    }
  };

  const handleUnlinkProduct = () => {
    setSelectedProduct(null);
    setFormData(prev => ({
      ...prev,
      productId: '',
      price: '',
      mrp: '',
      availableSizes: []
    }));
    setSearchTerm('');
    toast('Product link removed', { icon: '🗑️' });
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Video title is required');
      return false;
    }

    if (uploadMethod === 'url') {
      if (!formData.videoUrl.trim()) {
        setError('Video URL is required');
        return false;
      }
    } else {
      if (!videoFile) {
        setError('Please select a video file');
        return false;
      }
    }

    if (!formData.category.trim()) {
      setError('Category is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUploadProgress(0);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      let response;

      if (uploadMethod === 'file' && (videoFile || thumbnailFile)) {
        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title.trim());
        formDataToSend.append('description', formData.description.trim());
        formDataToSend.append('duration', formData.duration || '');
        formDataToSend.append('category', formData.category);
        formDataToSend.append('tags', formData.tags);
        formDataToSend.append('isActive', formData.isActive);
        formDataToSend.append('orderNumber', formData.orderNumber || 0);

        // Handle product data
        if (formData.productId && formData.productId.trim()) {
          console.log('Adding product data:', {
            productId: formData.productId,
            price: formData.price,
            mrp: formData.mrp,
            gst: formData.gst,
            availableSizes: formData.availableSizes
          });
          formDataToSend.append('productId', formData.productId.trim());
          formDataToSend.append('price', formData.price || '0');
          formDataToSend.append('mrp', formData.mrp || '0');
          formDataToSend.append('gst', formData.gst || '0');
          if (formData.availableSizes && formData.availableSizes.length > 0) {
            formDataToSend.append('availableSizes', JSON.stringify(formData.availableSizes));
          }
        }

        if (videoFile) {
          formDataToSend.append('videoFile', videoFile);
        }
        if (thumbnailFile) {
          formDataToSend.append('thumbnailFile', thumbnailFile);
        }

        const token = localStorage.getItem('token');
        response = await axios.post(`${BASE_URL}/api/videos/upload`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: progressEvent => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        });
      } else {
        const submitData = {
          ...formData,
          duration: formData.duration ? parseInt(formData.duration) : null,
          orderNumber: formData.orderNumber ? parseInt(formData.orderNumber) : 0,
          tags: formData.tags.trim(),
          // Only include product-related fields if productId exists
          ...(formData.productId && formData.productId.trim() !== '' ? {
            productId: formData.productId,
            price: formData.price || '0',
            mrp: formData.mrp || '0',
            gst: formData.gst || '0',
            ...(formData.availableSizes && formData.availableSizes.length > 0 && { 
              availableSizes: formData.availableSizes 
            })
          } : {})
        };

        const token = localStorage.getItem('token');
        response = await axios.post(`${BASE_URL}/api/videos`, submitData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }

      if (response.data.success) {
        toast.success('Video added successfully!');
        resetForm();
        fetchCategories();
      } else {
        setError(response.data.message || 'Failed to add video');
      }
    } catch (error) {
      console.error('Error adding video:', error);
      setError(error.response?.data?.message || 'Failed to add video');
      toast.error('Failed to add video');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      videoUrl: '',
      thumbnailUrl: '',
      duration: '',
      category: 'general',
      tags: '',
      isActive: true,
      orderNumber: 0,
      productId: '',
      price: '',
      mrp: '',
      gst: '',
      availableSizes: []
    });
    setVideoPreview(null);
    setCustomCategory('');
    setShowCustomCategory(false);
    setVideoFile(null);
    setThumbnailFile(null);
    setUploadProgress(0);
    setError(null);
    setSearchTerm('');

    const videoInput = document.getElementById('videoFile');
    const thumbnailInput = document.getElementById('thumbnailFile');
    if (videoInput) videoInput.value = '';
    if (thumbnailInput) thumbnailInput.value = '';
  };

  const getYouTubeEmbedUrl = url => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster position="top-right" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center">
              <Video className="h-8 w-8 text-white mr-3" />
              <h1 className="text-2xl font-bold text-white">Add New Video</h1>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <X className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Video Title */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FileText className="h-4 w-4 mr-2" />
                    Video Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter video title"
                    required
                  />
                </div>

                {/* Product Selection */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Tag className="h-4 w-4 mr-2" />
                    Link Product (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search for a product..."
                    />
                    {selectedProduct && (
                      <div className="mt-3 p-3 border rounded-md bg-gray-50 flex items-start gap-3">
                        <img
                          src={(() => {
                            const p = selectedProduct;
                            if (Array.isArray(p.images) && p.images[0]) {
                              const img = p.images[0];
                              const raw = typeof img === 'string' ? img : (img.imageurl || img.imageUrl || img.url || img.path || '');
                              return getImageUrl(raw) || 'https://via.placeholder.com/64';
                            }
                            const raw = p.imageUrl || p.imageurl || p.image;
                            return raw ? getImageUrl(raw) : 'https://via.placeholder.com/64';
                          })()}
                          alt={getProductName(selectedProduct)}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/64'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-800 truncate">{getProductName(selectedProduct)}</p>
                            <button type="button" onClick={handleUnlinkProduct} className="text-xs text-red-600 hover:underline">Remove</button>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-blue-600 font-bold">₹{parseFloat(selectedProduct.price || 0).toFixed(2)}</span>
                            {selectedProduct.mrp && parseFloat(selectedProduct.mrp) > parseFloat(selectedProduct.price) && (
                              <span className="text-gray-500 line-through text-xs">₹{parseFloat(selectedProduct.mrp).toFixed(2)}</span>
                            )}
                          </div>
                          {Array.isArray(selectedProduct.availableSizes) && selectedProduct.availableSizes.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">Sizes: {selectedProduct.availableSizes.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {filteredProducts.length > 0 && (
                      <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-80 overflow-y-auto shadow-lg">
                        {filteredProducts.map(product => {
                          const price = parseFloat(product.price || 0);
                          const mrp = parseFloat(product.mrp || 0);
                          const discount = mrp && price < mrp
                            ? Math.round(((mrp - price) / mrp) * 100)
                            : 0;

                          return (
                            <li
                              key={product.id}
                              onClick={() => handleProductSelect(product)}
                              className="flex items-center p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 transition-colors"
                            >
                              <img
                                src={(() => {
                                  if (product.images && product.images.length > 0) {
                                    const img = product.images[0];
                                    const raw = typeof img === 'string' ? img : (img.imageurl || img.imageUrl || img.url || img.path || '');
                                    return getImageUrl(raw) || 'https://via.placeholder.com/80';
                                  }
                                  return 'https://via.placeholder.com/80';
                                })()}
                                alt={getProductName(product)}
                                className="w-16 h-16 object-cover rounded-md mr-4"
                                onError={(e) => {
                                  console.error('Image failed to load:', e.target.src);
                                  e.target.src = 'https://via.placeholder.com/80';
                                }}
                              />
                              <div className="flex-grow">
                                <p className="font-semibold text-gray-800">{getProductName(product)}</p>
                                <div className="flex items-center text-sm mt-1">
                                  <p className="text-blue-600 font-bold">
                                    ₹{parseFloat(product.price || 0).toFixed(2)}
                                  </p>
                                  {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                                    <p className="text-gray-500 line-through ml-2">
                                      ₹{parseFloat(product.mrp).toFixed(2)}
                                    </p>
                                  )}
                                  {discount > 0 && (
                                    <p className="text-green-600 font-semibold ml-3 bg-green-100 px-2 py-0.5 rounded-full text-xs">
                                      {discount}% OFF
                                    </p>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{product.categoryName} &gt; {product.subcategoryName}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Upload Method Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">
                    Video Source *
                  </label>
                  <div className="flex space-x-4 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="uploadMethod"
                        value="url"
                        checked={uploadMethod === 'url'}
                        onChange={(e) => setUploadMethod(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Video URL</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="uploadMethod"
                        value="file"
                        checked={uploadMethod === 'file'}
                        onChange={(e) => setUploadMethod(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Upload File</span>
                    </label>
                  </div>
                </div>

                {/* Video URL Input */}
                {uploadMethod === 'url' && (
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <Link className="h-4 w-4 mr-2" />
                      Video URL *
                    </label>
                    <input
                      type="url"
                      name="videoUrl"
                      value={formData.videoUrl}
                      onChange={handleVideoUrlChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://www.youtube.com/watch?v=... or direct video URL"
                      required
                    />
                  </div>
                )}

                {/* Video File Upload */}
                {uploadMethod === 'file' && (
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <Upload className="h-4 w-4 mr-2" />
                      Video File * (Max 100MB)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                      <div className="space-y-1 text-center">
                        <Video className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="videoFile"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                          >
                            <span>Upload a video</span>
                            <input
                              id="videoFile"
                              name="videoFile"
                              type="file"
                              accept="video/*"
                              onChange={handleVideoFileChange}
                              className="sr-only"
                              required
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">MP4, WebM, OGG, AVI, MOV up to 100MB</p>
                        {videoFile && (
                          <p className="text-sm text-green-600 font-medium">
                            Selected: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Thumbnail */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Image className="h-4 w-4 mr-2" />
                    Thumbnail
                  </label>

                  {uploadMethod === 'url' && (
                    <>
                      <input
                        type="url"
                        name="thumbnailUrl"
                        value={formData.thumbnailUrl}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/thumbnail.jpg or /uploads/videos/thumbnail.jpg"
                      />
                      {formData.thumbnailUrl && (
                        <div className="mt-3 relative w-full h-48 bg-gray-100 rounded-md overflow-hidden border">
                          {(() => {
                            const url = getImageUrl(formData.thumbnailUrl);
                            const isVideo = /\.(mp4|webm|mov|ogg|mkv|avi)(\?.*)?$/i.test(url || '');
                            return isVideo ? (
                              <video src={url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            ) : (
                              <img src={url} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                            );
                          })()}
                        </div>
                      )}
                    </>
                  )}

                  {uploadMethod === 'file' && (
                    <>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                        <div className="space-y-1 text-center">
                          <Image className="mx-auto h-8 w-8 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="thumbnailFile"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Upload a file</span>
                              <input
                                id="thumbnailFile"
                                name="thumbnailFile"
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleThumbnailFileChange}
                                className="sr-only"
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">Image or Video up to 15MB</p>
                          {thumbnailFile && (
                            <p className="text-sm text-green-600 font-medium">
                              Selected: {thumbnailFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Thumbnail Preview */}
                      {formData.thumbnailUrl && (
                        <div className="mt-4 relative w-full h-48 bg-gray-100 rounded-md overflow-hidden border">
                          {isThumbnailVideo ? (
                            <video
                              src={formData.thumbnailUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={formData.thumbnailUrl}
                              alt="Thumbnail Preview"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 mr-2" />
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="120"
                    min="0"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Tag className="h-4 w-4 mr-2" />
                    Category *
                  </label>
                  <select
                    name="category"
                    value={showCustomCategory ? 'custom' : formData.category}
                    onChange={handleCategoryChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {categories.map((cat, index) => (
                      <option key={index} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                      </option>
                    ))}
                    <option value="custom">+ Add Custom Category</option>
                  </select>

                  {showCustomCategory && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={handleCustomCategoryChange}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter custom category"
                      required
                    />
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Tag className="h-4 w-4 mr-2" />
                    Tags
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="tag1, tag2, tag3"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                </div>

                {/* Price */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter price"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* MRP */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    name="mrp"
                    value={formData.mrp}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter MRP"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* GST */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    GST (%)
                  </label>
                  <input
                    type="number"
                    name="gst"
                    value={formData.gst}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter GST percentage"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Available Sizes */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Available Sizes
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                    {formData.availableSizes && formData.availableSizes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.availableSizes.map((size, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {size}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No sizes available for this product</p>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Sizes are automatically synced from the linked product
                  </p>
                </div>

                {/* Order Number */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="orderNumber"
                    value={formData.orderNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 flex items-center text-sm font-medium text-gray-700">
                    {formData.isActive ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                    Active (visible to users)
                  </label>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter video description..."
                  />
                </div>

                {/* Upload Progress */}
                {loading && uploadMethod === 'file' && uploadProgress > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Upload Progress
                    </label>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Image (PNG, GIF) or Video (MP4, WebM) up to 15MB.</p>
                  </div>
                )}

                {/* Video Preview */}
                {videoPreview && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Video Preview
                    </label>
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                      {videoPreview.includes('youtube.com') || videoPreview.includes('youtu.be') ? (
                        <iframe
                          src={getYouTubeEmbedUrl(videoPreview)}
                          className="w-full h-48"
                          frameBorder="0"
                          allowFullScreen
                          title="Video Preview"
                        />
                      ) : videoPreview.includes('vimeo.com') ? (
                        <iframe
                          src={videoPreview.replace('vimeo.com/', 'player.vimeo.com/video/')}
                          className="w-full h-48"
                          frameBorder="0"
                          allowFullScreen
                          title="Video Preview"
                        />
                      ) : (
                        <video
                          src={videoPreview}
                          className="w-full h-48"
                          controls
                          title="Video Preview"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Thumbnail Preview */}
                {formData.thumbnailUrl && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Thumbnail Preview
                    </label>
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                      <img
                        src={formData.thumbnailUrl}
                        alt="Thumbnail Preview"
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2 inline" />
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2 inline" />
                    Add Video
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Videos;