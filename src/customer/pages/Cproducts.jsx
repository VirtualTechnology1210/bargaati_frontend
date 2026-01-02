import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Filter, Search, X, ShoppingCart, Laptop, Smartphone, Gift, Home, Watch, Dumbbell, Camera, ShoppingBag, Shirt, Car, Utensils, Baby, Music, Book, Headphones, Heart, HeartPulse, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { BASE_URL } from '../../util';
import { toast } from 'react-hot-toast';
// import BackgroundParticles from '../components/BackgroundParticles';


const ProductsPage = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const categoryParam = queryParams.get('category');
  const subcategoryParam = queryParams.get('subcategory');
  const searchParam = queryParams.get('search');
  const navigate = useNavigate();

  // Get cart functionality from context
  const { addToCart, cart } = useCart();

  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // Store all products
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [subcategories, setSubcategories] = useState([]);
  const [subcategoryMap, setSubcategoryMap] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(categoryParam ? parseInt(categoryParam, 10) : null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(subcategoryParam ? parseInt(subcategoryParam, 10) : null);
  const [searchQuery, setSearchQuery] = useState(searchParam || '');
  const [sortOption, setSortOption] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterSticky, setIsFilterSticky] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [cartLimitMessage, setCartLimitMessage] = useState(''); // Single message at top
  const [messageTimeout, setMessageTimeout] = useState(null); // Store timeout reference
  const [maxPrice, setMaxPrice] = useState('');
  // Subcategory row scroll controls
  const subScrollRef = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  

  // Track if any filters are active
  const hasFilters = selectedCategory !== null || selectedSubcategory !== null || searchQuery || sortOption !== 'default' || minPrice || maxPrice;

  // Authentication helper functions
  const isLoggedIn = localStorage.getItem('token') && localStorage.getItem('user');

  const isCustomer = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.role === 'customer';
    } catch {
      return false;
    }
  };

  // Match home page icon style: stable pastel gradients per name
  const getSubGradient = (name) => {
    const palettes = [
      { gradient: 'from-blue-50 to-purple-50', text: 'text-blue-600' },
      { gradient: 'from-green-50 to-teal-50', text: 'text-green-600' },
      { gradient: 'from-purple-50 to-pink-50', text: 'text-purple-600' },
      { gradient: 'from-yellow-50 to-orange-50', text: 'text-yellow-600' },
      { gradient: 'from-pink-50 to-rose-50', text: 'text-pink-600' },
      { gradient: 'from-indigo-50 to-blue-50', text: 'text-indigo-600' }
    ];
    const key = (name || '').toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    const idx = key.length ? hash % palettes.length : 0;
    return palettes[idx];
  };

  // Helper function to set message with auto-clear after 5 seconds
  const setCartLimitMessageWithTimeout = (message) => {
    // Clear any existing timeout
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }
    
    // Set the message
    setCartLimitMessage(message);
    
    // Set new timeout to clear message after 5 seconds
    const newTimeout = setTimeout(() => {
      setCartLimitMessage('');
      setMessageTimeout(null);
    }, 5000);
    
    setMessageTimeout(newTimeout);
  };

  // Handle add to cart for both guests and logged-in users
  const handleAddToCart = (product) => {
    // Clear any previous cart limit message
    setCartLimitMessage('');

    // Basic validation before adding to cart
    const stockQuantity = product.stockQuantity || product.stock_quantity || 0;
    const isActive = product.isActive !== undefined ? product.isActive : (product.is_active !== undefined ? product.is_active : true);
    const minOrderQuantity = product.minOrderQuantity || product.min_order_quantity || 1;
    const maxOrderQuantity = product.maxOrderQuantity || product.max_order_quantity;
    
    // Check if product is active and in stock
    if (!isActive || stockQuantity === 0) {
      setCartLimitMessageWithTimeout(`"${product.productName}" is currently out of stock`);
      // Scroll to top to show message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Check minimum order quantity (though it's usually 1)
    if (1 < minOrderQuantity) {
      setCartLimitMessageWithTimeout(`Minimum order quantity for "${product.productName}" is ${minOrderQuantity}`);
      // Scroll to top to show message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check existing cart quantity before adding (for max order quantity validation)
    if (maxOrderQuantity) {
      // Find existing cart items for this product
      const existingCartItems = cart.filter(item => {
        return item.productId === product.id || item.id === product.id;
      });
      
      const currentCartQuantity = existingCartItems.reduce((total, item) => total + (item.quantity || 0), 0);
      const newTotalQuantity = currentCartQuantity + 1; // Adding 1 item from product listing
      
      if (newTotalQuantity > maxOrderQuantity) {
        const remainingAllowed = maxOrderQuantity - currentCartQuantity;
        if (remainingAllowed <= 0) {
          setCartLimitMessageWithTimeout(`You already have the maximum quantity (${maxOrderQuantity}) of "${product.productName}" in your cart`);
        } else {
          setCartLimitMessageWithTimeout(`You can only add ${remainingAllowed} more of "${product.productName}" to your cart (max: ${maxOrderQuantity})`);
        }
        // Scroll to top to show message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    
    const productToAdd = {
      id: product.id,
      name: product.productName,
      price: product.price,
      mrp: product.mrp,
      image: product.imageUrl?.startsWith('http')
        ? product.imageUrl
        : product.imageUrl ? `${BASE_URL}${product.imageUrl}` : 'https://via.placeholder.com/300?text=No+Image',
      categoryName: getCategoryName(product.category)
    };

    console.log('[Cproducts.jsx] Attempting to add to cart:', productToAdd);
    addToCart(productToAdd);
    
    // Clear the cart limit message on successful add
    setCartLimitMessage('');
    
    navigate('/customer/cart');
  };


  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
    };
  }, [messageTimeout]);

  // Make filter sticky on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsFilterSticky(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  

  // Manage subcategory scroll button visibility
  useEffect(() => {
    const container = subScrollRef.current;
    if (!container) return;
    const check = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    };
    check();
    container.addEventListener('scroll', check);
    window.addEventListener('resize', check);
    return () => {
      container.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [selectedCategory, subcategories.length]);

  const scrollSub = (direction) => {
    const container = subScrollRef.current;
    if (!container) return;
    const amount = Math.floor(container.clientWidth * 0.8);
    container.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // Fetch categories once when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/categories`);
        if (response.data && response.data.mainCategories && Array.isArray(response.data.mainCategories)) {
          setCategories(response.data.mainCategories);

          // Create category map for lookup by ID
          const categoryMapping = {};
          response.data.mainCategories.forEach(category => {
            categoryMapping[category.id] = category.name;
          });
          setCategoryMap(categoryMapping);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setError('Failed to load categories');
      }
    };

    fetchCategories();
  }, []);

  // Fetch subcategories whenever a main category is selected.
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        let subs = [];
        if (selectedCategory !== null) {
          const res = await axios.get(`${BASE_URL}/api/subcategories`, { params: { maincategoryid: selectedCategory } });
          const data = res.data;
          subs = Array.isArray(data?.subcategories) ? data.subcategories : Array.isArray(data) ? data : [];
        } else {
          // If a subcategory is already in URL but no main selected, fetch all to build a name map
          if (selectedSubcategory !== null) {
            const res = await axios.get(`${BASE_URL}/api/subcategories`);
            const data = res.data;
            subs = Array.isArray(data?.subcategories) ? data.subcategories : Array.isArray(data) ? data : [];
            // Try to infer and set the parent main category once
            if (subs.length > 0 && selectedCategory === null) {
              const match = subs.find(s => parseInt(s.id, 10) === parseInt(selectedSubcategory, 10));
              if (match && match.maincategoryid) {
                setSelectedCategory(parseInt(match.maincategoryid, 10));
                // Sync URL param for category
                const params = new URLSearchParams(location.search);
                params.set('category', String(match.maincategoryid));
                navigate({ search: params.toString() });
              }
            }
          } else {
            subs = [];
          }
        }
        setSubcategories(subs);
        const map = {};
        subs.forEach(s => { map[s.id] = s.name; });
        setSubcategoryMap(map);
      } catch (e) {
        console.error('Error fetching subcategories:', e);
        setSubcategories([]);
        setSubcategoryMap({});
      }
    };

    fetchSubcategories();
  }, [selectedCategory, selectedSubcategory]);

  // Apply client-side filtering whenever filters change
  useEffect(() => {
    if (allProducts.length > 0) {
      let filtered = [...allProducts];

      // Subcategory filter (primary)
      if (selectedSubcategory !== null) {
        filtered = filtered.filter(product => parseInt(product.subcategory, 10) === parseInt(selectedSubcategory, 10));
      } else if (selectedCategory !== null) {
        // Fallback: category filter (if ever used)
        filtered = filtered.filter(product => product.category === selectedCategory);
      }

      // Price filter
      if (minPrice) {
        filtered = filtered.filter(product => parseFloat(product.price) >= parseFloat(minPrice));
      }
      if (maxPrice) {
        filtered = filtered.filter(product => parseFloat(product.price) <= parseFloat(maxPrice));
      }

      setProducts(filtered);
    }
  }, [selectedSubcategory, selectedCategory, allProducts, minPrice, maxPrice]);

  // Fetch products when search or sort changes
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        // Always fetch all products, we'll filter client-side
        let url = `${BASE_URL}/api/products?_=${timestamp}`;

        console.log('Fetching all products from URL:', url);

        const response = await axios.get(url);

        if (response.data && Array.isArray(response.data)) {
          // Fetch images for each product in parallel
          const productsWithImages = await Promise.all(
            response.data.map(async (product) => {
              try {
                // Get product images
                const imagesResponse = await axios.get(`${BASE_URL}/api/products/${product.id}/images`);

                if (imagesResponse.data && Array.isArray(imagesResponse.data) && imagesResponse.data.length > 0) {
                  return {
                    ...product,
                    imageUrl: imagesResponse.data[0].imageUrl || imagesResponse.data[0].url
                  };
                }
                return product;
              } catch (imageError) {
                console.error(`Error fetching images for product ${product.id}:`, imageError);
                return product;
              }
            })
          );

          // Apply sorting
          let sortedProducts = [...productsWithImages];
          switch (sortOption) {
            case 'price-asc':
              sortedProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
              break;
            case 'price-desc':
              sortedProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
              break;
            case 'name-asc':
              sortedProducts.sort((a, b) => a.productName.localeCompare(b.productName));
              break;
            case 'name-desc':
              sortedProducts.sort((a, b) => b.productName.localeCompare(a.productName));
              break;
            case 'rating-desc':
              sortedProducts.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
              break;
            default:
              // Default sorting (no specific order)
              break;
          }

          // Store all products
          setAllProducts(sortedProducts);

          // Filter products based on selected subcategory (or category fallback)
          if (selectedSubcategory !== null) {
            const filtered = sortedProducts.filter(product => parseInt(product.subcategory, 10) === parseInt(selectedSubcategory, 10));
            setProducts(filtered);
          } else if (selectedCategory !== null) {
            const filtered = sortedProducts.filter(product => product.category === selectedCategory);
            setProducts(filtered);
          } else {
            setProducts(sortedProducts);
          }
        } else {
          setError('Invalid response format from server');
          setProducts([]);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setError(error.response?.data?.message || 'Error fetching products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, sortOption, selectedSubcategory]); // include selectedSubcategory for initial filtering

  const handleCategoryChange = (categoryId) => {
    console.log('handleCategoryChange called with categoryId:', categoryId);
    setSelectedCategory(categoryId);
    // Reset subcategory when main category changes
    setSelectedSubcategory(null);
    const params = new URLSearchParams(location.search);
    params.delete('subcategory');
    if (categoryId === null) {
      params.delete('category');
    } else {
      params.set('category', String(categoryId));
    }
    navigate({ search: params.toString() });
    console.log('selectedCategory set to:', categoryId);
    // Clear search when selecting a category
    setSearchQuery('');

    // We now handle filtering based on the selectedCategory in a separate useEffect
  };

  // Handle subcategory change from URL or future UI
  const handleSubcategoryChange = (subcategoryId) => {
    setSelectedSubcategory(subcategoryId);
    // update URL param
    const params = new URLSearchParams(location.search);
    if (subcategoryId === null) {
      params.delete('subcategory');
    } else {
      params.set('subcategory', String(subcategoryId));
    }
    navigate({ search: params.toString() });
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSortOption('default');
    setMinPrice('');
    setMaxPrice('');
    // Update URL params
    const params = new URLSearchParams(location.search);
    params.delete('category');
    params.delete('subcategory');
    navigate({ search: params.toString() });
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const getCategoryName = (categoryIdOrName) => {
    if (categoryMap[categoryIdOrName]) return categoryMap[categoryIdOrName];
    if (typeof categoryIdOrName === 'string' && categoryIdOrName.trim()) return categoryIdOrName;
    return 'Unknown Category';
  };

  const getSubcategoryName = (subId) => {
    return subcategoryMap[subId] || 'Subcategory';
  };

  // Determine icon for a subcategory by its name
  const getSubIconForName = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('ring')) return ShoppingBag;
    if (n.includes('shoe')) return Shirt;
    if (n.includes('electronics')) return Laptop;
    if (n.includes('phone') || n.includes('mobile')) return Smartphone;
    if (n.includes('laptop') || n.includes('computer')) return Laptop;
    if (n.includes('watch')) return Watch;
    if (n.includes('home') || n.includes('furniture')) return Home;
    if (n.includes('gift')) return Gift;
    if (n.includes('fitness') || n.includes('gym')) return Dumbbell;
    if (n.includes('camera') || n.includes('photo')) return Camera;
    if (n.includes('shirt') || n.includes('fashion') || n.includes('cloth')) return Shirt;
    if (n.includes('auto') || n.includes('car') || n.includes('bike')) return Car;
    if (n.includes('kitchen') || n.includes('cook') || n.includes('utensil')) return Utensils;
    if (n.includes('baby') || n.includes('kid')) return Baby;
    if (n.includes('music')) return Music;
    if (n.includes('book') || n.includes('stationery')) return Book;
    if (n.includes('audio') || n.includes('headphone')) return Headphones;
    if (n.includes('beauty') || n.includes('care')) return HeartPulse;
    return ShoppingBag;
  };

  // Determine color theme classes for subcategory by its name
  const getSubColorClasses = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('ring')) return { text: 'text-yellow-400', ring: 'ring-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-400/30' };
    if (n.includes('shoe')) return { text: 'text-amber-400', ring: 'ring-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-400/30' };
    if (n.includes('electronics')) return { text: 'text-sky-400', ring: 'ring-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-400/30' };
    if (n.includes('phone') || n.includes('mobile')) return { text: 'text-violet-400', ring: 'ring-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-400/30' };
    if (n.includes('laptop') || n.includes('computer')) return { text: 'text-sky-400', ring: 'ring-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-400/30' };
    if (n.includes('watch')) return { text: 'text-amber-400', ring: 'ring-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-400/30' };
    if (n.includes('home') || n.includes('furniture')) return { text: 'text-orange-400', ring: 'ring-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-400/30' };
    if (n.includes('gift')) return { text: 'text-pink-400', ring: 'ring-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-400/30' };
    if (n.includes('fitness') || n.includes('gym')) return { text: 'text-emerald-400', ring: 'ring-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-400/30' };
    if (n.includes('camera') || n.includes('photo')) return { text: 'text-yellow-400', ring: 'ring-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-400/30' };
    if (n.includes('shirt') || n.includes('fashion') || n.includes('cloth')) return { text: 'text-fuchsia-400', ring: 'ring-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-400/30' };
    if (n.includes('auto') || n.includes('car') || n.includes('bike')) return { text: 'text-lime-400', ring: 'ring-lime-400', bg: 'bg-lime-500/10', border: 'border-lime-400/30' };
    if (n.includes('kitchen') || n.includes('cook') || n.includes('utensil')) return { text: 'text-orange-400', ring: 'ring-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-400/30' };
    if (n.includes('baby') || n.includes('kid')) return { text: 'text-rose-400', ring: 'ring-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-400/30' };
    if (n.includes('music')) return { text: 'text-purple-400', ring: 'ring-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-400/30' };
    if (n.includes('book') || n.includes('stationery')) return { text: 'text-emerald-400', ring: 'ring-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-400/30' };
    if (n.includes('audio') || n.includes('headphone')) return { text: 'text-indigo-400', ring: 'ring-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-400/30' };
    if (n.includes('beauty') || n.includes('care')) return { text: 'text-pink-400', ring: 'ring-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-400/30' };
    return { text: 'text-white/80', ring: 'ring-white/80', bg: 'bg-white/5', border: 'border-white/30' };
  };

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

  // Product Card Component
  const ProductCard = ({ product }) => {
    const { id, productName, imageUrl, price, rating, brand, category, mrp, gst = 18, gstType = 'exclusive' } = product;

    // Get the category name from our mapping
    const categoryName = getCategoryName(category);

    // Construct the full image URL or use placeholder
    const fullImageUrl = imageUrl?.startsWith('http')
      ? imageUrl
      : imageUrl ? `${BASE_URL}${imageUrl}` : 'https://via.placeholder.com/300?text=No+Image';

    // Calculate prices with GST
    const priceDetails = calculatePrices(price, mrp, gst, gstType === 'inclusive');
    const hasDiscount = priceDetails.mrp > priceDetails.finalPrice;

    return (
      <div className="bg-black border border-white/10 rounded-lg overflow-hidden h-full flex flex-col group transition-all duration-300 hover:shadow-lg hover:shadow-white/5 relative z-0">
        {/* Product Image with Category Tag */}
        <Link to={`/customer/product/${id}`} className="block">
          <div className="relative aspect-square overflow-hidden bg-black">
            <img
              src={fullImageUrl}
              alt={productName}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
              }}
            />

            {/* Category Tag */}
            {/* <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-xs px-2 py-1 rounded-md font-medium text-white">
              {categoryName}
            </div> */}
          </div>
        </Link>

        {/* Product Info */}
        <div className="p-4 flex flex-col flex-grow bg-black">
          {/* Brand Name */}
          <div className="flex justify-between items-start">
            <Link to={`/customer/product/${id}`} className="block flex-grow">
              <h3 className="font-bold text-sm text-white mb-1">
                {brand || 'Brand'}
              </h3>
              <div className="text-white/80 text-sm mb-2 line-clamp-2 hover:text-white transition-colors">
                {productName}
              </div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToCart(product);
              }}
              className="bg-blue-500 text-white px-2 py-1.5 rounded-full text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1 flex-shrink-0"
              title={"Add to Cart"}
            >
              <ShoppingCart size={16} color='white' />
              Add
            </button>
          </div>


          {/* Rating */}
          <div className="flex items-center mb-2">
            <div className="flex items-center mr-2">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-3.5 h-3.5 ${i < Math.round(rating || 0) ? 'text-yellow-300 fill-yellow-300' : 'text-white/20'}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              ))}
            </div>
            <span className="text-xs text-white/60">({rating?.toFixed(1) || 0})</span>
          </div>

          {/* Price */}
          <div className="mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-start">
                <div className="flex items-baseline gap-2">
                  {hasDiscount && (
                    <p className="text-sm text-white/50 line-through">
                      ₹{priceDetails.mrp.toLocaleString()}
                    </p>
                  )}
                  <p className="font-semibold text-white">
                    ₹{priceDetails.finalPrice.toLocaleString()}
                  </p>
                </div>
                {hasDiscount && (
                  <p className="text-xs font-medium text-green-400">
                    You save ₹{(priceDetails.mrp - priceDetails.finalPrice).toFixed(2)} ({priceDetails.discount}%)
                  </p>
                )}
                {/* <p className="text-xs text-gray-500 mt-1">
                  {gstType === 'inclusive' ? "Incl. GST" : `+${gst}% GST`}
                </p> */}
              </div>
              {/* <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCart(product);
                }}
                className="bg-blue-500 text-white px-2 py-1.5 rounded-full ml-3 text-xs font-medium hover:bg-blue-700 hover:border-radius-100 transition-colors flex items-center gap-1"
                title={isLoggedIn && isCustomer() ? "Add to Cart" : "Login to Add to Cart"}
              >
                <ShoppingCart size={16} color='white' />
                Add
              </button> */}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white">
      {/* Background Particles as true background */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        {/* <BackgroundParticles count={30} /> */}
      </div>
      {/* Main Product Section */}
      <div className="relative z-10 flex flex-col w-full">
        {/* Cart Limit Message at Top */}
        {cartLimitMessage && (
          <div className="sticky top-0 z-50 bg-yellow-50 border-b border-yellow-200 shadow-sm">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
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
                <button
                  onClick={() => {
                    setCartLimitMessage('');
                    if (messageTimeout) {
                      clearTimeout(messageTimeout);
                      setMessageTimeout(null);
                    }
                  }}
                  className="flex-shrink-0 ml-4 text-yellow-400 hover:text-yellow-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">
              {selectedSubcategory !== null
                ? `${getSubcategoryName(selectedSubcategory)} Products`
                : selectedCategory
                ? `${getCategoryName(selectedCategory)} Products`
                : searchQuery
                  ? `Search Results: "${searchQuery}"`
                  : 'All Products'}
            </h1>
            <div className="mt-4 md:mt-0 flex items-center space-x-2 w-full md:w-auto">
              <button
                onClick={toggleFilters}
                className="md:hidden flex items-center bg-white/5 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Show filters"
              >
                <Filter size={18} className="mr-2" />
                <span>Filters</span>
                {(selectedCategory !== null || sortOption !== 'default') && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-white text-black text-xs flex items-center justify-center">
                    ✓
                  </span>
                )}
              </button>
            </div>
          </div>
          {selectedCategory !== null && subcategories && subcategories.length > 0 && (
            <div className="mb-3 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60 border-b border-white/10 relative">
              {canScrollLeft && (
                <button
                  onClick={() => scrollSub('left')}
                  className="flex items-center justify-center absolute left-1 top-1/2 -translate-y-1/2 z-50 bg-black/70 hover:bg-black/80 rounded-full p-1.5 shadow"
                  aria-label="Scroll left"
                  title="Scroll left"
                >
                  <ChevronLeft size={18} className="text-white/85" />
                </button>
              )}
              {canScrollRight && (
                <button
                  onClick={() => scrollSub('right')}
                  className="flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 z-50 bg-black/70 hover:bg-black/80 rounded-full p-1.5 shadow"
                  aria-label="Scroll right"
                  title="Scroll right"
                >
                  <ChevronRight size={18} className="text-white/85" />
                </button>
              )}
              {/* edge fade masks */}
              <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-black/80 to-transparent" />
              <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-black/80 to-transparent" />
              <div ref={subScrollRef} className="flex flex-row overflow-x-auto gap-3 no-scrollbar py-2.5 px-6 md:px-8">
                <button
                  onClick={() => handleSubcategoryChange(null)}
                  className={`group flex flex-col items-center justify-center flex-none w-24 select-none`}
                  title="All"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all bg-gradient-to-br from-indigo-50 to-blue-50 shadow-sm group-hover:shadow ${selectedSubcategory === null ? 'ring-2 ring-white/80' : ''} group-active:scale-95 group-hover:scale-105`}>
                    <ShoppingBag size={22} className={`transition-colors ${selectedSubcategory === null ? 'text-indigo-700' : 'text-indigo-600'}`} />
                  </div>
                  <span className={`mt-1.5 text-[11px] truncate ${selectedSubcategory === null ? 'text-white' : 'text-white/80'}`}>All</span>
                </button>

                {subcategories.map((sub) => {
                  const color = getSubColorClasses(sub.name);
                  const selected = selectedSubcategory === sub.id;
                  const grad = getSubGradient(sub.name);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSubcategoryChange(sub.id)}
                      className="group flex flex-col items-center justify-center flex-none w-28 select-none"
                      title={sub.name}
                      aria-selected={selected}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all bg-gradient-to-br ${grad.gradient} shadow-sm group-hover:shadow ${selected ? 'ring-2 ring-white/80' : ''} group-active:scale-95 group-hover:scale-105`}>
                        {React.createElement(getSubIconForName(sub.name), { size: 22, className: `${grad.text}` })}
                      </div>
                      <span className={`mt-1.5 text-[11px] truncate max-w-[110px] ${selected ? 'text-white' : 'text-white'}`}>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex flex-col md:flex-row mt-4">
            {/* Filters - Mobile (Drawer) */}
            {showFilters && (
              <div className="md:hidden fixed inset-0 z-[1000] overflow-hidden">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
                  onClick={toggleFilters}
                  aria-hidden="true"
                ></div>
                <div
                  className={`fixed left-0 top-0 bottom-0 w-[80%] max-w-[300px] bg-black shadow-2xl transform transition-all duration-300 ease-in-out flex flex-col ${showFilters ? 'translate-x-0' : '-translate-x-full'}`}
                >
                  <div className="sticky top-0 bg-black z-50 border-b border-white/10 px-4 py-3.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white">Filters</h2>
                      <div className="flex items-center gap-4">
                        {hasFilters && (
                          <button
                            onClick={clearFilters}
                            className="text-sm text-white hover:text-white/80 transition-colors font-medium"
                          >
                            Clear all
                          </button>
                        )}
                        <button
                          onClick={toggleFilters}
                          className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
                          aria-label="Close filters"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="p-4">
                      <FilterContent
                        categories={categories}
                        selectedCategory={selectedCategory}
                        handleCategoryChange={(categoryId) => {
                          handleCategoryChange(categoryId);
                          toggleFilters();
                        }}
                        subcategories={subcategories}
                        selectedSubcategory={selectedSubcategory}
                        handleSubcategoryChange={(subId) => {
                          handleSubcategoryChange(subId);
                          toggleFilters();
                        }}
                        sortOption={sortOption}
                        setSortOption={setSortOption}
                        clearFilters={clearFilters}
                        hasFilters={hasFilters}
                        minPrice={minPrice}
                        setMinPrice={setMinPrice}
                        maxPrice={maxPrice}
                        setMaxPrice={setMaxPrice}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Filters - Desktop (Sidebar) */}
            <aside className="hidden md:block w-64 flex-shrink-0 mr-8">
              <div className="bg-black-800 rounded-lg shadow-sm p-5 sticky top-24">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-white">Filters</h2>
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <FilterContent
                  categories={categories}
                  selectedCategory={selectedCategory}
                  handleCategoryChange={handleCategoryChange}
                  subcategories={subcategories}
                  selectedSubcategory={selectedSubcategory}
                  handleSubcategoryChange={handleSubcategoryChange}
                  sortOption={sortOption}
                  setSortOption={setSortOption}
                  clearFilters={clearFilters}
                  hasFilters={hasFilters}
                  minPrice={minPrice}
                  setMinPrice={setMinPrice}
                  maxPrice={maxPrice}
                  setMaxPrice={setMaxPrice}
                />
              </div>
            </aside>
            {/* Products */}
            <div className="flex-1">
              {loading ? (
                // Loading skeleton grid
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-6">
                  {[...Array(8)].map((_, index) => (
                    <div key={index} className="bg-black-800 rounded-lg shadow-sm overflow-hidden animate-pulse">
                      <div className="aspect-square bg-black-700"></div>
                      <div className="p-4">
                        <div className="h-4 bg-black-700 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-black-700 rounded w-3/4 mb-3"></div>
                        <div className="h-5 bg-black-700 rounded w-1/3 mt-2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                // Error message
                <div className="text-center py-12 bg-black rounded-lg shadow-sm">
                  <p className="text-red-500 mb-4">{error}</p>
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : products.length === 0 ? (
                // No products found
                <div className="text-center py-12 bg-black rounded-lg shadow-sm">
                  <p className="text-gray-400 mb-4">No products found matching your criteria.</p>
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                // Products grid
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-6">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Mobile filter button */}
      <div className={`lg:hidden fixed bottom-6 right-6 z-30 transition-transform duration-300 ${isFilterSticky ? 'translate-y-0' : 'translate-y-20'}`}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-shop-primary to-blue-600 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          aria-label={showFilters ? 'Hide filters' : 'Show filters'}
        >
          {showFilters ? <X size={20} /> : <Filter size={20} />}
        </button>
      </div>

    </div>
  );
};

// Category Icons mapping
const categoryIcons = {
  'Electronics': Laptop,
  'Fashion': Shirt,
  'Home & Kitchen': Home,
  'Beauty Care': HeartPulse,
  'Groceries': ShoppingBag,
  'Medical products': HeartPulse,
  'Stationery': Book,
  'Baby Products': Baby,
  'default': ShoppingBag
};

// Filter Component
const FilterContent = ({
  categories,
  selectedCategory,
  handleCategoryChange,
  subcategories,
  selectedSubcategory,
  handleSubcategoryChange,
  clearFilters,
  hasFilters,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice
}) => (
  <div className="space-y-6">
    {/* Price Filter */}
    <div className="rounded-xl p-4 bg-white/5">
      <h3 className="font-semibold text-white text-lg mb-4">Price Range</h3>
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full px-3 py-2 border bg-black border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 placeholder-white/50"
          />
        </div>
        <span className="text-white/60">to</span>
        <div className="flex-1">
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full px-3 py-2 border bg-black border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 placeholder-white/50"
          />
        </div>
      </div>
    </div>

    {/* Categories Filter */}
    <div className="rounded-xl p-4 bg-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white text-lg">Categories</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-white hover:text-white/80 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-white/10"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-2">
        <button
          onClick={() => handleCategoryChange(null)}
          className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all ${selectedCategory === null
              ? 'bg-white text-black font-medium shadow-sm'
              : 'hover:bg-white/10 text-white active:bg-white/20'
            }`}
        >
          <span className="mr-3 text-white">
            <ShoppingBag size={20} strokeWidth={2} />
          </span>
          <span>All Categories</span>
          {selectedCategory === null && (
            <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></span>
          )}
        </button>

        <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2 -mr-2 custom-scrollbar space-y-2">
          {categories.map(category => {
            // Convert category name to lowercase for case-insensitive matching
            const categoryName = category.name ? category.name.trim().toLowerCase() : '';

            // Find matching icon key (case-insensitive and trimmed)
            const iconKey = Object.keys(categoryIcons).find(
              key => key.toLowerCase() === categoryName
            );

            const icon = iconKey ? categoryIcons[iconKey] : categoryIcons.default;
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all ${isSelected
                    ? 'bg-white text-black font-medium shadow-sm'
                    : 'hover:bg-white/10 text-white/80 active:bg-white/20'
                  }`}
              >
                <span className={`mr-3 ${isSelected ? 'text-black' : 'text-white/80'}`}>
                  {React.createElement(icon, { size: 20, strokeWidth: 2 })}
                </span>
                <span className="truncate">{category.name}</span>
                {isSelected && (
                  <span className="ml-auto w-1.5 h-1.5 bg-black rounded-full"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    {/* Subcategories Filter */}
    {/* <div className="rounded-xl p-4 bg-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white text-lg">Subcategories</h3>
        {selectedSubcategory !== null && (
          <button
            onClick={() => handleSubcategoryChange(null)}
            className="text-sm text-white hover:text-white/80 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-white/10"
          >
            Clear
          </button>
        )}
      </div>

      {(!subcategories || subcategories.length === 0) ? (
        <p className="text-white/60 text-sm">Select a category to see subcategories.</p>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
          <button
            onClick={() => handleSubcategoryChange(null)}
            className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all ${selectedSubcategory === null
                ? 'bg-white text-black font-medium shadow-sm'
                : 'hover:bg-white/10 text-white active:bg-white/20'
              }`}
          >
            <span className="mr-3 text-white">
              <ShoppingBag size={20} strokeWidth={2} />
            </span>
            <span>All Subcategories</span>
            {selectedSubcategory === null && (
              <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></span>
            )}
          </button>

          {subcategories.map(sub => (
            <button
              key={sub.id}
              onClick={() => handleSubcategoryChange(sub.id)}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all ${selectedSubcategory === sub.id
                  ? 'bg-white text-black font-medium shadow-sm'
                  : 'hover:bg-white/10 text-white/80 active:bg-white/20'
                }`}
            >
              <span className={`mr-3 ${selectedSubcategory === sub.id ? 'text-black' : 'text-white/80'}`}>
                <ShoppingBag size={20} strokeWidth={2} />
              </span>
              <span className="truncate">{sub.name}</span>
              {selectedSubcategory === sub.id && (
                <span className="ml-auto w-1.5 h-1.5 bg-black rounded-full"></span>
              )}
            </button>
          ))}
        </div>
      )}
    </div> */}
  </div>
);

export default ProductsPage;