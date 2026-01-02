import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Trash2, ShoppingBag, Heart } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { BASE_URL, getImageUrl } from '../../util';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';

// Simple module-level cache for fetched products to avoid repeated calls
const productCache = new Map();

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

const FavoritesItem = ({ product, onRemove, onAddToCart }) => {
  const {
    id,
    productname,
    brand,
    price,
    mrp,
    rating,
    gst = 18,
    gstType = 'exclusive',
    productimages,
    category
  } = product;

  const imageUrl = getImageUrl(productimages?.[0]?.imageurl);
  const priceDetails = calculatePrices(price, mrp, gst, gstType === 'inclusive');
  
  return (
        <div className="bg-white border border-white/10 rounded-lg overflow-hidden h-full flex flex-col group transition-all duration-300 hover:shadow-xl hover:shadow-white/5 hover:border-white/20 relative">
      <div className="relative">
        <button
          onClick={() => onRemove(id)}
          className="absolute top-2 right-2 bg-white text-black p-1.5 rounded-full hover:bg-white/90 transition-all z-10"
          title="Remove from favorites"
        >
          <Trash2 size={14} className="" />
        </button>
        <Link to={`/customer/product/${id}`}>
          <div className="relative w-full h-36 sm:h-44 overflow-hidden">
            <img
              src={imageUrl || 'https://placehold.co/300x200/111/666?text=No+Image'}
              alt={productname}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        </Link>
        {priceDetails.discount > 0 && (
          <div className="absolute top-2 right-12 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            {priceDetails.discount}% OFF
          </div>
        )}
      </div>

      <div className="p-3 flex-grow flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1">
          <span className="text-xs text-black/70 mb-0.5 sm:mb-1">{brand || 'Brand'}</span>
        </div>

        <Link
          to={`/customer/product/${id}`}
          className="font-semibold text-sm text-black mb-1 flex-grow hover:text-blue/20 transition-colors"
        >
          {productname}
        </Link>

        <div className="flex items-center mb-2">
          <div className="flex items-center mr-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className={`sm:w-4 sm:h-4 ${i < Math.round(rating || 0) ? 'text-amber-300 fill-amber-300' : 'text-amber-300'}`}
              />
            ))}
          </div>
          <span className="text-xs text-black/60 ml-2">({rating?.toFixed(1) || 'N/A'})</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-black-200">₹{priceDetails.finalPrice.toLocaleString()}</span>
              {priceDetails.mrp > priceDetails.finalPrice && (
                                <span className="text-sm text-white line-through">₹{priceDetails.mrp.toLocaleString()}</span>
              )}
            </div>
            {priceDetails.discount > 0 && (
                            <span className="text-xs font-semibold text-green-500">
                You save ₹{(priceDetails.mrp - priceDetails.finalPrice).toLocaleString()}
              </span>
            )}
            {/* <span className="text-xs text-gray-500 mt-0.5">
              {gstType === 'inclusive' ? "Incl. GST" : `+${gst}% GST`}
            </span> */}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-1">
          <button
            onClick={() => onAddToCart(product)}
                        className="flex-1 bg-blue-500 text-gray-900 px-2 py-1.5 rounded-md text-xs font-bold hover:bg-amber-400 flex items-center justify-center gap-1 transition-all"
          >
            <ShoppingCart size={14} /> Add
          </button>
          <button
            onClick={() => onRemove(id)}
                        className="flex-1 bg-red-500 text-gray-300 hover:bg-gray-600 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all"
            title="Remove from favorites"
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
};


