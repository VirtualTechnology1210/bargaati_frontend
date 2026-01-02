//http://localhost:3000

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { BASE_URL } from '../../util';
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

const ProductCard = ({ product, categoryMap }) => {
  const { id, productName, imageUrl, price, rating, category, brand, mrp, gst = 18, gstType = 'exclusive' } = product;
  const navigate = useNavigate();

  // Calculate prices with GST
  const priceDetails = calculatePrices(price, mrp, gst, gstType === 'inclusive');
  const hasDiscount = priceDetails.mrp > priceDetails.finalPrice;

  const fullImageUrl = imageUrl?.startsWith('http') 
    ? imageUrl 
    : `${BASE_URL}${imageUrl}`;
  
  const categoryName = categoryMap[category] || 'Uncategorized';
  


  

  
  return (
    <div className="bg-white border border-gray-700 rounded-lg overflow-hidden h-full flex flex-col group transition-all duration-300 hover:shadow-xl hover:shadow-amber-900/10 hover:border-amber-500/30 relative">
      <Link to={`/customer/product/${id}`} className="relative aspect-square overflow-hidden bg-gray-900">
        <img 
          src={fullImageUrl} 
          alt={productName} 
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://placehold.co/300x300/EEE/999?text=No+Image';
          }}
        />
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-amber-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
            {priceDetails.discount}% OFF
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        {brand && <p className="text-xs text-black-300 mb-1">{brand}</p>}
        <h3 className="font-semibold text-sm text-black-100 mb-1 flex-grow min-h-[40px]">
          <Link to={`/customer/product/${id}`} className="hover:text-black-300 transition-colors">
            {productName}
          </Link>
        </h3>

        <div className="flex items-center mb-1">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={16} 
                className={`${i < Math.round(rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-2">({rating?.toFixed(1) || 'N/A'})</span>
        </div>

        <div className="mt-1 h-12">
          <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-lg font-bold text-black-400">₹{priceDetails.finalPrice.toLocaleString()}</span>
            {hasDiscount && (
              <p className="text-sm text-gray-500 line-through">₹{priceDetails.mrp.toLocaleString()}</p>
            )}
          </div>
            {hasDiscount && (
              <p className="text-xs font-semibold text-green-700">
                You save ₹{(priceDetails.mrp - priceDetails.finalPrice).toLocaleString()} ({priceDetails.discount}% off)
              </p>
            )}
            {/* <p className="text-[10px] text-gray-500">
              {gstType === 'inclusive' ? "Incl. GST" : `+${gst}% GST`}
            </p> */}
          </div>
        </div>


      </div>

    </div>
  );
};

const SkeletonLoader = () => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
    <div className="aspect-square bg-gray-200"></div>
    <div className="p-4">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div className="flex space-x-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-gray-200"></div>
        ))}
      </div>
      <div className="h-5 bg-gray-200 rounded w-1/3 mt-2"></div>
    </div>
  </div>
);

const TopRatedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryMap, setCategoryMap] = useState({});
  const [categories, setCategories] = useState(['all']);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const scrollContainerRef = useRef(null);

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle the View All Products button functionality
  const handleViewAllProducts = () => {
    setShowAllProducts(true);
  };

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
        // Create mappings for categories
        const categoryMapping = {};
        const categoryNames = [];
        
        response.data.mainCategories.forEach(category => {
          categoryMapping[category.id] = category.name;
          categoryNames.push(category.name);
        });
        
        // Set up category options for filter dropdown
        const categoryOptions = ['all', ...categoryNames];
        
        setCategoryMap(categoryMapping);
        setCategories(categoryOptions);
        
        return { categoryMapping, categoryOptions };
      }
      return { categoryMapping: {}, categoryOptions: ['all'] };
    } catch (error) {
      console.error("Error fetching categories:", error);
      return { categoryMapping: {}, categoryOptions: ['all'] };
    }
  }, []);

  // Memoize fetchProducts function to avoid recreation on each render
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch categories first
      const { categoryMapping } = await fetchCategories();

      // Removed cache-busting parameter to allow browser caching
      // const timestamp = new Date().getTime();
      // const response = await axios.get(`${BASE_URL}/api/products?_=${timestamp}`);
      const response = await axios.get(`${BASE_URL}/api/products`);
      
      if (response.data && Array.isArray(response.data)) {
        // Fetch images for each product
        // TODO: Backend Optimization: The /api/products endpoint should ideally return the primary image URL
        // for each product to avoid N+1 API calls for images.
        const productsWithImages = await Promise.all(
          response.data.map(async (product) => {
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

        // Filter products based on selected category
        const filteredProducts = productsWithImages.filter(product => {
          if (selectedCategory === 'all') return true;
          
          // Compare the product's category name with selected category
          const productCategoryName = categoryMapping[product.category];
          return productCategoryName === selectedCategory;
        })
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 6); // Limit to top 6 products to match grid layout

        setProducts(filteredProducts);
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
  }, [fetchCategories, selectedCategory]);

  // Effect for fetching products only when dependencies change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
    <section className="w-full py-2 md:py-2 relative z-100 bg-black-900">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-start mb-4">
          <div className="flex items-center">
            <h2 className="text-2xl font-bold text-white mb-1">Top Rated Products</h2>
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {[...Array(6)].map((_, index) => (
              <SkeletonLoader key={index} />
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
            
            <div className="flex flex-col items-center mt-8">
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
    </section>
  );
};

export default TopRatedProducts;