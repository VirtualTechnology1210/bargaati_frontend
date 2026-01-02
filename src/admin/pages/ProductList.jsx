import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Search, Plus, ChevronLeft, ChevronRight, Eye, X, RefreshCw, Upload, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminVerifyModal from '../AdminVerifyModal';
import SmartPagination from '../../components/SmartPagination';
import axios from 'axios';
import { BASE_URL } from '../../util';

const ProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAdminVerify, setShowAdminVerify] = useState(false);
  const [adminVerifying, setAdminVerifying] = useState(false);
  const [adminVerifyError, setAdminVerifyError] = useState("");
  const [productToDelete, setProductToDelete] = useState(null);
  const [categories, setCategories] = useState(['all']);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [productSpecifications, setProductSpecifications] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [imageActionLoading, setImageActionLoading] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [imageToUpdate, setImageToUpdate] = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);
  const [imageActionError, setImageActionError] = useState("");
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [editingSizes, setEditingSizes] = useState(false);
  const [tempSizes, setTempSizes] = useState("");
  // Live stock map for current page products
  const [stockMap, setStockMap] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const itemsPerPage = 10;
  const user = JSON.parse(localStorage.getItem('user'));

  // Fetch categories and subcategories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetch main categories
        const mainCatResponse = await axios.get(`${BASE_URL}/api/categories`);
        if (mainCatResponse.data && mainCatResponse.data.mainCategories) {
          setMainCategories(mainCatResponse.data.mainCategories);
        }

        // Fetch subcategories
        const subCatResponse = await axios.get(`${BASE_URL}/api/subcategories`);
        if (subCatResponse.data && subCatResponse.data.subcategories) {
          setSubCategories(subCatResponse.data.subcategories);
        }

        setCategoriesLoaded(true);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Helper function to get category name by id
  const getCategoryName = (categoryId) => {
    // First check if the product has categoryName directly
    if (selectedProduct && selectedProduct.categoryName) {
      return selectedProduct.categoryName;
    }

    // Otherwise look up from the fetched categories
    const category = mainCategories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  // Helper function to get subcategory name by id
  const getSubCategoryName = (subCategoryId) => {
    // First check if the product has subcategoryName directly
    if (selectedProduct && selectedProduct.subcategoryName) {
      return selectedProduct.subcategoryName;
    }

    // Otherwise look up from the fetched subcategories
    const subCategory = subCategories.find(sub => sub.id === subCategoryId);
    return subCategory ? subCategory.name : 'Uncategorized';
  };

  // Get subcategory name for table display
  const getSubcategoryDisplay = (product) => {
    // First try to use the subcategoryName if available from API
    if (product.subcategoryName) {
      return product.subcategoryName;
    }

    // Next try to get the name by ID
    const subCategoryId = product.subcategory || product.subCategory;
    if (subCategoryId && categoriesLoaded) {
      const subCategory = subCategories.find(sub => sub.id === parseInt(subCategoryId));
      if (subCategory) return subCategory.name;
    }

    // Fall back to whatever value is in the product
    return product.subCategory || product.subcategory || 'No Subcategory';
  };

  // Restore page state from localStorage on component mount
  useEffect(() => {
    const savedPage = localStorage.getItem('productListCurrentPage');
    const savedSearchTerm = localStorage.getItem('productListSearchTerm');
    const savedCategory = localStorage.getItem('productListSelectedCategory');

    if (savedPage) {
      setCurrentPage(parseInt(savedPage, 10));
      localStorage.removeItem('productListCurrentPage');
    }
    if (savedSearchTerm) {
      setSearchTerm(savedSearchTerm);
      localStorage.removeItem('productListSearchTerm');
    }
    if (savedCategory) {
      setSelectedCategory(savedCategory);
      localStorage.removeItem('productListSelectedCategory');
    }
  }, []);

  // Fetch products from the API
  const fetchProducts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);
    try {
      const response = await axios.get(`${BASE_URL}/api/products`);

      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data);

        // Extract unique categories
        const uniqueCategories = ['all', ...new Set(response.data.map(product =>
          product.category || 'Uncategorized'
        ))];
        setCategories(uniqueCategories);
      } else {
        console.error("Invalid response format:", response.data);
        setErrorMessage("Error loading products: Invalid data format");
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setErrorMessage("Error loading products. Please try again.");
      setProducts([]);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Refresh function
  const handleRefresh = async () => {
    await fetchProducts(true);
  };

  // Auto-refresh products every 5 seconds
  useEffect(() => {
    let timer;
    let cancelled = false;

    const autoRefresh = async () => {
      try {
        // Only auto-refresh if not currently loading or refreshing manually
        if (!loading && !refreshing) {
          await fetchProducts(true);
        }
      } catch (error) {
        console.error('Auto-refresh error:', error);
      }
    };


    // Start auto-refresh timer
    timer = setInterval(autoRefresh, 5000); // 5 seconds

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [loading, refreshing]); // Dependencies to prevent conflicts
  // Delete product handler
  const handleDelete = (productId) => {
    setProductToDelete(productId);
    setShowAdminVerify(true);
    setAdminVerifyError("");
  };

  const handleAdminVerify = async (password) => {
    setAdminVerifying(true);
    setAdminVerifyError("");
    try {
      // Use the same login API as the login page
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: user?.email,
        password
      });

      if (response.data && response.data.user && response.data.user.role === 'admin') {
        try {
          // Call the delete product API
          await axios.delete(`${BASE_URL}/api/products/${productToDelete}`);

          // Update the products list
          setProducts(products.filter(product => product.id !== productToDelete));
          setShowAdminVerify(false);
          setProductToDelete(null);
        } catch (deleteError) {
          console.error("Error deleting product:", deleteError);
          setAdminVerifyError("Error deleting product. Please try again.");
        }
      } else {
        setAdminVerifyError('Invalid admin credentials.');
      }
    } catch (err) {
      setAdminVerifyError(
        err.response?.data?.message || 'Invalid admin credentials or server error.'
      );
    } finally {
      setAdminVerifying(false);
    }
  };

  const handleAdminCancel = () => {
    setShowAdminVerify(false);
    setProductToDelete(null);
    setAdminVerifyError("");
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Format price
  const formatPrice = (price) => {
    if (price === undefined || price === null) return '₹0.00';
    return `₹${Number(price).toFixed(2)}`;
  };

  // Calculate price with GST
  const calculatePriceWithGST = (product) => {
    const price = Number(product.price);
    const gstPercentage = Number(product.gst) || 0;
    const gstType = product.gst_type || 'exclusive';

    if (gstType === 'inclusive') {
      // For inclusive GST, the given price already includes GST
      const basePrice = (price * 100) / (100 + gstPercentage);
      const gstAmount = price - basePrice;
      return {
        basePrice: basePrice,
        gstAmount: gstAmount,
        totalPrice: price,
        gstPercentage: gstPercentage
      };
    } else {
      // For exclusive GST, calculate GST on top of the price
      const gstAmount = (price * gstPercentage) / 100;
      const totalPrice = price + gstAmount;
      return {
        basePrice: price,
        gstAmount: gstAmount,
        totalPrice: totalPrice,
        gstPercentage: gstPercentage
      };
    }
  };

  // Format GST details
  const formatGSTDetails = (product) => {
    const priceDetails = calculatePriceWithGST(product);
    return {
      basePrice: formatPrice(priceDetails.basePrice),
      gstAmount: formatPrice(priceDetails.gstAmount),
      totalPrice: formatPrice(priceDetails.totalPrice),
      gstPercentage: priceDetails.gstPercentage.toFixed(2) + '%',
      gstType: product.gst_type || 'exclusive'
    };
  };

  // Filter products based on search term and category
  const filteredProducts = products.filter(product => {
    const productName = product.productName || product.name || '';
    const productBrand = product.brand || '';
    const productSubCategory = product.subCategory || product.subcategory || '';
    const priceInfo = calculatePriceWithGST(product);

    const matchesSearchTerm =
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productBrand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof productSubCategory === 'string' &&
        productSubCategory.toLowerCase().includes(searchTerm.toLowerCase())) ||
      priceInfo.totalPrice.toString().includes(searchTerm) ||
      priceInfo.basePrice.toString().includes(searchTerm) ||
      (product.gst || '').toString().includes(searchTerm);


    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearchTerm && matchesCategory;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Poll lightweight stock for products on the current page
  useEffect(() => {
    const ids = currentProducts.map(p => p.id).filter(Boolean);
    if (ids.length === 0) { setStockMap({}); return; }

    let timer;
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await axios.post(`${BASE_URL}/api/products/stock/bulk`, { ids }, { timeout: 8000 });
        if (!data?.success || cancelled) return;
        const map = {};
        for (const s of (data.stocks || [])) map[s.id] = s;
        setStockMap(map);
      } catch (error) {
        console.error('Stock polling error:', error);
      }
    };

    // Only start polling if we have products
    if (ids.length > 0) {
      load();
      timer = setInterval(load, 5000);
    }

    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [currentProducts]);

  // Get product name (handling different field names)
  const getProductName = (product) => {
    return product.productName ||
      product.productname ||
      product.name ||
      'Unnamed Product';
  };

  // View product details handler
  const handleViewDetails = async (product) => {
    // Calculate GST details before showing
    const gstDetails = formatGSTDetails(product);
    const enrichedProduct = {
      ...product,
      gstDetails
    };

    setSelectedProduct(enrichedProduct);
    setShowProductDetail(true);
    setDetailsLoading(true);
    setProductImages([]);
    setProductSpecifications([]);
    setEditingSizes(false);
    setTempSizes(product.size || '');

    try {
      // Fetch product images
      console.log("Fetching images for product ID:", product.id);
      const imagesResponse = await axios.get(`${BASE_URL}/api/products/${product.id}/images`);
      console.log("Images response:", imagesResponse.data);

      if (imagesResponse.data && Array.isArray(imagesResponse.data)) {
        // Process images to ensure proper URLs
        const processedImages = imagesResponse.data.map(image => {
          // Make sure we have proper fields
          let imageObj = { ...image };

          // Handle imageUrl field name variations
          if (!imageObj.imageUrl && imageObj.imageurl) {
            imageObj.imageUrl = imageObj.imageurl;
          }
          if (!imageObj.url && imageObj.imageUrl) {
            imageObj.url = imageObj.imageUrl;
          }
          if (!imageObj.imageurl && imageObj.imageUrl) {
            imageObj.imageurl = imageObj.imageUrl;
          }

          // Handle orderNumber field name variations
          if (!imageObj.orderNumber && imageObj.ordernumber) {
            imageObj.orderNumber = imageObj.ordernumber;
          }

          return imageObj;
        });

        setProductImages(processedImages);
      } else {
        setProductImages([]);
      }

      // Fetch product specifications
      try {
        console.log("Fetching specifications for product ID:", product.id);
        const specificationsResponse = await axios.get(`${BASE_URL}/api/products/${product.id}/specifications`);
        console.log("Specifications response:", specificationsResponse.data);

        if (specificationsResponse.data && Array.isArray(specificationsResponse.data)) {
          const processedSpecs = specificationsResponse.data.map(spec => {
            // Start with a copy of the original spec
            let processedSpec = { ...spec };

            // Handle speckeyid field name variations
            if (!processedSpec.specKeyId && processedSpec.speckeyid) {
              processedSpec.specKeyId = processedSpec.speckeyid;
            }

            // Handle SpecificationKey object field name variations
            if (processedSpec.SpecificationKey) {
              // Make sure keyName is set
              if (!processedSpec.SpecificationKey.keyName && processedSpec.SpecificationKey.keyname) {
                processedSpec.SpecificationKey.keyName = processedSpec.SpecificationKey.keyname;
              }

              // Make sure keyname is set (backup)
              if (!processedSpec.SpecificationKey.keyname && processedSpec.SpecificationKey.keyName) {
                processedSpec.SpecificationKey.keyname = processedSpec.SpecificationKey.keyName;
              }
            }

            return processedSpec;
          });

          setProductSpecifications(processedSpecs);
        } else {
          setProductSpecifications([]);
        }
      } catch (specError) {
        console.error("Error fetching product specifications:", specError);
        setProductSpecifications([]);
      }

      // Fetch product sizes if not already included
      if (!product.productSizes || product.productSizes.length === 0) {
        try {
          console.log("Fetching sizes for product ID:", product.id);
          const sizesResponse = await axios.get(`${BASE_URL}/api/products/${product.id}/sizes`);
          console.log("Sizes response:", sizesResponse.data);

          if (sizesResponse.data && Array.isArray(sizesResponse.data)) {
            setSelectedProduct(prev => ({
              ...prev,
              productSizes: sizesResponse.data
            }));
          }
        } catch (sizeError) {
          console.error("Error fetching product sizes:", sizeError);
        }
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      setProductImages([]);
      setProductSpecifications([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeProductDetail = () => {
    setShowProductDetail(false);
    setSelectedProduct(null);
    setProductImages([]);
    setProductSpecifications([]);
  };

  // Image management functions
  const handleDeleteImage = async (imageId) => {
    setImageActionLoading(true);
    setImageActionError("");
    setImageActionSuccess("");

    try {
      await axios.delete(`${BASE_URL}/api/product-images/${imageId}`);
      setProductImages(productImages.filter(img => img.id !== imageId));
      setImageActionSuccess("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      setImageActionError("Failed to delete image. Please try again.");
    } finally {
      setImageActionLoading(false);
      setImageToDelete(null);
    }
  };

  const handleUpdateImage = async (imageId) => {
    if (!newImageFile) {
      setImageActionError("Please select a new image file");
      return;
    }

    setImageActionLoading(true);
    setImageActionError("");
    setImageActionSuccess("");

    try {
      const formData = new FormData();
      formData.append('image', newImageFile);

      const response = await axios.put(`${BASE_URL}/api/product-images/${imageId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update the image in the state
      const updatedImages = productImages.map(img =>
        img.id === imageId ? response.data.image : img
      );

      setProductImages(updatedImages);
      setImageActionSuccess("Image updated successfully");
      setNewImageFile(null);
    } catch (error) {
      console.error("Error updating image:", error);
      setImageActionError("Failed to update image. Please try again.");
    } finally {
      setImageActionLoading(false);
      setImageToUpdate(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewImageFile(e.target.files[0]);
    }
  };

  const handleSaveSizes = async () => {
    try {
      const response = await axios.put(`${BASE_URL}/api/products/${selectedProduct.id}`, {
        size: tempSizes
      });

      if (response.data) {
        setSelectedProduct(prev => ({
          ...prev,
          size: tempSizes
        }));
        // toast.success('Sizes updated successfully');
        console.log('Sizes updated successfully');
        setEditingSizes(false);
      }
    } catch (error) {
      console.error('Error updating sizes:', error);
      // toast.error('Failed to update sizes');
      console.log('Failed to update sizes');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 sm:p-4 mt-12 sm:mt-0">
      <div className="max-w-7xl mx-auto">
        <div className="p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm min-h-screen border border-gray-100">
          <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Product Inventory</span>
            <span className="ml-4 px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-600">Admin</span>
          </h2>
          <p className="text-gray-500 mb-6">View and manage your product listings</p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">
              {errorMessage}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h5 className="text-lg font-semibold text-gray-700">Product Management</h5>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      className="pl-9 pr-4 py-2 border-1 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>


                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="text-sm border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh products list"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>

                  {/* Auto-refresh indicator */}
                  {/* <div className="flex items-center text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
                    Auto-refresh: 5s
                  </div> */}

                  <Link
                    to="/admin/products/add"
                    className="text-sm border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="mx-auto w-24 h-24 mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                        <Search className="h-10 w-10 text-blue-500" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
                      <p className="text-gray-500 mb-6">Try changing your search criteria or add a new product</p>
                      <Link
                        to="/admin/products/add"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Product
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Stock</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sizes</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added Date</th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentProducts.map((product) => (
                            <tr
                              key={product.id}
                              className="hover:bg-gray-50 transition-colors duration-150"
                            >
                              <td className="px-2 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{getProductName(product)}</div>

                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{getSubcategoryDisplay(product)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {/* Show size-wise pricing if available */}
                                  {product.productSizes && product.productSizes.length > 0 ? (
                                    <div>
                                      {(() => {
                                        const prices = product.productSizes
                                          .filter(size => size.is_available)
                                          .map(size => {
                                            // Calculate price based on modifier type
                                            if (size.price_modifier_type === 'fixed' && size.price) {
                                              return parseFloat(size.price);
                                            } else if (size.price_modifier_type === 'percentage' && size.price_modifier_value) {
                                              const percentage = parseFloat(size.price_modifier_value);
                                              return parseFloat(product.price) * (1 + percentage / 100);
                                            } else {
                                              return parseFloat(product.price); // base price
                                            }
                                          });

                                        const minPrice = Math.min(...prices);
                                        const maxPrice = Math.max(...prices);

                                        return minPrice === maxPrice ?
                                          formatPrice(minPrice) :
                                          `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
                                      })()}
                                      <div className="text-xs text-gray-500 mt-1">
                                        Base: {formatPrice(product.price)}
                                      </div>
                                    </div>
                                  ) : (
                                    formatPrice(product.price)
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {/* Stock Status Display */}
                                <div className="flex items-center">
                                  {(() => {
                                    const live = stockMap[product.id] || {};
                                    const stockQuantity = product.stockQuantity || product.stock_quantity || 0;
                                    const lowStockThreshold = product.lowStockThreshold || product.low_stock_threshold || 5;
                                    const isActive = product.isActive !== undefined ? product.isActive : (product.is_active !== undefined ? product.is_active : true);

                                    if (!isActive) {
                                      return (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                          <span className="w-2 h-2 mr-1.5 bg-gray-400 rounded-full"></span>
                                          Inactive
                                        </span>
                                      );
                                    } else if (stockQuantity === 0) {
                                      return (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          <span className="w-2 h-2 mr-1.5 bg-red-400 rounded-full"></span>
                                          Out of Stock
                                        </span>
                                      );
                                    } else if (stockQuantity <= lowStockThreshold) {
                                      return (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                          <span className="w-2 h-2 mr-1.5 bg-yellow-400 rounded-full"></span>
                                          Low Stock ({stockQuantity})
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <span className="w-2 h-2 mr-1.5 bg-green-400 rounded-full"></span>
                                          In Stock ({stockQuantity})
                                        </span>
                                      );
                                    }
                                  })()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {/* Balance Stock (show size-wise when available) */}
                                <div className="text-sm font-medium text-gray-900">
                                  {(() => {
                                    const hasSizes = Array.isArray(product.productSizes) && product.productSizes.length > 0;
                                    if (hasSizes) {
                                      const sizes = product.productSizes
                                        .filter(s => s.is_available)
                                        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

                                      const currentTotal = sizes.reduce((sum, s) => sum + (parseInt(s.stock_quantity, 10) || 0), 0);
                                      const initialTotal = sizes.reduce((sum, s) => sum + (parseInt(s.initial_stock, 10) || 0), 0);

                                      // Break into rows of two for display
                                      const rows = [];
                                      for (let i = 0; i < sizes.length; i += 2) rows.push(sizes.slice(i, i + 2));

                                      return (
                                        <div className="flex flex-col">
                                          <div className="space-y-0.5">
                                            {rows.map((row, idx) => (
                                              <div key={idx} className="flex items-center text-xs font-bold text-gray-900">
                                                <span className="w-1/2 pr-4">{`${row[0].size_value}=${parseInt(row[0].stock_quantity, 10) || 0}`}</span>
                                                <span className="w-1/2 text-right">{row[1] ? `${row[1].size_value}=${parseInt(row[1].stock_quantity, 10) || 0}` : ''}</span>
                                              </div>
                                            ))}
                                          </div>
                                          <span className="mt-1 text-green-600 font-bold">{initialTotal ? `${currentTotal}/${initialTotal}` : `${currentTotal}`}</span>
                                        </div>
                                      );
                                    }

                                    // Fallback to product-level stock
                                    const currentStock = product.stockQuantity || product.stock_quantity || 0;
                                    const initialStock = product.initialStock || product.initial_stock || 0;
                                    return initialStock ? `${currentStock}/${initialStock}` : `${currentStock}`;
                                  })()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                  {/* Show new productSizes if available */}
                                  {product.productSizes && product.productSizes.length > 0 ? (
                                    <div className="flex flex-col">
                                      <div className="flex flex-wrap gap-1">
                                        {product.productSizes
                                          .filter(size => size.is_available)
                                          .sort((a, b) => a.display_order - b.display_order)
                                          .map((size) => {
                                            // Calculate price for this size
                                            let sizePrice;
                                            if (size.price_modifier_type === 'fixed' && size.price) {
                                              sizePrice = parseFloat(size.price);
                                            } else if (size.price_modifier_type === 'percentage' && size.price_modifier_value) {
                                              const percentage = parseFloat(size.price_modifier_value);
                                              sizePrice = parseFloat(product.price) * (1 + percentage / 100);
                                            } else {
                                              sizePrice = parseFloat(product.price); // base price
                                            }

                                            return (
                                              <span
                                                key={size.id}
                                                className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded-full"
                                                title={`${size.size_type}: ₹${sizePrice} (${size.price_modifier_type})`}
                                              >
                                                {size.size_value}: ₹{sizePrice}
                                              </span>
                                            );
                                          })}
                                        <span className="px-1 py-1 text-xs text-gray-400">
                                          ({product.productSizes[0]?.size_type})
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-700 mt-1">
                                        {/* {product.productSizes
                                          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                                          .map(s => `${s.size_value}=${parseInt(s.stock_quantity, 10) || 0}`)
                                          .join('  ')} */}
                                      </div>
                                    </div>
                                  ) : product.size ? (
                                    /* Fallback to legacy size field */
                                    <div className="flex flex-wrap gap-1">
                                      {/* {product.size.split(',').map((size, idx) => (
                                        <span key={idx} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-full">
                                          {size.trim()}
                                        </span>
                                      ))} */}
                                      <span className="px-1 py-1 text-xs text-gray-400">
                                        (legacy)
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">No sizes</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(product.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center space-x-3">
                                  <button
                                    onClick={() => handleViewDetails(product)}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-green-600 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    title="View Product Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  {/* Auto-refresh indicator */}
                                  {/* <div className="flex items-center text-xs text-gray-500">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
                                   Auto-refresh: 5s
                                            </div> */}

                                  <Link
                                    to={`/admin/products/edit/${product.id}`}
                                    onClick={() => {
                                      // Save current page state before navigating to edit
                                      localStorage.setItem('productListCurrentPage', currentPage.toString());
                                      localStorage.setItem('productListSearchTerm', searchTerm);
                                      localStorage.setItem('productListSelectedCategory', selectedCategory);
                                    }}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    title="Edit Product"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(product.id)}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  {filteredProducts.length > itemsPerPage && (
                    <div className="flex items-center justify-between mt-6 px-4 py-3 border-t border-gray-200 sm:px-6">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${currentPage === 1
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                            <span className="font-medium">
                              {Math.min(indexOfLastItem, filteredProducts.length)}
                            </span>{" "}
                            of <span className="font-medium">{filteredProducts.length}</span> results
                          </p>
                        </div>
                        <div>
                          <SmartPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            maxVisiblePages={5}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Admin Verification Modal */}
          <AdminVerifyModal
            show={showAdminVerify}
            onCancel={handleAdminCancel}
            onVerify={handleAdminVerify}
            verifying={adminVerifying}
            error={adminVerifyError}
          />

          {/* Product Detail Modal */}
          {showProductDetail && selectedProduct && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-white/60 backdrop-blur-sm" aria-hidden="true"></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full sm:p-6">
                  <div className="sm:flex sm:items-start justify-between">
                    <h3 className="text-2xl font-bold leading-6 text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Product Details
                    </h3>
                    <button
                      type="button"
                      className="rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                      onClick={closeProductDetail}
                    >
                      <span className="sr-only">Close</span>
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    {detailsLoading ? (
                      <div className="flex justify-center items-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Product Images Section */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="text-lg font-medium text-gray-700 mb-4">Product Images</h4>
                          {productImages && productImages.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                              {productImages.map((image, index) => {
                                const imageSource = image.imageUrl || image.url;

                                if (!imageSource) return null;

                                const fullImageUrl = imageSource.startsWith('http')
                                  ? imageSource
                                  : `${BASE_URL}${imageSource}`;

                                return (
                                  <div key={index} className="relative h-40 bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                                    <img
                                      src={fullImageUrl}
                                      alt={`Product image ${index + 1}`}
                                      className="h-full w-full object-contain"
                                      onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
                                      }}
                                    />

                                    <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-br-md">
                                      {image.orderNumber || index + 1}
                                    </div>
                                  </div>
                                );
                              }).filter(Boolean)}
                            </div>
                          ) : (
                            <div className="text-center py-8 px-4 text-gray-500 bg-gray-100 rounded-lg">
                              No images available for this product
                            </div>
                          )}
                        </div>

                        {/* Product Information Section */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="text-lg font-medium text-gray-700 mb-4">Basic Information</h4>

                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                              <span className="text-sm font-medium text-gray-600">Product ID:</span>
                              <span className="text-sm text-gray-800 col-span-2">{selectedProduct.id}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                              <span className="text-sm font-medium text-gray-600">Name:</span>
                              <span className="text-sm text-gray-800 col-span-2">{getProductName(selectedProduct)}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                              <span className="text-sm font-medium text-gray-600">Brand:</span>
                              <span className="text-sm text-gray-800 col-span-2">{selectedProduct.brand || 'N/A'}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                              <span className="text-sm font-medium text-gray-600">Category:</span>
                              <span className="text-sm text-gray-800 col-span-2">
                                {selectedProduct.categoryName ||
                                  (categoriesLoaded && selectedProduct.category ?
                                    getCategoryName(selectedProduct.category) :
                                    selectedProduct.category || 'N/A')}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                              <span className="text-sm font-medium text-gray-600">Subcategory:</span>
                              <span className="text-sm text-gray-800 col-span-2">
                                {selectedProduct.subcategoryName ||
                                  (categoriesLoaded && (selectedProduct.subcategory || selectedProduct.subCategory) ?
                                    getSubCategoryName(parseInt(selectedProduct.subcategory || selectedProduct.subCategory)) :
                                    (selectedProduct.subCategory || selectedProduct.subcategory || 'N/A'))}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                              <span className="text-sm font-medium text-gray-600">Base Price:</span>
                              <span className="text-sm text-gray-800 col-span-2">{formatPrice(selectedProduct.price)}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                              <span className="text-sm font-medium text-gray-600">Available Sizes:</span>
                              <div className="col-span-2">
                                {editingSizes ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={tempSizes}
                                      onChange={(e) => setTempSizes(e.target.value)}
                                      placeholder="Enter sizes (comma-separated)"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={handleSaveSizes}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingSizes(false);
                                          setTempSizes(selectedProduct.size || '');
                                        }}
                                        className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    <p className="text-xs text-gray-500">Enter sizes separated by commas (e.g., S, M, L, XL)</p>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-wrap gap-2">
                                      {selectedProduct.productSizes && selectedProduct.productSizes.length > 0 ? (
                                        <>
                                          {selectedProduct.productSizes
                                            .filter(size => size.is_available)
                                            .sort((a, b) => a.display_order - b.display_order)
                                            .map((size) => (
                                              <span
                                                key={size.id}
                                                className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded-full"
                                                title={`Type: ${size.size_type}`}
                                              >
                                                {size.size_value}
                                              </span>
                                            ))}
                                          <span className="px-2 py-1 text-xs text-gray-400 bg-gray-50 rounded-full">
                                            {selectedProduct.productSizes[0]?.size_type}
                                          </span>
                                        </>
                                      ) : selectedProduct.size ? (
                                        <>
                                          {selectedProduct.size.split(',').map((size, idx) => (
                                            <span key={idx} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full">
                                              {size.trim()}
                                            </span>
                                          ))}
                                          <span className="px-2 py-1 text-xs text-gray-400 bg-gray-50 rounded-full">
                                            legacy
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-sm text-gray-500">No sizes available</span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setTempSizes(selectedProduct.size || '');
                                        setEditingSizes(true);
                                      }}
                                      className="p-1 text-blue-600 hover:text-blue-700"
                                      title="Edit Sizes"
                                    >
                                      <Edit size={16} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                              <span className="text-sm font-medium text-gray-600">GST Rate:</span>
                              <span className="text-sm text-gray-800 col-span-2">
                                {selectedProduct.gst || '0'}% ({selectedProduct.gst_type || 'exclusive'})
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                              <span className="text-sm font-medium text-gray-600">GST Amount:</span>
                              <span className="text-sm text-gray-800 col-span-2">
                                {selectedProduct.gstDetails ? selectedProduct.gstDetails.gstAmount : formatPrice(0)}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                              <span className="text-sm font-medium text-gray-600">Total Price:</span>
                              <span className="text-sm text-gray-800 col-span-2">
                                {selectedProduct.gstDetails ? selectedProduct.gstDetails.totalPrice : formatPrice(selectedProduct.price)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Product Description */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 md:col-span-2">
                          <h4 className="text-lg font-medium text-gray-700 mb-2">Description</h4>
                          <p className="text-sm text-gray-800 whitespace-pre-line">
                            {selectedProduct.description || 'No description available'}
                          </p>
                        </div>

                        {/* Product Specifications */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 md:col-span-2">
                          <h4 className="text-lg font-medium text-gray-700 mb-4">Specifications</h4>

                          {productSpecifications.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {productSpecifications.map((spec, index) => {
                                let keyName = 'Unnamed';

                                if (spec.SpecificationKey) {
                                  keyName = spec.SpecificationKey.keyName ||
                                    spec.SpecificationKey.keyname ||
                                    'Unnamed';
                                } else {
                                  keyName = spec.key ||
                                    spec.keyName ||
                                    spec.keyname ||
                                    'Unnamed';
                                }

                                return (
                                  <div key={index} className="flex border-b border-gray-200 pb-2">
                                    <span className="text-sm font-medium text-gray-600 w-1/2">{keyName}:</span>
                                    <span className="text-sm text-gray-800 w-1/2">{spec.value}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-6 px-4 text-gray-500 bg-gray-100 rounded-lg">
                              No specifications available for this product
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsList;