const Favorites = () => {
  const navigate = useNavigate();
  const [favoritesItems, setFavoritesItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'videos'
  const { addToCart } = useCart();
  const { favorites: videoFavorites, removeFromFavorites: removeVideoFromFavorites, loading: videoLoading } = useFavorites();
  const [publicVideosMap, setPublicVideosMap] = useState(null);


  // Fetch favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (token) {
        try {
          const productResponse = await axios.get(`${BASE_URL}/api/favorites`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFavoritesItems(productResponse.data.favorites);

          // Video favorites are now handled by FavoritesContext
        } catch (err) {
          console.error('Error fetching favorites:', err);
          setError('Failed to fetch favorites');
        } finally {
          setLoading(false);
        }
      } else {
        const localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]').map(p => ({ product: p, productId: p.id }));
        setFavoritesItems(localFavorites);
        // Assuming no local storage for video favorites for now
        setLoading(false);
      }
    };

    fetchFavorites();
    window.addEventListener('favoritesUpdate', fetchFavorites);
    return () => window.removeEventListener('favoritesUpdate', fetchFavorites);
  }, []);

  // Load public videos once, used to hydrate favorites that only have videoId
  useEffect(() => {
    const loadPublicVideos = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/videos/public`);
        const list = res.data?.data || res.data?.videos || [];
        const map = new Map(list.map(v => [v.id, v]));
        setPublicVideosMap(map);
      } catch (e) {
        console.warn('Failed to load public videos for hydration:', e);
        setPublicVideosMap(new Map());
      }
    };
    loadPublicVideos();
  }, []);

  // Remove from favorites
  const handleRemoveFromFavorites = async (productId) => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.delete(`${BASE_URL}/api/favorites/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFavoritesItems((prev) => prev.filter((p) => p.productId !== productId));
        toast.success('Removed from favorites');
        window.dispatchEvent(new CustomEvent('favoritesUpdate'));
      } catch (err) {
        toast.error('Error removing from favorites');
      }
    } else {
      let localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      localFavorites = localFavorites.filter((p) => p.id !== productId);
      localStorage.setItem('favorites', JSON.stringify(localFavorites));
      setFavoritesItems(localFavorites.map(p => ({ product: p, productId: p.id })));
      toast.success('Removed from favorites');
      window.dispatchEvent(new CustomEvent('favoritesUpdate'));
    }
  };

  // Add to cart (guests navigate to product details for proper selection)
  const handleAddToCart = (product) => {
    const isLoggedIn = !!(localStorage.getItem('token') && localStorage.getItem('user'));
    const pid = product?.id || product?.productId;
    if (!isLoggedIn) {
      if (pid) {
        navigate(`/customer/product/${pid}`);
      } else {
        toast.error('Invalid product');
      }
      return;
    }
    addToCart(product, 1);
    toast.success('Added to cart');
  };

  // Remove video from favorites
  const handleRemoveVideoFromFavorites = async (videoId) => {
    await removeVideoFromFavorites(videoId);
  };

  // Add video's product to cart (accepts product object or video object)
  // For products with sizes, navigate to product details page to select size
  const handleAddVideoProductToCart = (input) => {
    // input could be:
    // - a product object
    // - a video object with .product
    // - a wrapper like { video: { product } }
    const product = input?.product || input?.video?.product || input;
    if (product && (product.id || product.productId || product.productname || product.name)) {
      const pid = product.id || product.productId;
      if (pid) {
        navigate(`/customer/product/${pid}`);
        return;
      }
    }
    toast.error("No product associated with this video");
  };

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white/200">My Favorites</h1>
          <button
            onClick={() => navigate('/customer/shop')}
            className="mt-3 sm:mt-0 bg-white-500 text-white-900 px-4 sm:px-5 py-2.5 rounded-lg hover:bg-white-400 flex items-center gap-2 sm:gap-3 transition-all font-semibold"
          >
            <ShoppingBag size={16} /> Continue Shopping
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'products'
                ? 'text-white-400 border-b-2 border-white-400'
                : 'text-gray-400 hover:text-white-500'
            }`}
          >
            Products ({favoritesItems.length})
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'videos'
                ? 'text-white-400 border-b-2 border-white-400'
                : 'text-gray-400 hover:text-white-500'
            }`}
          >
            Videos ({videoFavorites.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60 text-lg">Loading your favorites...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-white/90 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : activeTab === 'products' ? (
          favoritesItems.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="mx-auto text-white/30 mb-8" size={64} />
              <h2 className="text-xl sm:text-2xl text-white mb-4">No favorite products yet.</h2>
              <p className="text-white/60 mb-6">
                Start adding products to your favorites by clicking the heart icon on product pages.
              </p>
              <button
                onClick={() => navigate('/customer/shop')}
                className="bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-white/90 transition-all"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {favoritesItems.map(fav => (
                <FavoritesItem
                  key={fav.id}
                  product={fav.product}
                  onRemove={() => handleRemoveFromFavorites(fav.productId)}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )
        ) : (
          videoFavorites.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="mx-auto text-white/30 mb-8" size={64} />
              <h2 className="text-xl sm:text-2xl text-white mb-4">No favorite videos yet.</h2>
              <p className="text-white/60 mb-6">
                Start adding videos to your favorites by clicking the heart icon while watching videos.
              </p>
              <button
                onClick={() => navigate('/customer/home')}
                className="bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-white/90 transition-all"
              >
                Browse Videos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {videoFavorites.map(fav => (
                <VideoFavoriteItem
                  key={fav.id || fav.videoId}
                  video={fav.video || (publicVideosMap && publicVideosMap.get(fav.videoId || fav.id)) || fav}
                  onRemove={() => handleRemoveVideoFromFavorites(fav.videoId || fav.id)}
                  onAddToCart={handleAddVideoProductToCart}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

// Video Favorite Item Component
const VideoFavoriteItem = ({ video, onRemove, onAddToCart }) => {
  const navigate = useNavigate();
  const [fetchedProduct, setFetchedProduct] = useState(video.product || null);
  const linkedProductId = video.product?.id || video.productId || video.productID || video.product_id || null;

  // Fetch associated product if missing, works for guests too (public endpoint)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!linkedProductId || fetchedProduct) return;
      if (productCache.has(linkedProductId)) {
        if (!cancelled) setFetchedProduct(productCache.get(linkedProductId));
        return;
      }
      try {
        const res = await axios.get(`${BASE_URL}/api/products/${linkedProductId}`);
        const prod = res.data?.product || res.data?.data || null;
        if (prod) {
          productCache.set(linkedProductId, prod);
          if (!cancelled) setFetchedProduct(prod);
        }
      } catch (e) {
        // non-fatal: product info just won't show
        console.warn('Failed to fetch associated product', linkedProductId, e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [linkedProductId, fetchedProduct]);
  
  // Normalize video thumbnail URL (local uploads or absolute). Fallback to YouTube thumbnail or placeholder.
  const getVideoThumbnail = (video) => {
    let thumb =
      video.thumbnailUrl ||
      video.thumbnail ||
      video.thumbnailurl ||
      video.thumbnail_url ||
      video.thumnailurl || // common misspelling from backend
      video.thumbUrl ||
      video.thumburl;
    if (thumb) {
      // If backend sent an object, extract a URL-like field
      if (typeof thumb === 'object') {
        thumb = thumb.imageurl || thumb.url || thumb.imageUrl || '';
      }
      if (typeof thumb === 'string' && thumb.length > 0) {
        return getImageUrl(thumb);
      }
    }
    // Try to derive thumbnail from YouTube video URL across multiple key variants
    const rawUrl =
      video.videoUrl ||
      video.videourl ||
      video.video_url ||
      video.url ||
      video.link ||
      video.video_link ||
      video.fileUrl ||
      video.fileurl ||
      video.path ||
      video.videoPath ||
      video.videopath ||
      '';
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
    // If we have a local/absolute video URL (mp4, webm, mov, ogg), return it to render as <video>
    if (rawUrl) {
      const lower = rawUrl.toLowerCase();
      const isVideo = ['.mp4', '.webm', '.mov', '.ogg', '.mkv', '.avi'].some(ext => lower.endsWith(ext));
      if (isVideo) {
        return getImageUrl(rawUrl);
      }
    }
    // Use local placeholder available in public/
    return '/LOGO_ecom.png';
  };

  // Normalize the associated product image URL from various shapes
  const getProductImageUrl = (product) => {
    if (!product) return '';
    // Prefer normalized images array
    if (Array.isArray(product.images) && product.images.length > 0) {
      const first = product.images[0];
      const url = typeof first === 'string' ? first : (first.imageurl || first.url || first.imageUrl);
      return getImageUrl(url);
    }
    // Fallback to productimages association
    if (Array.isArray(product.productimages) && product.productimages.length > 0) {
      const url = product.productimages[0]?.imageurl;
      return getImageUrl(url);
    }
    // Single URL fields
    const single = product.imageUrl || product.imageurl || product.image;
    if (single) return getImageUrl(single);
    return '';
  };

  return (
        <div className="bg-black border border-white/10 rounded-lg overflow-hidden h-full flex flex-col group transition-all duration-300 hover:shadow-xl hover:shadow-white/5 hover:border-white/20 relative">
      <div className="relative">
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 bg-white text-black p-1.5 rounded-full hover:bg-white/90 transition-all z-10"
          title="Remove from favorites"
        >
          <Trash2 size={14} />
        </button>
        <div className="relative w-full h-36 sm:h-44 overflow-hidden cursor-pointer"
             onClick={() => navigate('/customer/videos')}>
          {(() => {
            const thumbUrl = getVideoThumbnail(video);
            const isVideoThumb = typeof thumbUrl === 'string' && /\.(mp4|webm|mov|ogg|mkv|avi)(\?.*)?$/i.test(thumbUrl);
            if (isVideoThumb) {
              return (
                <video
                  src={thumbUrl}
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              );
            }
            return (
              <img
                src={thumbUrl || '/LOGO_ecom.png'}
                alt={video.title || 'Video thumbnail'}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                onError={(e) => { if (e.currentTarget.src !== window.location.origin + '/LOGO_ecom.png') e.currentTarget.src = '/LOGO_ecom.png'; }}
              />
            );
          })()}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-2 left-2 text-white text-xs font-medium bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
            {(() => {
              const vc = typeof video.viewCount === 'number' ? video.viewCount : (typeof video.view_count === 'number' ? video.view_count : 0);
              return vc ? `${(vc / 1000).toFixed(1)}k Views` : '0 Views';
            })()}
          </div>
        </div>
      </div>

      <div className="p-3 flex-grow flex flex-col">
        <h3 className="font-semibold text-sm text-white mb-1 flex-grow line-clamp-2 group-hover:text-white/90">
          {video.title || video.name || 'Video'}
        </h3>
        
        {(fetchedProduct || video.product) && (
          <div className="mt-auto">
            <div className="flex items-center space-x-2 mb-2">
              <img 
                src={getProductImageUrl(fetchedProduct || video.product) || '/LOGO_ecom.png'} 
                alt={(fetchedProduct?.name || fetchedProduct?.productname || video.product?.name || video.product?.productname) || 'Product'} 
                className="w-8 h-8 rounded-lg object-cover border border-white/10"
              />
              <span className="text-sm text-white/70 truncate">{(fetchedProduct?.name || fetchedProduct?.productname || video.product?.name || video.product?.productname) || ''}</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mb-2">
              <span className="font-bold text-white">₹{(fetchedProduct?.price ?? video.product?.price) || 0}</span>
              {Number(fetchedProduct?.mrp ?? video.product?.mrp) > Number(fetchedProduct?.price ?? video.product?.price) && (
                <span className="text-white/40 line-through text-sm">₹{fetchedProduct?.mrp ?? video.product?.mrp}</span>
              )}
            </div>
            <button
              onClick={() => onAddToCart(fetchedProduct || video.product)}
              className="w-full bg-black text-white font-semibold py-2 px-3 rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart size={16} />
              Add to Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
