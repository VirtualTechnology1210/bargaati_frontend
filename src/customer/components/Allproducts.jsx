import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingCart, Star, Heart, Filter, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { BASE_URL } from '../../util';
import SmartPagination from '../../components/SmartPagination';
import { useCart } from '../context/CartContext';

// Utility function for GST calculations
const calculatePrices = (basePrice, mrp, gstRate, isInclusive) => {
  basePrice = parseFloat(basePrice) || 0;
  mrp = parseFloat(mrp) || basePrice;
  gstRate = parseFloat(gstRate) || 0;

  let priceBeforeGST, gstAmount, finalPrice;

  if (isInclusive) {
    // For inclusive GST, we need to extract GST from the given price
    priceBeforeGST = basePrice / (1 + (gstRate / 100));
    gstAmount = basePrice - priceBeforeGST;
    finalPrice = basePrice; // Final price is same as given price for inclusive
  } else {
    // For exclusive GST, we add GST to the given price
    priceBeforeGST = basePrice;
    gstAmount = basePrice * (gstRate / 100);
    finalPrice = basePrice + gstAmount;
  }

  // Calculate discount percentage if MRP is provided
  const discount = mrp > finalPrice ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

  return {
    priceBeforeGST: Number(priceBeforeGST.toFixed(2)),
    gstAmount: Number(gstAmount.toFixed(2)),
    finalPrice: Number(finalPrice.toFixed(2)),
    discount,
    mrp: Number(mrp.toFixed(2))
  };
};

