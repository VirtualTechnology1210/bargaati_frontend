import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Star, ArrowLeft, Minus, Plus, CreditCard, X, ZoomIn, ChevronLeft, ChevronRight, Heart, RefreshCcw, Truck, ChevronDown, AlertTriangle, ShieldCheck, Share2, ThumbsUp, ThumbsDown, Edit } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';
import FocusTrap from 'focus-trap-react';
import { BASE_URL } from '../../util';
import { motion } from 'framer-motion';

// Utility to construct API URLs
const getApiUrl = (path) => `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

// Utility for fallback image
const getFallbackImage = () => 'https://placehold.co/600x600/f5f5f5/555555?text=No+Image';

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

// Custom hook for fetching product data
const useProductData = (id) => {
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gstSettings, setGstSettings] = useState({
    rate: 18, // Default GST rate
    isInclusive: false // Default to exclusive GST
  });
  const [priceDetails, setPriceDetails] = useState(null);
  const [sizePricing, setSizePricing] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);

  // Update GST settings when product data is loaded
  useEffect(() => {
    if (product && product.gst !== undefined && product.gst_type !== undefined) {
      console.log('Updating GST settings from product data:', {
        gst: product.gst,
        gst_type: product.gst_type
      });
      setGstSettings({
        rate: parseFloat(product.gst) || 0,
        isInclusive: product.gst_type === 'inclusive'
      });
    }
  }, [product]);

  // Update price details whenever product or GST settings change
  useEffect(() => {
    if (product) {
      const prices = calculatePrices(
        product.price,
        product.mrp,
        gstSettings.rate,
        gstSettings.isInclusive
      );
      setPriceDetails(prices);
    }
  }, [product, gstSettings.rate, gstSettings.isInclusive]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProductData = async () => {
      setLoading(true);
      setError(null);
      try {
        const productId = parseInt(id, 10);
        if (isNaN(productId)) throw new Error('Invalid product ID');

        console.log(`Fetching product data for ID: ${productId}`);
        console.log(`API URL: ${getApiUrl(`/api/products/${productId}/full`)}`);

        // Fetch product details
        const productResponse = await axios.get(getApiUrl(`/api/products/${productId}/full`), {
          signal: controller.signal,
          timeout: 10000
        });

        console.log('Product response:', productResponse.data);
        const productData = productResponse.data;
        if (!productData) throw new Error('No product data found');
        setProduct(productData);

        // Fetch product images
        const imagesResponse = await axios.get(getApiUrl(`/api/products/${productId}/images`), { signal: controller.signal });
        const imageUrls = imagesResponse.data?.map(img => {
          const imgUrl = img.imageUrl || img.url;
          return imgUrl?.startsWith('http') ? imgUrl : getApiUrl(imgUrl);
        }) || [getFallbackImage()];
        setProductImages(imageUrls);
        // Fetch specifications
        try {
          const specsResponse = await axios.get(getApiUrl(`/api/products/${productId}/specifications`), {
            signal: controller.signal,
            timeout: 10000
          });
          console.log('Specifications response:', specsResponse.data);
          console.log('Specifications response type:', typeof specsResponse.data);
          console.log('Specifications is array:', Array.isArray(specsResponse.data));
          console.log('Specifications length:', specsResponse.data?.length);

          if (specsResponse.data && Array.isArray(specsResponse.data)) {
            console.log('Setting specifications in product:', specsResponse.data);
            setProduct(prev => ({ ...prev, specifications: specsResponse.data }));
          } else {
            console.log('No valid specifications data, setting empty array');
            setProduct(prev => ({ ...prev, specifications: [] }));
          }
        } catch (specsError) {
          console.error('Error fetching specifications:', specsError);
          setProduct(prev => ({ ...prev, specifications: [] }));
        }

        // Fetch product sizes
        try {
          const sizesResponse = await axios.get(getApiUrl(`/api/products/${productId}/sizes`), {
            signal: controller.signal,
            timeout: 10000
          });
          console.log('Sizes response:', sizesResponse.data);

          if (sizesResponse.data && Array.isArray(sizesResponse.data)) {
            console.log('Setting sizes in product:', sizesResponse.data);
            setProduct(prev => ({ ...prev, productSizes: sizesResponse.data }));
          } else {
            console.log('No valid sizes data, setting empty array');
            setProduct(prev => ({ ...prev, productSizes: [] }));
          }
        } catch (sizesError) {
          console.error('Error fetching sizes:', sizesError);
          setProduct(prev => ({ ...prev, productSizes: [] }));
        }

        // Fetch size-based pricing
        try {
          const pricingResponse = await axios.get(getApiUrl(`/api/products/${productId}/pricing`), {
            signal: controller.signal,
            timeout: 10000
          });
          console.log('Size pricing response:', pricingResponse.data);

          if (pricingResponse.data && pricingResponse.data.success) {
            setSizePricing(pricingResponse.data);
            // Set initial price to base price
            if (setCurrentPrice) {
              setCurrentPrice({
                price: pricingResponse.data.product.basePrice,
                mrp: pricingResponse.data.product.baseMrp
              });
            }
          }
        } catch (pricingError) {
          console.error('Error fetching size pricing:', pricingError);
          // Fallback to product base price
          if (setCurrentPrice) {
            setCurrentPrice({
              price: parseFloat(productData.price),
              mrp: productData.mrp ? parseFloat(productData.mrp) : null
            });
          }
        }

        // Fetch related products
        try {
          const allProductsResponse = await axios.get(getApiUrl('/api/products'), {
            signal: controller.signal,
            timeout: 10000
          });
          const sameCategory = allProductsResponse.data?.filter(p =>
            p.category === productData.category && p.id !== productData.id
          ).slice(0, 4) || [];

          const relatedWithImages = await Promise.all(
            sameCategory.map(async (relatedProduct) => {
              try {
                const imgResponse = await axios.get(getApiUrl(`/api/products/${relatedProduct.id}/images`), {
                  signal: controller.signal,
                  timeout: 5000
                });
                const imgUrl = imgResponse.data?.[0]?.imageUrl || imgResponse.data?.[0]?.url;

                if (!imgUrl) return { ...relatedProduct, image: getFallbackImage() };

                // Process the image URL
                let fullImageUrl;
                if (imgUrl.startsWith('http')) {
                  fullImageUrl = imgUrl;
                } else if (imgUrl.startsWith('/uploads/')) {
                  fullImageUrl = `${BASE_URL}${imgUrl}`;
                } else {
                  fullImageUrl = `${BASE_URL}/uploads/${imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl}`;
                }

                return {
                  ...relatedProduct,
                  image: fullImageUrl
                };
              } catch {
                return { ...relatedProduct, image: getFallbackImage() };
              }
            })
          );
          setRelatedProducts(relatedWithImages);
        } catch (relatedError) {
          console.error('Error fetching related products:', relatedError);
          setRelatedProducts([]);
        }
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          console.error('Error fetching product:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            config: {
              url: error.config?.url,
              method: error.config?.method
            }
          });

          const errorMessage = error.response?.status === 404
            ? 'Product not found'
            : error.response?.data?.message || error.message || 'Are you see the review';

          setError(new Error(errorMessage));
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
    return () => controller.abort();
  }, [id]);

  return { product, setProduct, relatedProducts, productImages, loading, error, sizePricing, currentPrice, setSizePricing, setCurrentPrice };
};

// Custom hook for favorites management
const useFavorites = (productId, product) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkIsFavorited = async () => {
      const token = localStorage.getItem('token');
      setIsLoading(true);
      if (token) {
        try {
          const response = await axios.get(getApiUrl('/api/favorites'), { headers: { Authorization: `Bearer ${token}` } });
          const userFavorites = response.data?.favorites || [];
          setIsFavorited(userFavorites.some(fav => fav.productId === parseInt(productId, 10)));
        } catch (error) {
          console.error('Error fetching user favorites:', error);
        }
      } else {
        const localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        setIsFavorited(localFavorites.some(p => p.id === parseInt(productId, 10)));
      }
      setIsLoading(false);
    };
    if (productId) {
      checkIsFavorited();
    }
  }, [productId]);

  const toggleFavorite = async () => {
    const token = localStorage.getItem('token');
    const optimisticNewState = !isFavorited;
    setIsFavorited(optimisticNewState);

    if (token) {
      try {
        if (optimisticNewState) {
          await axios.post(getApiUrl(`/api/favorites/${productId}`), {}, { headers: { Authorization: `Bearer ${token}` } });
          toast.success(`${product.productname} added to favorites`);
        } else {
          await axios.delete(getApiUrl(`/api/favorites/${productId}`), { headers: { Authorization: `Bearer ${token}` } });
          toast.success(`${product.productname} removed from favorites`);
        }
        window.dispatchEvent(new CustomEvent('favoritesUpdate'));
      } catch (error) {
        console.error('Error updating favorites:', error);
        toast.error(`Failed to update favorites. Please try again.`);
        setIsFavorited(!optimisticNewState); // Revert on error
      }
    } else {
      let localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      if (optimisticNewState) {
        localFavorites.push(product);
        toast.success(`${product.productname} added to favorites`);
      } else {
        localFavorites = localFavorites.filter(p => p.id !== parseInt(productId, 10));
        toast.success(`${product.productname} removed from favorites`);
      }
      localStorage.setItem('favorites', JSON.stringify(localFavorites));
      window.dispatchEvent(new CustomEvent('favoritesUpdate'));
    }
  };

  return { isFavorited, toggleFavorite, isLoadingFavorites: isLoading };
};

// Custom hook for fetching reviews
const useProductReviews = (productId) => {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [reviewStats, setReviewStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });

  const fetchReviews = async () => {
    if (!productId) return;

    setReviewsLoading(true);
    setReviewsError(null);

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      const headers = {};

      // Add Authorization header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.get(getApiUrl(`/api/reviews/${productId}`), {
        timeout: 10000,
        headers
      });

      console.log('Reviews response:', response.data);
      console.log('First review user data:', response.data?.reviews?.[0]?.user);

      if (response.data && response.data.reviews) {
        setReviews(response.data.reviews);

        // Calculate review statistics
        const totalReviews = response.data.total || response.data.count || response.data.reviews.length;
        const ratings = response.data.reviews.map(review => review.rating);
        const averageRating = ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

        // Calculate rating distribution
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratings.forEach(rating => {
          if (distribution[rating] !== undefined) {
            distribution[rating]++;
          }
        });

        setReviewStats({
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          ratingDistribution: distribution
        });
      } else {
        setReviews([]);
        setReviewStats({
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);

      // Handle different error types
      if (error.response?.status === 401) {
        // For unauthorized access, we can either show a login prompt or just show no reviews
        setReviewsError('Please log in to view reviews');
        setReviews([]);
        setReviewStats({
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
      } else {
        setReviewsError(error.response?.data?.message || 'Are you see the review');
        setReviews([]);
      }
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  return {
    reviews,
    reviewsLoading,
    reviewsError,
    reviewStats,
    refetchReviews: fetchReviews
  };
};

// Price Details Component
const PriceDetails = ({ product }) => {
  const [priceDetails, setPriceDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (product) {
      const basePrice = parseFloat(product.price) || 0;
      const mrp = parseFloat(product.mrp) || basePrice;
      const gst = parseFloat(product.gst) || 0; // Use actual GST from backend
      const gstType = product.gst_type || product.gstType || 'exclusive'; // Use backend field

      let priceBeforeGST, gstAmount, finalPrice;

      if (gstType === 'inclusive') {
        priceBeforeGST = (basePrice * 100) / (100 + gst);
        gstAmount = basePrice - priceBeforeGST;
        finalPrice = basePrice;
      } else {
        priceBeforeGST = basePrice;
        gstAmount = (basePrice * gst) / 100;
        finalPrice = basePrice + gstAmount;
      }

      const discount = mrp > finalPrice ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;
      const savings = mrp > finalPrice ? mrp - finalPrice : 0;

      setPriceDetails({
        basePrice: Number(priceBeforeGST.toFixed(2)),
        gstAmount: Number(gstAmount.toFixed(2)),
        finalPrice: Number(finalPrice.toFixed(2)),
        mrp: Number(mrp.toFixed(2)),
        discount,
        savings: Number(savings.toFixed(2)),
        gstPercentage: gst,
        isGstInclusive: gstType === 'inclusive'
      });
    }
  }, [product]);

  if (!priceDetails) return null;

  return (
    <div className="bg-white rounded-lg p-4">
      {/* Main Price Display */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-yellow-400">₹{priceDetails.finalPrice}</span>
          {priceDetails.mrp > priceDetails.finalPrice && (
            <span className="text-sm line-through text-gray-200">₹{priceDetails.mrp}</span>
          )}
          {priceDetails.discount > 0 && (
            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              {priceDetails.discount}% OFF
            </span>
          )}
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          {showDetails ? 'Hide Details' : 'Price Details'}
          <svg
            className={`w-4 h-4 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expandable Price Details */}
      {showDetails && (
        <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-200">Base Price:</span>
            <span className="font-medium text-white">₹{priceDetails.basePrice}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-200">
              GST ({priceDetails.gstPercentage}%) {priceDetails.isGstInclusive ? '(Inclusive)' : '(Exclusive)'}:
            </span>
            <span className="font-medium text-white">₹{priceDetails.gstAmount}</span>
          </div>

          {priceDetails.mrp > priceDetails.finalPrice && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-200">MRP:</span>
              <span className="line-through text-gray-200">₹{priceDetails.mrp}</span>
            </div>
          )}

          <div className="text-xs text-gray-200 pt-2 mt-2 border-t">
            {priceDetails.isGstInclusive
              ? "* The price shown is inclusive of GST"
              : "* GST will be added to the base price"
            }
          </div>
        </div>
      )}
    </div>
  );
};

const ProductDetail = () => {
  const { id: productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Get any additional query parameters
  const queryParams = new URLSearchParams(location.search);
  const fromCategory = queryParams.get('category');
  const fromSearch = queryParams.get('search');

  // Helper to robustly reset scroll position
  const resetScroll = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const root = document.getElementById('root');
    if (root && typeof root.scrollTop === 'number') root.scrollTop = 0;
  };

  // Always start at top when visiting product details or switching products
  // Use layout effect to ensure it happens before paint; handle hash anchors
  useLayoutEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.querySelector(location.hash);
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'start' });
          return;
        }
        resetScroll();
      }, 0);
      return;
    }
    resetScroll();
  }, [productId, location.hash]);

  

  // States for GST settings form
  const [showGstSettings, setShowGstSettings] = useState(false);
  const handleGstRateChange = (e) => {
    const rate = parseFloat(e.target.value) || 0;
    product.gstSettings.rate = Math.min(Math.max(rate, 0), 100); // Clamp between 0-100
    setProduct({ ...product });
  };

  const handleGstTypeChange = (isInclusive) => {
    product.gstSettings.isInclusive = isInclusive;
    setProduct({ ...product });
  };

  // Build back URL with previous filters if they exist
  const getBackUrl = () => {
    if (fromSearch) return `/customer/shop?search=${encodeURIComponent(fromSearch)}`;
    if (fromCategory) return `/customer/shop?category=${encodeURIComponent(fromCategory)}`;
    return '/customer/shop';
  };
  const { addToCart, cart, fetchCart } = useCart();
  const { product, setProduct, relatedProducts, productImages, loading, error, sizePricing, currentPrice, setSizePricing, setCurrentPrice } = useProductData(productId);
  const { isFavorited, toggleFavorite, isLoadingFavorites } = useFavorites(productId, product);
  const { reviews, reviewsLoading, reviewsError, reviewStats, refetchReviews } = useProductReviews(productId);

  // After data finishes loading, enforce top again (handles late content/imageload shifts)
  useEffect(() => {
    if (!loading) {
      setTimeout(() => resetScroll(), 0);
    }
  }, [loading]);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [showSizeError, setShowSizeError] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [cartLimitMessage, setCartLimitMessage] = useState('');

  // Auto-refresh stock for current product (lightweight polling)
  useEffect(() => {
    if (!productId) return;
    let timer;
    let cancelled = false;

    const tick = async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/api/products/${productId}/stock`, { timeout: 8000 });
        if (!data?.success || cancelled) return;
        setProduct(prev => prev ? {
          ...prev,
          stock_quantity: data.stockQuantity,
          low_stock_threshold: data.lowStockThreshold,
          is_active: data.isActive,
          min_order_quantity: data.minOrderQuantity,
          max_order_quantity: data.maxOrderQuantity,
          updatedAt: data.updatedAt
        } : prev);
      } catch (_) { /* silent */ }
    };

    tick();
    timer = setInterval(tick, 5000);
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [productId, setProduct]);

  // Auto-refresh per-size stock and availability so buttons enable/disable live
  useEffect(() => {
    if (!productId) return;
    let timer;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await axios.get(getApiUrl(`/api/products/${productId}/sizes`), { timeout: 8000 });
        if (cancelled) return;
        if (Array.isArray(res.data)) {
          setProduct(prev => prev ? { ...prev, productSizes: res.data } : prev);
        }
      } catch (_) { /* silent */ }
    };

    tick();
    timer = setInterval(tick, 5000);
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [productId, setProduct]);

  // Function to handle size selection and price update
  const handleSizeSelection = async (sizeValue) => {
    console.log('handleSizeSelection called with:', sizeValue);
    console.log('sizePricing:', sizePricing);
    console.log('sizePricing.sizes:', sizePricing?.sizes);

    setSelectedSize(sizeValue);
    setShowSizeError(false);

    // After selecting a size, auto-adjust quantity to new size's available stock and max limits
    try {
      const hasNewSizes = product?.productSizes && product.productSizes.length > 0;
      let sizeStock = product?.stockQuantity || product?.stock_quantity || 0;
      if (hasNewSizes) {
        const sizeEntry = product.productSizes.find(s => s.size_value === sizeValue);
        if (sizeEntry) sizeStock = sizeEntry.stock_quantity ?? 0;
      }
      const maxOrderQuantity = product?.maxOrderQuantity || product?.max_order_quantity || Infinity;
      const newMaxAllowed = Math.max(1, Math.min(sizeStock, maxOrderQuantity));
      if (quantity > newMaxAllowed) {
        setQuantity(newMaxAllowed);
      }
    } catch (_) { /* noop */ }

    // Update price based on selected size
    if (sizePricing && sizePricing.sizes && setCurrentPrice) {
      const selectedSizeData = sizePricing.sizes.find(size => size.size_value === sizeValue);
      console.log('selectedSizeData:', selectedSizeData);

      if (selectedSizeData) {
        const newPrice = {
          price: selectedSizeData.calculatedPrice,
          mrp: selectedSizeData.calculatedMrp
        };
        console.log('Setting new price:', newPrice);
        setCurrentPrice(newPrice);
      }
    } else if (setCurrentPrice) {
      // Fallback: fetch specific size pricing
      console.log('Fallback: fetching size-specific pricing for:', sizeValue);
      try {
        const response = await axios.get(getApiUrl(`/api/products/${productId}/pricing?sizeValue=${sizeValue}`));
        console.log('Size-specific pricing response:', response.data);

        if (response.data && response.data.success && response.data.selectedSize) {
          const newPrice = {
            price: response.data.selectedSize.calculatedPrice,
            mrp: response.data.selectedSize.calculatedMrp
          };
          console.log('Setting fallback price:', newPrice);
          setCurrentPrice(newPrice);
        }
      } catch (error) {
        console.error('Error fetching size-specific pricing:', error);
      }
    }
  };
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [fullscreenPosition, setFullscreenPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('specifications');
  const fullscreenImageRef = useRef(null);

  // Price display component
  const PriceDisplay = ({ product }) => {
    if (!product) return null;

    // Use currentPrice if available (size-based pricing), otherwise use product price
    const price = currentPrice ? currentPrice.price : (parseFloat(product.price) || 0);
    const mrp = currentPrice ? (currentPrice.mrp || price) : (parseFloat(product.mrp) || price);
    const gstRate = parseFloat(product.gst) || 0;
    const isInclusive = product.gst_type === 'inclusive';



    const priceDetails = calculatePrices(price, mrp, gstRate, isInclusive);
    const hasDiscount = priceDetails.mrp > priceDetails.finalPrice;

    return (
      <div className="mt-4 space-y-3 rounded-lg pg-black-800">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-white">
            ₹{priceDetails.finalPrice.toLocaleString()}
          </p>
          {hasDiscount && (
            <p className="text-lg text-gray-200 line-through">₹{priceDetails.mrp.toLocaleString()}</p>
          )}
          {hasDiscount && (
            <span className="text-sm font-medium bg-red-100 text-red-600 px-2 py-1 rounded">
              {priceDetails.discount}% OFF
            </span>
          )}
          {currentPrice && selectedSize && (
            <span className="text-xs font-medium bg-blue-100 text-blue-600 px-2 py-1 rounded">
              Size: {selectedSize}
            </span>
          )}
        </div>

        {hasDiscount && (
          <p className="text-sm font-semibold text-green-600">
            You save ₹{(priceDetails.mrp - priceDetails.finalPrice).toLocaleString()}
          </p>
        )}

        <p className="text-sm text-gray-200">
          {isInclusive
            ? `Inclusive of ${gstRate}% GST (₹${priceDetails.gstAmount.toLocaleString()})`
            : `+${gstRate}% GST (₹${priceDetails.gstAmount.toLocaleString()})`}
        </p>

        <div className="text-xs text-gray-200 mt-2 pt-2 border-t">
          {isInclusive
            ? `Base price: ₹${priceDetails.priceBeforeGST.toLocaleString()}`
            : `Final price: ₹${priceDetails.finalPrice.toLocaleString()}`}
        </div>
      </div>
    );
  };

  // GST Settings component
  const GstSettings = ({ gstSettings, onRateChange, onTypeChange }) => {
    return (
      <div className="mt-4 border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-3">GST Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-200 mb-1">GST Rate (%)</label>
            <input
              type="number"
              value={gstSettings.rate}
              onChange={onRateChange}
              className="w-full px-3 py-2 border rounded-md"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={gstSettings.isInclusive}
                onChange={() => onTypeChange(true)}
                className="form-radio"
              />
              <span className="ml-2">Inclusive</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={!gstSettings.isInclusive}
                onChange={() => onTypeChange(false)}
                className="form-radio"
              />
              <span className="ml-2">Exclusive</span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [review, setReview] = useState({
    rating: 0,
    nickname: '',
    summary: '',
    review: ''
  });

  // State for editing reviews
  const [editingReview, setEditingReview] = useState(null);
  const [editReviewData, setEditReviewData] = useState({
    rating: 0,
    title: '',
    reviewText: ''
  });

  // State to track helpful/not helpful button clicks for each review
  const [reviewHelpfulness, setReviewHelpfulness] = useState({});

  // Review form handlers
  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReview(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Edit review handlers
  const handleEditReviewChange = (e) => {
    const { name, value } = e.target;
    setEditReviewData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const startEditingReview = (reviewToEdit) => {
    setEditingReview(reviewToEdit.id);
    setEditReviewData({
      rating: reviewToEdit.rating,
      title: reviewToEdit.title || '',
      reviewText: reviewToEdit.reviewText || reviewToEdit.review_text || ''
    });
  };

  const cancelEditingReview = () => {
    setEditingReview(null);
    setEditReviewData({
      rating: 0,
      title: '',
      reviewText: ''
    });
  };

  const handleUpdateReview = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to update your review');
        return;
      }

      // Validate required fields
      if (!editReviewData.rating || editReviewData.rating < 1) {
        toast.error('Please select a rating');
        return;
      }

      if (!editReviewData.reviewText || editReviewData.reviewText.trim().length < 5) {
        toast.error('Please write a review with at least 5 characters');
        return;
      }

      const updateData = {
        rating: parseInt(editReviewData.rating),
        reviewText: editReviewData.reviewText.trim(),
        title: editReviewData.title?.trim() || 'Review'
      };

      console.log('Updating review:', updateData);
      console.log('Review ID:', reviewId);

      await axios.put(`${BASE_URL}/api/reviews/${reviewId}`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success('Review updated successfully!');
      setEditingReview(null);
      setEditReviewData({ rating: 0, title: '', reviewText: '' });
      // Refetch reviews to show the updated review
      refetchReviews();
    } catch (error) {
      console.error('Error updating review:', error);
      if (error.response?.status === 401) {
        toast.error('Please log in to update your review');
      } else if (error.response?.status === 403) {
        toast.error('You can only update your own reviews');
      } else if (error.response?.status === 404) {
        toast.error('Review not found');
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Invalid review data');
      } else {
        toast.error('Are you see the review');
      }
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to submit a review');
        return;
      }

      // Validate required fields
      if (!review.rating || review.rating < 1) {
        toast.error('Please select a rating');
        return;
      }

      if (!review.review || review.review.trim().length < 10) {
        toast.error('Please write a review with at least 10 characters');
        return;
      }

      const reviewData = {
        rating: parseInt(review.rating),
        reviewText: review.review.trim(),
        title: review.summary?.trim() || 'Review'
      };

      console.log('Submitting review:', reviewData);
      console.log('Product ID:', product.id);
      console.log('URL:', `${BASE_URL}/api/reviews/products/${product.id}/reviews`);

      await axios.post(`${BASE_URL}/api/reviews/products/${product.id}/reviews`, reviewData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
      setReview({ rating: 0, nickname: '', summary: '', review: '' });
      // Refetch reviews to show the new review
      refetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      if (error.response?.status === 401) {
        toast.error('Please log in to submit a review');
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Invalid review data');
      } else {
        toast.error('Failed to submit review');
      }
    }
  };

  // Utility function to check if current user owns the review
  const isCurrentUserReview = (review) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      return currentUser.id && (review.userId === currentUser.id || review.user?.id === currentUser.id);
    } catch {
      return false;
    }
  };

  // Handlers for helpful/not helpful buttons
  const handleHelpfulClick = (reviewId) => {
    setReviewHelpfulness(prev => ({
      ...prev,
      [reviewId]: prev[reviewId] === 'helpful' ? null : 'helpful'
    }));
  };

  const handleNotHelpfulClick = (reviewId) => {
    setReviewHelpfulness(prev => ({
      ...prev,
      [reviewId]: prev[reviewId] === 'not-helpful' ? null : 'not-helpful'
    }));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]); // Scroll to top when productId changes

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
    
    // Check max order quantity limit
    const maxOrderQuantity = product?.maxOrderQuantity || product?.max_order_quantity;
    if (maxOrderQuantity && newQuantity > maxOrderQuantity) {
      toast.error(`Maximum order quantity is ${maxOrderQuantity} for this product`);
      return;
    }
    
    // Check stock availability (consider selected size stock if applicable)
    let stockQuantity = product?.stockQuantity || product?.stock_quantity || 0;
    const hasNewSizes = product?.productSizes && product.productSizes.length > 0;
    if (hasNewSizes && selectedSize) {
      const sizeEntry = product.productSizes.find(s => s.size_value === selectedSize);
      if (sizeEntry) {
        stockQuantity = sizeEntry.stock_quantity ?? 0;
      }
    }
    if (newQuantity > stockQuantity) {
      toast.error(`Only ${stockQuantity} items available in stock${hasNewSizes && selectedSize ? ` for size ${selectedSize}` : ''}`);
      return;
    }
    
    setQuantity(newQuantity);
    setCartLimitMessage(''); // Clear cart limit message when quantity changes
  };

  const checkAuthAndExecute = (actionCallback, actionDetails) => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (token && user?.role === 'customer') {
      // Reset size error if showing
      setShowSizeError(false);
      actionCallback();
    } else {
      navigate('/customer/cart', { state: { from: location.pathname, action: actionDetails } });
    }
  };

  const handleAddToCart = async () => {
    // Guests are allowed to add to cart. We'll only require login at checkout.

    // Check if size selection is required (either legacy size field or new productSizes)
    const hasLegacySizes = product?.size && typeof product.size === 'string' && product.size.trim().length > 0;
    const hasNewSizes = product?.productSizes && product.productSizes.length > 0;
    const hasSizes = hasLegacySizes || hasNewSizes;

    console.log('ProductDetails - Size check:', {
      hasLegacySizes,
      hasNewSizes,
      hasSizes,
      productSize: product?.size,
      productSizes: product?.productSizes,
      selectedSize
    });

    if (hasSizes && !selectedSize) {
      console.log('ProductDetails - Size selection required but not provided');
      setShowSizeError(true);
      // Scroll to size selection
      const sizeElement = document.querySelector('.size-selection');
      if (sizeElement) {
        sizeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast.error('Please select a size for this item');
      return;
    }

    // Validate selected size stock and availability
    if (hasNewSizes && selectedSize) {
      const sizeEntry = product.productSizes.find(s => s.size_value === selectedSize);
      if (!sizeEntry) {
        toast.error('Selected size not found');
        return;
      }
      if (!sizeEntry.is_available || (sizeEntry.stock_quantity ?? 0) <= 0) {
        toast.error('Selected size is out of stock');
        return;
      }
    }

    // Check existing cart quantity before adding
    const maxOrderQuantity = product?.maxOrderQuantity || product?.max_order_quantity;
    if (maxOrderQuantity) {
      // Find existing cart items for this product (considering size if applicable)
      const existingCartItems = cart.filter(item => {
        const isSameProduct = item.productId === product.id || item.id === product.id;
        const isSameSize = hasSizes ? item.selectedSize === selectedSize : true;
        return isSameProduct && isSameSize;
      });
      
      const currentCartQuantity = existingCartItems.reduce((total, item) => total + (item.quantity || 0), 0);
      const newTotalQuantity = currentCartQuantity + quantity;
      
      console.log('ProductDetails - Cart quantity check:', {
        productId: product.id,
        selectedSize,
        currentCartQuantity,
        quantityToAdd: quantity,
        newTotalQuantity,
        maxOrderQuantity
      });
      
      if (newTotalQuantity > maxOrderQuantity) {
        const remainingAllowed = maxOrderQuantity - currentCartQuantity;
        if (remainingAllowed <= 0) {
          setCartLimitMessage(`You already have the maximum quantity (${maxOrderQuantity}) of "${product.productName || product.name}" in your cart`);
        } else {
          setCartLimitMessage(`You can only add ${remainingAllowed} more of "${product.productName || product.name}" to your cart (max: ${maxOrderQuantity})`);
        }
        return;
      }
    }

    // Clear any previous size errors and cart limit messages
    setShowSizeError(false);
    setCartLimitMessage('');

    // Add to cart with size if it's a fashion product
    // Ensure the product object has the correct structure for the cart
    const productForCart = {
      id: product.id,
      name: product.productName || product.name || 'Unnamed Product',
      price: currentPrice ? currentPrice.price : product.price, // Use size-based price if available
      mrp: currentPrice ? currentPrice.mrp : product.mrp, // Use size-based MRP if available
      size: product.size,
      image: productImages[0] || getFallbackImage(),
      category: product.category,
      selectedSizePrice: currentPrice, // Include size pricing info for reference
      ...product // Include all other product properties
    };

    console.log('ProductDetails - Calling addToCart with:', { productForCart, quantity, selectedSize });

    const success = await addToCart(productForCart, quantity, selectedSize);
    if (success) {
      toast.success(`${product.productName || product.name || 'Product'} added to cart successfully!`);
    } else {
      console.log('ProductDetails - addToCart returned false');
    }
  };

  // NEW: Handler function for the favorites click
  const handleToggleFavoriteClick = () => {
    if (product) {
      toggleFavorite(product.productName);
    }
  };

  const handleProceedToCheckout = () => {
    // Check if size selection is required and selected (either legacy size field or new productSizes)
    const hasLegacySizes = product?.size && typeof product.size === 'string' && product.size.trim().length > 0;
    const hasNewSizes = product?.productSizes && product.productSizes.length > 0;
    const hasSizes = hasLegacySizes || hasNewSizes;

    if (hasSizes && !selectedSize) {
      setShowSizeError(true);
      return;
    }

    // Validate selected size stock and availability before proceeding
    if (hasNewSizes && selectedSize) {
      const sizeEntry = product.productSizes.find(s => s.size_value === selectedSize);
      if (!sizeEntry || !sizeEntry.is_available || (sizeEntry.stock_quantity ?? 0) <= 0) {
        toast.error('Selected size is out of stock');
        return;
      }
    }

    // Check existing cart quantity before proceeding to checkout
    const maxOrderQuantity = product?.maxOrderQuantity || product?.max_order_quantity;
    if (maxOrderQuantity) {
      // Find existing cart items for this product (considering size if applicable)
      const existingCartItems = cart.filter(item => {
        const isSameProduct = item.productId === product.id || item.id === product.id;
        const isSameSize = hasSizes ? item.selectedSize === selectedSize : true;
        return isSameProduct && isSameSize;
      });
      
      const currentCartQuantity = existingCartItems.reduce((total, item) => total + (item.quantity || 0), 0);
      const newTotalQuantity = currentCartQuantity + quantity;
      
      if (newTotalQuantity > maxOrderQuantity) {
        const remainingAllowed = maxOrderQuantity - currentCartQuantity;
        if (remainingAllowed <= 0) {
          setCartLimitMessage(`You already have the maximum quantity (${maxOrderQuantity}) of "${product.productName || product.name}" in your cart`);
        } else {
          setCartLimitMessage(`You can only add ${remainingAllowed} more of "${product.productName || product.name}" to your cart (max: ${maxOrderQuantity})`);
        }
        return;
      }
    }

    const checkoutDetails = {
      actionType: 'PROCEED_TO_CHECKOUT',
      productId: product?.id,
      quantity: quantity,
      selectedSize: selectedSize,
      productName: product?.productName || product?.productname || product?.name || 'Unnamed Product',
      price: product?.price,
      image: productImages[0] || getFallbackImage(),
      category: product?.categoryName || product?.category || 'Unknown'
    };
    // Guests are allowed to buy now: add to cart and send only this item to Checkout
    (async () => {
      if (!product) {
        toast.error('Cannot proceed to checkout: Product details are missing.');
        return;
      }

      // Add to cart and then navigate to checkout
      const productForCart = {
        id: product.id,
        name: product.productName || product.name || 'Unnamed Product',
        price: currentPrice ? currentPrice.price : product.price, // Use size-based price if available
        mrp: currentPrice ? currentPrice.mrp : product.mrp, // Use size-based MRP if available
        size: product.size,
        image: productImages[0] || getFallbackImage(),
        category: product.category,
        selectedSizePrice: currentPrice, // Include size pricing info for reference
        ...product // Include all other product properties
      };

      const success = await addToCart(productForCart, quantity, selectedSize);
      if (!success) return;

      // Ensure the cart is refreshed so we can pick the exact item
      const updatedCart = await fetchCart();

      // Find the corresponding cart item by productId and selectedSize from the fresh cart data
      const productIdNum = product.id;
      const size = selectedSize || null;
      
      // Use the returned cart data if available, otherwise fall back to state
      const cartToSearch = updatedCart || cart;
      let cartItem = cartToSearch.find(ci => ci.productId === productIdNum && (size ? ci.selectedSize === size : true));

      // Fallback: construct a minimal item compatible with Checkout
      if (!cartItem) {
        const p = productForCart;
        cartItem = {
          id: p.id,
          productId: p.id,
          quantity: quantity,
          price: parseFloat(p.price) || 0,
          gst: parseFloat(p.gst) || 0,
          selectedSize: size,
          priceBeforeGST: parseFloat(p.priceBeforeGST) || parseFloat(p.price) || 0,
          gstAmount: parseFloat(p.gstAmount) || 0,
          finalPrice: parseFloat(p.finalPrice) || parseFloat(p.price) || 0,
          name: p.name || p.productName || 'Item',
          // Provide image for Checkout page when navigating directly via Buy Now
          image: (productImages && productImages.length > 0 ? productImages[0] : getFallbackImage())
        };
      }

      // Product is now added to cart and will persist there
      // Navigate to checkout with this specific item
      navigate('/customer/checkout', { state: { selectedItems: [cartItem] } });
    })();
  };

  const handleThumbnailClick = (index) => setSelectedImage(index);

  const openFullscreenModal = () => {
    setShowFullscreenModal(true);
    document.body.style.overflow = 'hidden';
  };

  const closeFullscreenModal = () => {
    setShowFullscreenModal(false);
    document.body.style.overflow = 'auto';
    setFullscreenZoom(1);
    setFullscreenPosition({ x: 0, y: 0 });
  };

  const handleFullscreenZoom = (direction) => {
    if (direction === 'in' && fullscreenZoom < 3) {
      setFullscreenZoom(prev => Math.min(3, prev + 0.5));
    } else if (direction === 'out' && fullscreenZoom > 1) {
      setFullscreenZoom(prev => Math.max(1, prev - 0.5));
    } else if (direction === 'reset') {
      setFullscreenZoom(1);
      setFullscreenPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e) => {
    if (fullscreenZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - fullscreenPosition.x, y: e.clientY - fullscreenPosition.y });
    }
  };

  const handleFullscreenMouseMove = (e) => {
    if (isDragging && fullscreenZoom > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Calculate boundaries based on zoom level
      const imageWidth = window.innerWidth;
      const imageHeight = window.innerHeight;
      const zoomedWidth = imageWidth * fullscreenZoom;
      const zoomedHeight = imageHeight * fullscreenZoom;

      // Maximum drag distance to keep image visible
      const maxX = (zoomedWidth - imageWidth) / 2;
      const maxY = (zoomedHeight - imageHeight) / 2;

      setFullscreenPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const navigateFullscreenImage = (direction) => {
    setSelectedImage(prev => {
      if (direction === 'next') return (prev + 1) % productImages.length;
      return (prev - 1 + productImages.length) % productImages.length;
    });
    // Reset zoom when changing images
    setFullscreenZoom(1);
    setFullscreenPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showFullscreenModal) return;
      switch (e.key) {
        case 'Escape': closeFullscreenModal(); break;
        case 'ArrowLeft': navigateFullscreenImage('prev'); break;
        case 'ArrowRight': navigateFullscreenImage('next'); break;
        case '+': handleFullscreenZoom('in'); break;
        case '-': handleFullscreenZoom('out'); break;
        case '0': handleFullscreenZoom('reset'); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullscreenModal, productImages.length]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('mousemove', handleFullscreenMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (showFullscreenModal) {
      window.addEventListener('mousemove', handleFullscreenMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleFullscreenMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [showFullscreenModal, isDragging, dragStart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-200 h-96 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-24 bg-gray-200 rounded w-full"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white relative z-0">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Product Not Found</h2>
          <p className="text-gray-400 mb-6">
            {error.message || 'The product you are looking for does not exist or has been removed.'}
          </p>
          <Link
            to={getBackUrl()}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white relative z-0 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Product Not Found</h1>
          <p className="mb-6 text-gray-400">The product you're looking for doesn't exist or has been removed.</p>
          <Link to="/products" className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-0">
      {/* <BackgroundParticles /> */}
      <div className="min-h-screen text-gray-300 relative z-10" style={{ backgroundColor: 'black' }}>
        {/* Header Navigation */}
        <div className="bg-black-800 border-b border-gray-700 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link
                to={getBackUrl()}
                className="flex items-center text-sm font-medium text-gray-300 hover:text-blue-400 transition-colors group"
              >
                <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                Back to {fromSearch ? 'search results' : 'shop'}
              </Link>

              {/* Breadcrumb */}
              <nav className="hidden md:flex z-10">
                <ol className="flex items-center space-x-2 text-sm text-gray-400">
                                    <li><Link to="/" className="hover:text-blue-400">Home</Link></li>
                  <li><ChevronRight size={16} className="text-gray-400" /></li>
                  {product?.categoryName && (
                    <>
                                            <li><Link to={`/products?category=${product.category}`} className="hover:text-blue-400">{product.categoryName}</Link></li>
                      <li><ChevronRight size={16} className="text-gray-400" /></li>
                    </>
                  )}
                  <li className="text-gray-200 truncate max-w-[200px]">{product?.productName || 'Product'}</li>
                </ol>
              </nav>
            </div>
          </div>
        </div>

        {/* Fullscreen Image Modal */}
        {showFullscreenModal && (
          <FocusTrap>
            <div
              className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center "
              onClick={(e) => e.target === e.currentTarget && closeFullscreenModal()}
            >
              <button
                className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full bg-black bg-opacity-50 transition-all z-50"
                onClick={closeFullscreenModal}
              >
                <X size={24} />
              </button>

              {productImages.length > 1 && (
                <>
                  <button
                    className="absolute left-4 text-white hover:text-gray-300 p-2 rounded-full bg-black bg-opacity-50 transition-all z-50"
                    onClick={() => navigateFullscreenImage('prev')}
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <button
                    className="absolute right-4 text-white hover:text-gray-300 p-2 rounded-full bg-black bg-opacity-50 transition-all z-50"
                    onClick={() => navigateFullscreenImage('next')}
                  >
                    <ChevronRight size={32} />
                  </button>
                </>
              )}

              <div
                className="relative"
                onMouseDown={handleMouseDown}
                ref={fullscreenImageRef}
              >
                <img
                  src={productImages[selectedImage] || getFallbackImage()}
                  alt={`${product?.productName || 'Product'} - Full view`}
                  className="max-h-[80vh] max-w-[80vw] object-contain"
                  style={{
                    transform: `scale(${fullscreenZoom}) translate(${fullscreenPosition.x / fullscreenZoom}px, ${fullscreenPosition.y / fullscreenZoom}px)`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease'
                  }}
                  draggable="false"
                />
              </div>
            </div>
          </FocusTrap>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column - Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative">
                <div
                  className="aspect-square bg-white rounded-lg overflow-hidden cursor-pointer border border-gray-700"
                  onClick={openFullscreenModal}
                >
                  <img
                    src={productImages[selectedImage] || getFallbackImage()}
                    alt={product?.productName || 'Product image'}
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.src = getFallbackImage(); }}
                  />
                  <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-2 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                    <ZoomIn size={20} className="text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {productImages.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {productImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => handleThumbnailClick(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === index ? 'border-blue-500' : 'border-gray-700 hover:border-gray-600'
                        }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.target.src = getFallbackImage(); }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Product Details */}
            <div className="bg-black-800/50 p-6 rounded-lg">
              <div className="space-y-6">
                {/* Brand */}
                {product?.brand && (
                  <div className="text-blue-400 font-medium text-sm uppercase tracking-wide">
                    {product.brand}
                  </div>
                )}

                {/* Product Title */}
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                    {product?.productName || 'Product Name'}
                  </h1>
                  
                  {/* Stock Status Display */}
                  <div className="mt-3">
                    {(() => {
                      const stockQuantity = product?.stockQuantity || product?.stock_quantity || 0;
                      const lowStockThreshold = product?.lowStockThreshold || product?.low_stock_threshold || 5;
                      const isActive = product?.isActive !== undefined ? product.isActive : (product?.is_active !== undefined ? product.is_active : true);
                      
                      if (!isActive) {
                        return (
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300">
                            <span className="w-2 h-2 mr-2 bg-gray-400 rounded-full"></span>
                            Product Unavailable
                          </div>
                        );
                      } else if (stockQuantity === 0) {
                        return (
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-300">
                            <span className="w-2 h-2 mr-2 bg-red-400 rounded-full"></span>
                            Out of Stock
                          </div>
                        );
                      } else if (stockQuantity <= lowStockThreshold) {
                        return (
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                            <span className="w-2 h-2 mr-2 bg-yellow-400 rounded-full"></span>
                            Low Stock
                          </div>
                        );
                      } else {
                        return (
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300">
                            <span className="w-2 h-2 mr-2 bg-green-400 rounded-full"></span>
                            In Stock
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                {/* Payment Types Display */}
                <div className="mt-2">
                  {(() => {
                    const allow_cod = product?.allow_cod !== undefined ? !!product.allow_cod : (product?.allowCOD ?? true);
                    const allow_card = product?.allow_card !== undefined ? !!product.allow_card : (product?.allowCard ?? true);
                    const allow_upi = product?.allow_upi !== undefined ? !!product.allow_upi : (product?.allowUPI ?? true);
                    const allow_advance = product?.allow_advance !== undefined ? !!product.allow_advance : (product?.allowAdvance ?? true);
                    
                    const paymentMethods = [];
                    if (allow_cod) paymentMethods.push('COD');
                    if (allow_card) paymentMethods.push('Card');
                    if (allow_upi) paymentMethods.push('UPI');
                    if (allow_advance) paymentMethods.push('Advance');
                    
                    if (paymentMethods.length > 0) {
                      return (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Available Payments:</span>
                          <div className="flex flex-wrap gap-1">
                            {paymentMethods.map((method, index) => (
                              <span 
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-300"
                              >
                                {method}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

              {/* Rating and Reviews */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${i < Math.floor(reviewStats.averageRating || product?.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-200">
                    {(reviewStats.averageRating || product?.rating || 0).toFixed(1)}
                  </span>
                </div>
                {reviewStats.totalReviews > 0 && (
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="text-sm text-blue-600 hover:underline cursor-pointer"
                  >
                    {reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}
                  </button>
                )}
                {reviewStats.totalReviews === 0 && !reviewsError && (
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="text-sm text-blue-600 hover:underline cursor-pointer"
                  >
                    Be the first to review
                  </button>
                )}
                {reviewsError === 'Please log in to view reviews' && (
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="text-sm text-blue-600 hover:underline cursor-pointer"
                  >
                    View reviews
                  </button>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1">
                {/* Dynamic Price Display with Size-based Pricing */}
                <PriceDisplay product={product} />
              </div>

              {/* Available Sizes */}
              {(product?.size || (product?.productSizes && product.productSizes.length > 0)) && (
                <div className="mt-2 mb-2 size-selection">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">Size:</span>
                      <span className="text-sm font-medium text-white">{selectedSize || '-'}</span>

                      {showSizeError && (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
                          Please select a size
                        </span>
                      )}

                      <div className="flex flex-wrap gap-2.5">
                        {/* Show new sizes from sizes table if available */}
                        {product?.productSizes && product.productSizes.length > 0 ? (
                          // Group sizes by type for better display (show all sizes; disable when unavailable/out of stock)
                          Object.entries(
                            product.productSizes
                              .reduce((acc, size) => {
                                if (!acc[size.size_type]) acc[size.size_type] = [];
                                acc[size.size_type].push(size);
                                return acc;
                              }, {})
                          ).map(([sizeType, sizes]) => (
                            <div key={sizeType} className="flex flex-col gap-1">
                              <span className="text-xs text-gray-200 capitalize">{sizeType}:</span>
                              <div className="flex flex-wrap gap-1">
                                {sizes
                                  .sort((a, b) => a.display_order - b.display_order)
                                  .map((size) => {
                                    const isDisabled = !size.is_available || (size.stock_quantity ?? 0) <= 0;
                                    return (
                                      <button
                                        key={size.id}
                                        onClick={() => handleSizeSelection(size.size_value)}
                                        disabled={isDisabled}
                                        title={isDisabled ? 'Out of stock' : ''}
                                        className={`min-w-[40px] h-7 px-2 text-xs font-medium rounded border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                                          ${selectedSize === size.size_value
                                          ? 'bg-blue-50 border-blue-500 text-blue-600'
                                          : 'bg-black-700 border-gray-600 text-gray-200 hover:bg-black-600 hover:border-gray-500'
                                        }`}
                                      >
                                        {size.size_value}
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          ))
                        ) : (
                          // Fallback to legacy size field
                          product.size.split(',').map((size, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSizeSelection(size.trim())}
                              className={`min-w-[40px] h-7 px-2 text-xs font-medium rounded border transition-all duration-200
                                  ${selectedSize === size.trim()
                                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-black-700 border-gray-600 text-gray-200 hover:bg-black-600 hover:border-gray-500'
                                }`}
                            >
                              {size.trim()}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Features */}
              {product?.description && (
                <div className="bg-black-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">About this product</h3>
                  <p className="text-gray-200 text-sm leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Quantity and Actions */}
              <div className="space-y-4">
                {/* Quantity Selector */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-200">Quantity:</span>
                    <div className="flex items-center border border-gray-600 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                        className="p-2 hover:bg-black-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="px-4 py-2 text-center min-w-[50px]">{quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={(() => {
                          const maxOrderQuantity = product?.maxOrderQuantity || product?.max_order_quantity;
                          // Determine effective stock considering selected size
                          let stockQuantity = product?.stockQuantity || product?.stock_quantity || 0;
                          const hasNewSizes = product?.productSizes && product.productSizes.length > 0;
                          if (hasNewSizes && selectedSize) {
                            const sizeEntry = product.productSizes.find(s => s.size_value === selectedSize);
                            if (sizeEntry) stockQuantity = sizeEntry.stock_quantity ?? 0;
                          }
                          return (maxOrderQuantity && quantity >= maxOrderQuantity) || quantity >= stockQuantity;
                        })()}
                        className="p-2 hover:bg-black-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  {/* Show quantity limits info */}
                  <div className="text-xs text-gray-400">
                    {(() => {
                      const maxOrderQuantity = product?.maxOrderQuantity || product?.max_order_quantity;
                      const stockQuantity = product?.stockQuantity || product?.stock_quantity || 0;
                      const minOrderQuantity = product?.minOrderQuantity || product?.min_order_quantity || 1;
                      
                      // Calculate current cart quantity for this product
                      const hasLegacySizes = product?.size && typeof product.size === 'string' && product.size.trim().length > 0;
                      const hasNewSizes = product?.productSizes && product.productSizes.length > 0;
                      const hasSizes = hasLegacySizes || hasNewSizes;
                      
                      const existingCartItems = cart.filter(item => {
                        const isSameProduct = item.productId === product.id || item.id === product.id;
                        const isSameSize = hasSizes ? item.selectedSize === selectedSize : true;
                        return isSameProduct && isSameSize;
                      });
                      const currentCartQuantity = existingCartItems.reduce((total, item) => total + (item.quantity || 0), 0);
                      
                      let info = [];
                      if (minOrderQuantity > 1) {
                        info.push(`Min: ${minOrderQuantity}`);
                      }
                      if (maxOrderQuantity) {
                        const remainingAllowed = maxOrderQuantity - currentCartQuantity;
                        if (currentCartQuantity > 0) {
                          info.push(`Max: ${maxOrderQuantity} (${remainingAllowed} more allowed)`);
                        } else {
                          info.push(`Max: ${maxOrderQuantity}`);
                        }
                      }
                      // if (stockQuantity > 0) {
                      //   info.push(`Stock: ${stockQuantity}`);
                      // }
                      if (currentCartQuantity > 0) {
                        info.push(`In Cart: ${currentCartQuantity}`);
                      }
                      
                      return info.length > 0 ? info.join(' • ') : '';
                    })()}
                  </div>
                  
                  {/* Cart Limit Message */}
                  {cartLimitMessage && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800 font-medium">
                            {cartLimitMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={
                      // Check stock availability
                      (() => {
                        const stockQuantity = product?.stockQuantity || product?.stock_quantity || 0;
                        const isActive = product?.isActive !== undefined ? product.isActive : (product?.is_active !== undefined ? product.is_active : true);
                        return !isActive || stockQuantity === 0;
                      })() ||
                      // Check size selection requirement
                      (((product?.size && typeof product.size === 'string' && product.size.trim().length > 0) || (product?.productSizes && product.productSizes.length > 0)) && !selectedSize)
                    }
                    className={`w-full ${
                      (() => {
                        const stockQuantity = product?.stockQuantity || product?.stock_quantity || 0;
                        const isActive = product?.isActive !== undefined ? product.isActive : (product?.is_active !== undefined ? product.is_active : true);
                        const isOutOfStock = !isActive || stockQuantity === 0;
                        const needsSize = ((product?.size && typeof product.size === 'string' && product.size.trim().length > 0) || (product?.productSizes && product.productSizes.length > 0)) && !selectedSize;
                        
                        if (isOutOfStock || needsSize) {
                          return 'bg-gray-500 cursor-not-allowed';
                        } else {
                          return 'bg-blue-600 hover:bg-blue-700';
                        }
                      })()
                    } text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg`}
                  >
                    <ShoppingCart size={18} className="mr-2" />
                    {(() => {
                      const stockQuantity = product?.stockQuantity || product?.stock_quantity || 0;
                      const isActive = product?.isActive !== undefined ? product.isActive : (product?.is_active !== undefined ? product.is_active : true);
                      const isOutOfStock = !isActive || stockQuantity === 0;
                      const needsSize = ((product?.size && typeof product.size === 'string' && product.size.trim().length > 0) || (product?.productSizes && product.productSizes.length > 0)) && !selectedSize;
                      
                      if (isOutOfStock) {
                        return !isActive ? 'Product Unavailable' : 'Out of Stock';
                      } else if (needsSize) {
                        return 'Please Select Size';
                      } else {
                        return 'Add to Cart';
                      }
                    })()}
                  </button>
                  
                  <button
                    onClick={handleProceedToCheckout}
                    disabled={
                      // Check stock availability
                      (() => {
                        const stockQuantity = product?.stockQuantity || product?.stock_quantity || 0;
                        const isActive = product?.isActive !== undefined ? product.isActive : (product?.is_active !== undefined ? product.is_active : true);
                        return !isActive || stockQuantity === 0;
                      })()
                    }
                    className={`w-full ${
                      (() => {
                        const stockQuantity = product?.stockQuantity || product?.stock_quantity || 0;
                        const isActive = product?.isActive !== undefined ? product.isActive : (product?.is_active !== undefined ? product.is_active : true);
                        const isOutOfStock = !isActive || stockQuantity === 0;
                        
                        if (isOutOfStock) {
                          return 'bg-gray-500 cursor-not-allowed';
                        } else {
                          return 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600';
                        }
                      })()
                    } text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg`}
                  >
                    <CreditCard size={18} className="mr-2" />
                    {(() => {
                      const stockQuantity = product?.stockQuantity || product?.stock_quantity || 0;
                      const isActive = product?.isActive !== undefined ? product.isActive : (product?.is_active !== undefined ? product.is_active : true);
                      const isOutOfStock = !isActive || stockQuantity === 0;
                      
                      if (isOutOfStock) {
                        return !isActive ? 'Product Unavailable' : 'Out of Stock';
                      } else {
                        return 'Buy Now';
                      }
                    })()}
                  </button>
                </div>

                {/* Additional Actions */}
                <div className="pt-4">
                  <button
                    onClick={handleToggleFavoriteClick}
                    disabled={isLoadingFavorites}
                    className="w-full border border-gray-600 hover:bg-black-700/50 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center disabled:opacity-50"
                  >
                    <Heart size={18} className={`mr-2 ${isFavorited ? 'text-red-500 fill-current' : ''}`} />
                    {isLoadingFavorites ? 'Updating...' : isFavorited ? 'In Favorites' : 'Add to Favorites'}
                  </button>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-blue-900/20 border border-blue-800/30 p-4 rounded-lg space-y-3">
                <div className="flex items-center text-sm text-blue-300">
                  <Truck size={16} className="mr-2" />
                  <span className="font-medium">Free delivery</span>
                  <span className="ml-1 text-gray-400">on orders over ₹1000</span>
                </div>
                <div className="flex items-center text-sm text-blue-300">
                  <RefreshCcw size={16} className="mr-2" />
                  <span className="font-medium">Easy returns</span>
                  <span className="ml-1 text-gray-400">within 30 days</span>
                </div>
                <div className="flex items-center text-sm text-blue-300">
                  <ShieldCheck size={16} className="mr-2" />
                  <span className="font-medium">Secure packaging</span>
                  <span className="ml-1 text-gray-400">for safe delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Product Details Tabs */}
          <div className="mt-12">
            <div className="bg-black-800/50 rounded-lg p-1 flex space-x-1">
              {['specifications', 'reviews'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full py-2.5 text-sm font-medium leading-5 rounded-lg transition-colors focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60
                    ${activeTab === tab
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-300 hover:bg-white/[0.12] hover:text-white'
                    }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="py-8">

              {activeTab === 'specifications' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Specifications</h3>
                  {product?.specifications?.length > 0 ? (
                    <div className="bg-black-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          {product.specifications.map((spec, index) => {
                            const keyName = spec.SpecificationKey?.keyName || spec.key || spec.keyName || 'Specification';
                            const value = spec.value || spec.spec_value || 'N/A';
                            return (
                              <tr key={index} className={`${index % 2 === 0 ? 'bg-black-700/40' : ''} transition-colors hover:bg-black-700/60`}>
                                <td className="px-6 py-4 text-sm font-medium text-gray-300 w-1/3">
                                  {keyName}
                                </td>
                                <td className="px-6 py-4 text-sm text-white">
                                  {value}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-200">No specifications available for this product.</p>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Customer Reviews</h3>
                    {/* <button
                        onClick={() => setShowReviewForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Write a Review
                      </button> */}
                  </div>

                  {/* Review Statistics */}
                  {reviewStats.totalReviews > 0 && (
                    <div className="bg-black-800/50 border border-gray-700/50 p-6 rounded-lg mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Overall Rating */}
                        <div className="text-center">
                          <div className="text-3xl font-bold text-white mb-2">
                            {reviewStats.averageRating.toFixed(1)}
                          </div>
                          <div className="flex justify-center items-center mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={20}
                                className={`${i < Math.floor(reviewStats.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <div className="text-sm text-gray-200">
                            Based on {reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Rating Distribution */}
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <div key={rating} className="flex items-center space-x-2">
                              <span className="text-sm font-medium w-8">{rating}★</span>
                                                            <div className="flex-1 bg-black-600 rounded-full h-2">
                                <div
                                  className="bg-yellow-400 h-2 rounded-full"
                                  style={{
                                    width: `${reviewStats.totalReviews > 0 ? (reviewStats.ratingDistribution[rating] / reviewStats.totalReviews) * 100 : 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-200 w-8">
                                {reviewStats.ratingDistribution[rating]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reviews List */}
                  {reviewsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse border border-gray-700 rounded-lg p-6">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-24"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : reviewsError ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="mx-auto h-12 w-12 text-gray-200 mb-4" />
                      {/* <p className="text-gray-400 mb-2">Are you see the reviews</p> */}
                      <p className="text-gray-200 text-sm">{reviewsError}</p>
                      {/* <button
                          onClick={refetchReviews}
                          className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Try again
                        </button> */}
                    </div>
                  ) : reviewsError === 'Please log in to view reviews' ? (
                    <div className="text-center py-12">
                      <div className="text-gray-200 mb-4">
                        <Star size={48} className="mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Login Required</h3>
                      <p className="text-gray-200 mb-4">Please log in to view and write reviews for this product.</p>
                      <button
                        onClick={() => setIsLoginModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Log In to View Reviews
                      </button>
                    </div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review, index) => (
                        <div key={review.id || index} className="bg-black-800/40 border border-gray-700/60 rounded-lg p-6 transition-all hover:shadow-lg hover:border-blue-500/50">
                          {/* Review Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              {/* User Avatar */}
                              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {(review.user?.firstname || review.user?.name || review.user?.username || review.userName || 'Anonymous').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-white">
                                  {review.user?.firstname && review.user?.lastname
                                    ? `${review.user.firstname} ${review.user.lastname}`
                                    : review.user?.firstname
                                      ? review.user.firstname
                                      : review.user?.name || review.user?.username || review.userName || 'Anonymous User'}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        size={14}
                                        className={`${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-200">
                                    {new Date(review.createdAt || review.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Edit button - only show for user's own reviews */}
                            {isCurrentUserReview(review) && editingReview !== review.id && (
                              <button
                                onClick={() => startEditingReview(review)}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>

                          {/* Review Content or Edit Form */}
                          {editingReview === review.id ? (
                            /* Edit Form */
                            <div className="space-y-4">
                              {/* Rating Selection */}
                              <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                  Rating *
                                </label>
                                <div className="flex items-center space-x-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setEditReviewData(prev => ({ ...prev, rating: star }))}
                                      className="focus:outline-none"
                                    >
                                      <Star
                                        size={24}
                                        className={`${star <= editReviewData.rating
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-gray-300 hover:text-yellow-400'
                                          } transition-colors`}
                                      />
                                    </button>
                                  ))}
                                  <span className="ml-2 text-sm text-gray-200">
                                    ({editReviewData.rating}/5)
                                  </span>
                                </div>
                              </div>

                              {/* Title */}
                              <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                  Title (Optional)
                                </label>
                                <input
                                  type="text"
                                  name="title"
                                  value={editReviewData.title}
                                  onChange={handleEditReviewChange}
                                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Brief summary of your review"
                                />
                              </div>

                              {/* Review Text */}
                              <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                  Review *
                                </label>
                                <textarea
                                  name="reviewText"
                                  value={editReviewData.reviewText}
                                  onChange={handleEditReviewChange}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  placeholder="Share your experience with this product..."
                                  required
                                />
                                <p className="text-xs text-gray-200 mt-1">
                                  Minimum 10 characters ({editReviewData.reviewText.length}/10)
                                </p>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-3 pt-2">
                                <button
                                  onClick={() => handleUpdateReview(review.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                                >
                                  Update Review
                                </button>
                                <button
                                  onClick={cancelEditingReview}
                                  className="bg-gray-200 hover:bg-gray-300 text-gray-200 px-4 py-2 rounded-md font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Display Review */
                            <>
                              {/* Review Title */}
                              {review.title && (
                                <h4 className="font-medium text-white mb-2">{review.title}</h4>
                              )}

                              {/* Review Text */}
                              <p className="text-gray-200 leading-relaxed">
                                {review.reviewText || review.review_text || review.comment || 'No review text provided.'}
                              </p>
                            </>
                          )}

                          {/* Review Actions - only show when not editing */}
                          {editingReview !== review.id && (
                            <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-100">
                              <button
                                onClick={() => handleHelpfulClick(review.id || index)}
                                className={`flex items-center space-x-1 text-sm transition-all duration-200 px-3 py-1.5 rounded-full ${reviewHelpfulness[review.id || index] === 'helpful'
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'text-gray-200 hover:text-green-600 hover:bg-green-50'
                                  }`}
                              >
                                <ThumbsUp size={14} className={reviewHelpfulness[review.id || index] === 'helpful' ? 'fill-current' : ''} />
                                <span>Helpful</span>
                              </button>
                              <button
                                onClick={() => handleNotHelpfulClick(review.id || index)}
                                className={`flex items-center space-x-1 text-sm transition-all duration-200 px-3 py-1.5 rounded-full ${reviewHelpfulness[review.id || index] === 'not-helpful'
                                  ? 'bg-red-100 text-red-700 border border-red-300'
                                  : 'text-gray-200 hover:text-red-600 hover:bg-red-50'
                                  }`}
                              >
                                <ThumbsDown size={14} className={reviewHelpfulness[review.id || index] === 'not-helpful' ? 'fill-current' : ''} />
                                <span>Not helpful</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-200 mb-4">
                        <Star size={48} className="mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">No reviews yet</h3>
                      <p className="text-gray-200 mb-4">Be the first to review this product!</p>
                      {/* <button
                          onClick={() => setShowReviewForm(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          Write the first review
                        </button> */}
                    </div>
                  )}
                </div>
              )}
            </div>


          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 bg-black">
              <h2 className="text-2xl font-bold text-white mb-8">You might also like</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {relatedProducts.map((relatedProduct) => (
                  <Link
                    key={relatedProduct.id}
                    to={`/customer/product/${relatedProduct.id}`}
                    className="group"
                  >
                                        <div className="bg-white-800 border border-white-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
                      <div className="aspect-square overflow-hidden bg-white-800 relative">
                        <img
                          src={relatedProduct.image || getFallbackImage()}
                          alt={relatedProduct.productName || relatedProduct.productname}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.src = getFallbackImage(); }}
                        />
                        {relatedProduct.mrp && parseFloat(relatedProduct.mrp) > parseFloat(relatedProduct.price) && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            {Math.round(((parseFloat(relatedProduct.mrp) - parseFloat(relatedProduct.price)) / parseFloat(relatedProduct.mrp)) * 100)}% OFF
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-medium text-white mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {relatedProduct.productName || relatedProduct.productname}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-white">
                            ₹{(parseFloat(relatedProduct.price || 0)).toLocaleString()}
                          </p>
                          {relatedProduct.mrp && parseFloat(relatedProduct.mrp) > parseFloat(relatedProduct.price) && (
                            <p className="text-sm text-white line-through">
                              ₹{parseFloat(relatedProduct.mrp).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {relatedProduct.brand && (
                          <p className="text-xs text-white mt-1">{relatedProduct.brand}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Review Form Popup */}
        {showReviewForm && (
          <div className="fixed top-20 right-10 bg-white rounded-lg shadow-xl w-[500px] z-50 animate-slideIn">
            <div className="relative p-6">
              <div className="border-b pb-4 mb-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">You're wonderful reviewing:</h2>
                  <button
                    onClick={() => setShowReviewForm(false)}
                    className="text-white-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                <h3 className="text-lg text-gray-400 mt-1">{product?.name}</h3>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">
                    Your Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleReviewChange({ target: { name: 'rating', value: star } })}
                        className={`text-2xl ${review.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
};

export default ProductDetail;
