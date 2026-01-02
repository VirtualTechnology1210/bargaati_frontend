import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ArrowRightIcon } from 'lucide-react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { BASE_URL } from '../../util';
import { useCart } from '../context/CartContext';
import banner from '../assets/banner.png';

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

const ProductCard = ({ product, categoryMap }) => {
  const { id, productName, imageUrl, price, rating, category, brand, mrp, gst = 18, gstType = 'exclusive' } = product;
  const navigate = useNavigate();

  // Calculate prices with GST
  const priceDetails = calculatePrices(price, mrp, gst, gstType === 'inclusive');
  const hasDiscount = priceDetails.mrp > priceDetails.finalPrice;
  
  // Add GST information display
  const gstInfo = gstType === 'inclusive' 
    ? `Price inclusive of ${gst}% GST (₹${priceDetails.gstAmount})` 
    : `+${gst}% GST (₹${priceDetails.gstAmount})`;

  const fullImageUrl = imageUrl?.startsWith('http') 
    ? imageUrl 
    : `${BASE_URL}${imageUrl}`;
  
  const categoryName = categoryMap[category] || 'Uncategorized';
  
  const checkAuthAndExecute = (action) => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (token && user && user.role === 'customer') {
      action();
    } else {
    }
  };


  

  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col group transition-all duration-300 hover:shadow-lg relative">
      <Link to={`/customer/product/${id}`} className="relative aspect-square overflow-hidden bg-gray-50">
        <img 
          src={fullImageUrl} 
          alt={productName} 
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2 sm:p-0"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://placehold.co/300x300/EEE/999?text=No+Image';
          }}
        />
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {priceDetails.discount}% OFF
          </div>
        )}
      </Link>

      <div className="p-2 sm:p-4 flex flex-col flex-grow">
        {brand && <p className="text-xs text-gray-500 mb-0.5 sm:mb-1">{brand}</p>}
        <h3 className="font-semibold text-xs sm:text-sm text-gray-800 mb-0.5 sm:mb-1 flex-grow min-h-[32px] sm:min-h-[40px] line-clamp-2">
          <Link to={`/customer/product/${id}`} className="hover:text-blue-600 transition-colors">
            {productName}
          </Link>
        </h3>

        <div className="flex items-center mb-0.5 sm:mb-1">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={12} 
                className={`sm:w-4 sm:h-4 ${i < Math.round(rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <span className="text-[10px] sm:text-xs text-gray-600 ml-1 sm:ml-2">({rating?.toFixed(1) || 'N/A'})</span>
        </div>

        <div className="mt-0.5 sm:mt-1 h-12 sm:h-14"> 
          <div>
            <div className="flex items-center gap-1 sm:gap-2">
              <p className="text-base sm:text-lg font-bold text-gray-900">₹{priceDetails.finalPrice.toLocaleString()}</p>
              {hasDiscount && (
                <p className="text-xs sm:text-sm text-gray-500 line-through">₹{priceDetails.mrp.toLocaleString()}</p>
              )}
            </div>
            {hasDiscount && (
              <p className="text-[10px] sm:text-xs font-semibold text-green-600">
                You save ₹{(priceDetails.mrp - priceDetails.finalPrice).toLocaleString()} ({priceDetails.discount}% off)
              </p>
            )}
            {/* <p className="text-[10px] sm:text-xs text-gray-500">
              {gstType === 'inclusive' ? "Incl. GST" : `+${gst}% GST`}
            </p> */}
          </div>
        </div>


      </div>

    </div>
  );
};

const FeaturedProducts = () => {
  // This component fetches and displays only the 10 most recently added products
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryMap, setCategoryMap] = useState({});
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Modified refresh approach using useCallback to ensure stable function reference
  const refreshData = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  // Use Page Visibility API to only refresh when page is visible
  useEffect(() => {
    let refreshInterval;
    
    // Check if document is visible, only refresh if it is
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Set up a moderate refresh interval (15 minutes) when page is visible
        refreshInterval = setInterval(() => {
          console.log('Scheduled refresh - checking for new products');
          refreshData();
        }, 15 * 60 * 1000); // 15 minutes
      } else {
        // Clear interval when page is not visible
        clearInterval(refreshInterval);
      }
    };
    
    // Set up initial interval if page is visible
    handleVisibilityChange();
    
    // Add event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshData]);

  // Memoize fetchCategories function to avoid recreation on each render
  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/categories`);
      if (response.data && response.data.mainCategories && Array.isArray(response.data.mainCategories)) {
        const categoryMapping = {};
        response.data.mainCategories.forEach(category => {
          categoryMapping[category.id] = category.name;
        });
        setCategoryMap(categoryMapping);
        return categoryMapping;
      }
      return {};
    } catch (error) {
      console.error("Error fetching categories:", error);
      return {};
    }
  }, []);

  // Memoize fetchProducts function to avoid recreation on each render
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch categories first
      const categoryMapping = await fetchCategories();

      // Fetch only the 10 most recently added products
      let productsData = [];
      
      try {
        // Try to get recent products with backend sorting (limit=10)
        const response = await axios.get(`${BASE_URL}/api/products?limit=10&sortBy=id&sortOrder=desc`);
        productsData = response.data;
        console.log(`Successfully fetched ${productsData.length} products with backend sorting`);
      } catch (error) {
        console.log('Backend sorting not supported, falling back to client-side sorting');
        // Fallback: get all products and sort on client side, but limit to 10
        try {
          const response = await axios.get(`${BASE_URL}/api/products`);
          if (response.data && Array.isArray(response.data)) {
            // Sort by ID descending (most recent first) and take only first 10
            productsData = response.data
              .sort((a, b) => (b.id || 0) - (a.id || 0))
              .slice(0, 10);
            console.log(`Fallback: sorted and limited to ${productsData.length} products`);
          }
        } catch (fallbackError) {
          console.error('Error in fallback product fetch:', fallbackError);
          throw fallbackError;
        }
      }
      
      // Ensure we never have more than 10 products
      if (productsData.length > 10) {
        productsData = productsData.slice(0, 10);
        console.log(`Limited products to exactly 10 items`);
      }
      
      if (productsData && Array.isArray(productsData)) {
        console.log(`Fetching images for ${productsData.length} recent products`);
        // Fetch images for each product
        // TODO: Backend Optimization: The /api/products endpoint should ideally return the primary image URL
        // for each product to avoid N+1 API calls for images.
        const productsWithImages = await Promise.all(
          productsData.map(async (product) => {
            try {
              const imagesResponse = await axios.get(`${BASE_URL}/api/products/${product.id}/images`);
              if (imagesResponse.data && Array.isArray(imagesResponse.data) && imagesResponse.data.length > 0) {
                return {
                  ...product,
                  imageUrl: imagesResponse.data[0].imageUrl || imagesResponse.data[0].url
                };
              }
              return product;
            } catch (error) {
              console.error(`Error fetching images for product ${product.id}:`, error);
              return product;
            }
          })
        );
        
        // Don't log sample data on every fetch to avoid console spam
        
        // Final safeguard: ensure we never display more than 10 products
        const finalProducts = productsWithImages.slice(0, 10);
        console.log(`Setting ${finalProducts.length} products for display`);
        setProducts(finalProducts);
      } else {
        setError("Invalid response format from server");
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products. Please try again later.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Effect for fetching products only when lastRefresh changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, lastRefresh]);

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 6,
    slidesToScroll: 2,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow: 5,
          slidesToScroll: 2,
        }
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 2,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        }
      }
    ]
  };

  return (
    <section className="w-full py-1 sm:py-2 relative z-100">
      <div className="container mx-auto px-2 sm:px-4 md:px-6">
        <div className="flex flex-col items-start mb-2 sm:mb-4">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-0 mb-1">New Arrivals</h2>
            {/* {!loading && products.length > 0 && (
              <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Latest {products.length} products
              </span>
            )} */}
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-5 bg-gray-200 rounded w-1/3 mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <>
            <Slider {...sliderSettings}>
              {products.map((product) => (
                <div key={product.id} className="px-2">
                  <ProductCard product={product} categoryMap={categoryMap} />
                </div>
              ))}
            </Slider>
            
            <div className="flex flex-col items-center mt-4 sm:mt-6 md:mt-8">
              <Link 
                to="/customer/shop" 
                className="inline-flex items-center bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-full hover:bg-blue-700 transition-colors duration-200"
              >
                View All Products
              </Link>
            </div>
          </>
        )}
      </div>
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center max-w-6xl mx-auto px-3 sm:px-4">
        <div className="w-full md:w-2/3 text-center md:text-left md:mb-0">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 md:mb-4 tracking-tight text-white">
            Exclusive Offers!
          </h2>
          <p className="text-sm sm:text-base md:text-lg mb-4 sm:mb-6 md:mb-8 text-gray-100">
            Don't wait — these <span className="font-semibold text-blue-900">limited-time offers</span> are flying off the shelves!
          </p>
        </div>
        <img src={banner} alt="Special Offer Details" className="w-32 h-32 sm:w-40 sm:h-40 object-contain rounded-lg md:mr-20 hidden md:block" />
      </div>
    </section>
  );
};

export default FeaturedProducts;