const ProductCard = ({ product, categoryMap, isFeatured, className }) => {
  const { id, productName, imageUrl, price, mrp, rating, category, brand } = product;
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { addToCart } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  const [productSizes, setProductSizes] = useState([]);
  const [hasSizes, setHasSizes] = useState(false);

  const [priceDetails, setPriceDetails] = useState({
    priceBeforeGST: 0,
    gstAmount: 0,
    finalPrice: 0,
    discount: 0,
    mrp: 0
  });

  useEffect(() => {
    if (product) {
      const basePrice = parseFloat(product.price) || 0;
      const mrpValue = parseFloat(product.mrp) || basePrice;
      const gst = parseFloat(product.gst) || 0;
      const gstType = product.gst_type || product.gstType || 'exclusive';

      let priceBeforeGST, gstAmount, finalPrice;

      if (gstType === 'inclusive') {
        priceBeforeGST = basePrice / (1 + (gst / 100));
        gstAmount = basePrice - priceBeforeGST;
        finalPrice = basePrice;
      } else {
        priceBeforeGST = basePrice;
        gstAmount = basePrice * (gst / 100);
        finalPrice = basePrice + gstAmount;
      }

      const discount = mrpValue > finalPrice ? Math.round(((mrpValue - finalPrice) / mrpValue) * 100) : 0;

      setPriceDetails({
        priceBeforeGST: Number(priceBeforeGST.toFixed(2)),
        gstAmount: Number(gstAmount.toFixed(2)),
        finalPrice: Number(finalPrice.toFixed(2)),
        discount,
        mrp: Number(mrpValue.toFixed(2))
      });
    }
  }, [product]);

  const hasDiscount = priceDetails.mrp > priceDetails.finalPrice;

  useEffect(() => {
    const fetchProductSizes = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/products/${id}/sizes`);
        if (response.data && response.data.length > 0) {
          setProductSizes(response.data);
          setHasSizes(true);
        } else {
          setProductSizes([]);
          setHasSizes(false);
        }
      } catch (error) {
        console.error('Error fetching product sizes:', error);
        setHasSizes(false);
      }
    };
    fetchProductSizes();
  }, [id]);

  useEffect(() => {
    const fetchFavoritesStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await axios.get(`${BASE_URL}/api/favorites/status/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setIsFavorite(response.data.isFavorite);
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          console.error('Error fetching favorite status:', error);
        }
      }
    };

    fetchFavoritesStatus();
  }, [id]);

  const fullImageUrl = imageUrl && !imageUrl.startsWith('http') ? `${BASE_URL}${imageUrl}` : imageUrl;
  const categoryName = categoryMap[category] || 'General';

  const checkAuthAndExecute = (action) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowLoginModal(true);
    } else {
      action();
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    // If the product has sizes, go to the product details page to select size (no auth required)
    if (hasSizes) {
      navigate(`/customer/product/${id}`);
      return;
    }

    // Products without sizes can be added directly to cart for both guests and logged-in users
    const cartItem = {
      productId: id,
      productName,
      price: priceDetails.finalPrice,
      quantity: 1,
      imageUrl: fullImageUrl,
    };
    addToCart(cartItem);
    toast.success(`${productName} added to cart!`);
  };

  const toggleFavorites = async (e) => {
    e.preventDefault();
    checkAuthAndExecute(async () => {
      try {
        const token = localStorage.getItem('token');
        let response;
        if (isFavorite) {
          // Already a favorite, so remove it
          response = await axios.delete(`${BASE_URL}/api/favorites/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setIsFavorite(false);
          toast.success('Removed from favorites');
        } else {
          // Not a favorite, so add it
          response = await axios.post(`${BASE_URL}/api/favorites/${id}`, 
            {}, 
            { headers: { Authorization: `Bearer ${token}` } 
          });
          setIsFavorite(true);
          toast.success('Added to favorites');
        }
        // Optionally dispatch an event to update other components
        window.dispatchEvent(new CustomEvent('favoritesUpdate'));
      } catch (error) {
        console.error('Error toggling favorite:', error);
        toast.error('Could not update favorites.');
      }
    });
  };

  return (
    <div className={`bg-white border border-gray-700 rounded-lg overflow-hidden h-full flex flex-col group transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-500/30 relative ${className}`}>
      <div className="relative aspect-square overflow-hidden bg-black-900">
        <Link to={`/customer/product/${id}`}>
          <img
            src={fullImageUrl}
            alt={productName}
            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { e.target.src = '#'; }}
          />
        </Link>

        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-amber-500 text-black-900 text-xs font-bold px-2 py-1 rounded-full z-10">
            {priceDetails.discount}% OFF
          </div>
        )}

        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={toggleFavorites}
            className={`p-1.5 rounded-full transition-colors duration-300 ${isFavorite ? 'bg-red-500/20 text-red-500' : 'bg-black/20 text-white hover:bg-red-500/30 hover:text-red-400'}`}>
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        <div className="flex-grow">
          <p className="text-xs text-black-600 mb-1">{brand || 'Brand'}</p>
          <h3 className="font-semibold text-sm sm:text-base text-black-500 mb-2 leading-tight">
            <Link to={`/customer/product/${id}`} className="hover:text-black-300 transition-colors">
              {productName}
            </Link>
          </h3>
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
            <span>{rating ? `${rating.toFixed(1)}` : 'New'}</span>
          </div>
        </div>

        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-lg font-bold text-black-400">₹{priceDetails.finalPrice.toLocaleString()}</span>
            {hasDiscount && (
              <p className="text-sm text-gray-500 line-through">₹{priceDetails.mrp.toLocaleString()}</p>
            )}
          </div>
          {hasDiscount && (
            <p className="text-xs font-semibold text-green-400">
              You save ₹{(priceDetails.mrp - priceDetails.finalPrice).toLocaleString()} ({priceDetails.discount}% off)
            </p>
          )}
        </div>
      </div>
      <div className="p-3 sm:p-4 border-t border-gray-700/50">
        <button onClick={(e) => { e.preventDefault(); navigate(`/customer/product/${id}`); }} className="w-full bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          <span>View Options</span>
        </button>
      </div>
    </div>
  );
};

const AllProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryMap, setCategoryMap] = useState({});
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 3,
    total: 0
  });
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'all',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '100000000',
    sortBy: searchParams.get('sortBy') || 'price',
    sortOrder: searchParams.get('sortOrder') || 'ASC',
    search: searchParams.get('search') || ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/categories`);
      if (response.data && response.data.mainCategories) {
        const categoryMapping = {};
        response.data.mainCategories.forEach(category => {
          categoryMapping[category.id] = category.name;
        });
        setCategoryMap(categoryMapping);
        setCategories(response.data.mainCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  // Fetch products with filters and pagination
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);      // Build query parameters for filtering
      const queryParams = new URLSearchParams();

      // Set a high limit to get all products
      queryParams.append('limit', '10000');

      // Handle category filter
      if (filters.category && filters.category !== 'all') {
        queryParams.append('category', filters.category);
      }

      // Handle price filters - convert to numbers and validate
      const minPrice = parseFloat(filters.minPrice);
      const maxPrice = parseFloat(filters.maxPrice);

      if (!isNaN(minPrice) && minPrice >= 0) {
        queryParams.append('minPrice', minPrice.toString());
      }

      if (!isNaN(maxPrice) && maxPrice >= 0) {
        queryParams.append('maxPrice', maxPrice.toString());
      }

      // Handle sorting parameters
      if (filters.sortBy) {
        // Convert UI-friendly names to API field names if needed
        const sortField = filters.sortBy.toLowerCase();
        queryParams.append('sortBy', sortField);
        queryParams.append('sortOrder', filters.sortOrder);
      }

      // Handle search
      if (filters.search?.trim()) {
        queryParams.append('search', filters.search.trim());
      }

      console.log('Fetching with params:', queryParams.toString()); // For debugging      // Fetch all products from the API regardless of stock status
      const response = await axios.get(`${BASE_URL}/api/products?${queryParams}&includeOutOfStock=true`);

      if (response.data) {
        const productsData = Array.isArray(response.data) ? response.data : response.data.products || [];

        // Apply client-side filtering for price if needed
        let filteredProducts = productsData;
        if (minPrice > 0 || maxPrice > 0) {
          filteredProducts = productsData.filter(product => {
            const productPrice = parseFloat(product.price) || 0;
            if (minPrice > 0 && maxPrice > 0) {
              return productPrice >= minPrice && productPrice <= maxPrice;
            } else if (minPrice > 0) {
              return productPrice >= minPrice;
            } else if (maxPrice > 0) {
              return productPrice <= maxPrice;
            }
            return true;
          });
        }

        // Apply client-side sorting if needed
        if (filters.sortBy) {
          filteredProducts.sort((a, b) => {
            const valueA = a[filters.sortBy] || 0;
            const valueB = b[filters.sortBy] || 0;

            // Handle numeric values
            if (!isNaN(valueA) && !isNaN(valueB)) {
              return filters.sortOrder === 'ASC' ? valueA - valueB : valueB - valueA;
            }

            // Handle string values
            return filters.sortOrder === 'ASC'
              ? String(valueA).localeCompare(String(valueB))
              : String(valueB).localeCompare(String(valueA));
          });
        }

        // Fetch images for filtered products
        const productsWithImages = await Promise.all(
          filteredProducts.map(async (product) => {
            try {
              const imagesResponse = await axios.get(`${BASE_URL}/api/products/${product.id}/images`);
              return {
                ...product,
                imageUrl: imagesResponse.data?.[0]?.imageUrl || imagesResponse.data?.[0]?.url || null
              };
            } catch (error) {
              console.error(`Error fetching images for product ${product.id}:`, error);
              return { ...product, imageUrl: null };
            }
          })
        ); setProducts(productsWithImages);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(error.response?.data?.message || "Failed to load products. Please try again later.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage]);

  // Initial load
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  // Fetch products when filters change
  useEffect(() => {
    fetchProducts();
  }, [filters, pagination.currentPage]); // Direct dependencies instead of fetchProducts

  // Update URL when filters change
  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) newSearchParams.set(key, value);
    });
    setSearchParams(newSearchParams);
  }, [filters, setSearchParams]);

  const handleFilterChange = (name, value) => {
    // Validate the value based on the filter type
    let validatedValue = value;

    if (name === 'minPrice' || name === 'maxPrice') {
      // Handle empty string
      if (value === '') {
        validatedValue = '';
      } else {
        // Convert to number and validate
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 0) {
          toast.error('Please enter a valid price');
          return;
        }

        // If setting minPrice
        if (name === 'minPrice') {
          const maxPrice = Number(filters.maxPrice);
          if (maxPrice && numValue >= maxPrice) {
            toast.error('Minimum price must be less than maximum price');
            return;
          }
        }

        // If setting maxPrice
        if (name === 'maxPrice') {
          const minPrice = Number(filters.minPrice);
          if (minPrice && numValue <= minPrice) {
            toast.error('Maximum price must be greater than minimum price');
            return;
          }
        }

        validatedValue = numValue.toString();
      }
    }

    setFilters(prev => {
      const newFilters = { ...prev, [name]: validatedValue };

      // Update URL parameters
      const searchParams = new URLSearchParams();
      Object.entries(newFilters).forEach(([key, val]) => {
        if (val) searchParams.set(key, val);
      });
      setSearchParams(searchParams, { replace: true });

      return newFilters;
    });

    // Reset to first page when filter changes
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    const defaultFilters = {
      // category: '',
      minPrice: '',
      maxPrice: '',
      // sortBy: 'price',
      // sortOrder: 'ASC',
      search: ''
    };

    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setSearchParams(new URLSearchParams());
    setShowFilters(false);
  };

  return (
    <div className="min-h-screen bg-black-900 z-100 relative-overflow-hidden ">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col space-y-4">
          {/* Header and Search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl font-bold text-amber-200 relative">All Products</h1>

          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-gray-800 rounded-lg shadow-sm overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-700"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-5 bg-gray-700 rounded w-1/3 mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <X className="h-6 w-6 text-gray-400" />
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <>
              {/* Featured Section with Products and Banner */}
              {products.length > 0 && (
                <div className="mb-8">
                  <div className="flex flex-col md:flex-row gap-6 ">
                    {/* Featured Products - Left Side */}
                    {/* <div className="w-full md:w-2/3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
                        {products.slice(0, 2).map((product) => (
                          <div key={product.id} className="aspect-[4/5] w-full">
                            <ProductCard
                              product={product}
                              categoryMap={categoryMap}
                              isFeatured={true}
                              className="h-full w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </div> */}
                  </div>
                </div>
              )}

              {/* All Products Grid */}
              <div className="mt-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {products.slice(3, 30).map((product) => (
                    <ProductCard key={product.id} product={product} categoryMap={categoryMap} />
                  ))}
                </div>
              </div>

              {/* Empty State */}
              {products.length === 0 && (
                <div className="text-center py-12">
                  <X className="h-6 w-6 text-gray-400" />
                  <p className="text-gray-500">No products found matching your criteria.</p>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllProducts;