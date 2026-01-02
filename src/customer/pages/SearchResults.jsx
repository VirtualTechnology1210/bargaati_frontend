import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL, getImageUrl } from '../../util';
import {
  ShoppingCart,
  Heart,
  Search,
  ListFilter,
  AlertTriangle,
  Package,
  ArrowLeft
} from 'lucide-react';
// import BackgroundParticles from '../components/BackgroundParticles';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';

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

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('query') || '';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState(new Set());

  const cartContext = useCart();
  const isLoggedIn = !!localStorage.getItem('token');
  const isCustomer = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.role === 'customer';
    } catch {
      return false;
    }
  };

  // Fetch search results
  useEffect(() => {
    if (!query) {
      setProducts([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${BASE_URL}/api/products/search`, { params: { query } });
        if (res.data.success) setProducts(res.data.products);
        else setError(res.data.message || 'Failed to fetch search results.');
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'An error occurred while searching.');
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [query]);

  // Fetch user favorites from API
  useEffect(() => {
    if (isLoggedIn && isCustomer()) {
      axios.get(`${BASE_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(res => {
        if (res.data && Array.isArray(res.data.favorites)) {
          const favIds = res.data.favorites.map(f => f.product.id);
          setFavorites(new Set(favIds));
        } else {
          console.error('Invalid favorites data format:', res.data);
          setFavorites(new Set());
        }
      }).catch(err => {
        console.error('Error fetching favorites:', err);
        setFavorites(new Set());
      });
    }
  }, []);

  const toggleFavorite = async (productId) => {
    if (!isLoggedIn || !isCustomer()) {
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    const isFav = favorites.has(productId);
    try {
      if (!isFav) {
        await axios.post(`${BASE_URL}/api/favorites/${productId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Added to favorites');
        setFavorites(prev => new Set(prev).add(productId));
      } else {
        await axios.delete(`${BASE_URL}/api/favorites/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Removed from favorites');
        setFavorites(prev => {
          const updated = new Set(prev);
          updated.delete(productId);
          return updated;
        });
      }
      window.dispatchEvent(new Event('favoritesUpdate'));
    } catch (err) {
      console.error('Error updating favorites:', err);
      toast.error('Failed to update favorites');
    }
  };

  const handleAddToCart = (product) => {
    if (cartContext?.addToCart) {
      const cartProduct = {
        id: product.id,
        name: product.productName || product.name,
        price: product.price,
        mrp: product.mrp,
        image: getImageUrl(product.imageUrl),
        description: product.description,
        categoryName: product.categoryName || product.category
      };
      cartContext.addToCart(cartProduct);
      navigate('/customer/cart');
    } else {
      toast.error('Cart unavailable');
    }
  };

  if (!query) {
    return (
      <div className="min-h-screen relative">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', opacity: '1' }}>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', color: 'white', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: '1' }}>
            <ArrowLeft size={18} style={{ marginRight: '0.5rem' }} />
            Back to Home
          </button>
          <div style={{ textAlign: 'right', opacity: '1' }}>
            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600', opacity: '1', margin: '0' }}>Search Results</h2>
            <p style={{ color: '#D1D5DB', opacity: '1', margin: '0', marginTop: '0.25rem' }}>
              Showing results for: <span style={{ color: '#93C5FD', fontWeight: '500' }}>"{query}"</span>
            </p>
          </div>
        </div>
        <div className="container mx-auto px-6 py-12 max-w-4xl text-center z-10">
          <Search size={64} className="mx-auto text-gray-300 mb-6" />
          <h1 style={{ color: 'white', fontSize: '3rem', fontWeight: 'bold', opacity: '1' }}>Search for Products</h1>
          <p style={{ color: '#D1D5DB', opacity: '1' }}>Enter a search term in the navigation bar above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 bg-black text-white">
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Home
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-white mb-1">Search Results</h2>
            <p className="text-white/70">
              Showing results for: <span className="text-white font-medium">"{query}"</span>
            </p>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-6 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl shadow-sm p-5 border border-white/10">
                <div className="w-full h-40 bg-white/10 rounded-lg mb-4"></div>
                <div className="h-5 bg-white/10 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-white/10 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl shadow-sm flex items-center">
            <AlertTriangle size={24} className="mr-3" />
            <div>
              <h2 className="font-semibold text-lg">Error searching products</h2>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <AlertTriangle size={48} className="mx-auto text-yellow-300/90 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">No Results Found</h2>
            <p className="text-white/60">We couldn't find any products matching your search.</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-6 gap-4">
            {products.map(product => {
              const isFav = favorites.has(product.id);
              return (
                <div key={product.id} className="group relative bg-black rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 group border border-white/10 hover:border-white/20">
                  <Link to={`/customer/product/${product.id}`}>
                    <img
                      src={getImageUrl(product.imageUrl)}
                      alt={product.productName || product.name}
                      className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={e => e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'}
                    />
                  </Link>
                  <div className="p-5 flex flex-col flex-grow bg-black">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-white truncate group-hover:text-white/90 transition-colors flex-grow pr-2">
                        <Link to={`/customer/product/${product.id}`}>
                          {product.productName || product.name}
                        </Link>
                      </h3>
                      <button
                        onClick={(e) => { e.preventDefault(); handleAddToCart(product); }}
                        className="p-2 bg-white text-black rounded-full hover:bg-white/90 transition-colors flex-shrink-0"
                        title="Add to Cart"
                      >
                        <ShoppingCart size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-white/60 mb-2">{product.brand}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <div>
                        {(() => {
                          const priceDetails = calculatePrices(
                            product.price,
                            product.mrp,
                            product.gst || 18,
                            product.gstType === 'inclusive'
                          );
                          return (
                            <>
                              <div className="flex items-baseline space-x-2">
                                <p className="text-xl font-bold text-white">₹{priceDetails.finalPrice.toFixed(2)}</p>
                                {priceDetails.mrp > priceDetails.finalPrice && (
                                  <p className="text-sm text-white/40 line-through ml-2">₹{priceDetails.mrp.toFixed(2)}</p>
                                )}
                                
                              </div>
                              {priceDetails.mrp > priceDetails.finalPrice && (
                                <p className="text-xs font-medium text-green-400">
                                  You save ₹{(priceDetails.mrp - priceDetails.finalPrice).toFixed(2)} ({priceDetails.discount}%)
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => { e.preventDefault(); toggleFavorite(product.id); }}
                          className={`absolute top-3 right-3 p-2 rounded-full transition-colors duration-300 backdrop-blur-sm ${
                            isFav ? 'bg-white text-black' : 'bg-black/50 text-white hover:bg-white/90 hover:text-black'
                          }`}
                          title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Heart size={18} className={isFav ? 'fill-current' : ''} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default SearchResults;
