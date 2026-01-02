import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Heart, Send, ChevronLeft, ChevronRight, X, Volume2, VolumeX, ShoppingCart, ShoppingBag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BASE_URL } from '../../util';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import RelatedVideos from './RelatedVideos';
import axios from 'axios';
import ReactDOM from 'react-dom';

const VideoCard = ({ video, onVideoSelect }) => {
  const { addToCart } = useCart();
  const { toggleFavorite, isVideoFavorited } = useFavorites();
  const navigate = useNavigate();

  // Build display data from video first, then product as fallback
  const display = (() => {
    const vPrice = parseFloat(video.price);
    const vMrp = parseFloat(video.mrp);
    const vGst = parseFloat(video.gst);

    const p = video.product || {};
    const pPrice = parseFloat(p.price);
    const pMrp = parseFloat(p.mrp);
    const pGst = parseFloat(p.gst);

    return {
      name: p.name || video.title || 'Item',
      price: Number.isFinite(vPrice) ? vPrice : (Number.isFinite(pPrice) ? pPrice : 0),
      mrp: Number.isFinite(vMrp) ? vMrp : (Number.isFinite(pMrp) ? pMrp : undefined),
      gst: Number.isFinite(vGst) ? vGst : (Number.isFinite(pGst) ? pGst : undefined),
      product: p
    };
  })();

  const handleAddToCart = async (e, product) => {
    e.stopPropagation(); // Prevent video selection
    try {
      // Check if product exists and has required data
      if (!product || !product.id) {
        toast.error('No product associated with this video');
        return;
      }

      // Get the best available image URL
      const getBestImageUrl = () => {
        // First check if we have a direct image URL
        if (product.image) {
          return product.image.startsWith('http') ? product.image : `${BASE_URL}${product.image}`;
        }
        if (product.imageUrl) {
          return product.imageUrl.startsWith('http') ? product.imageUrl : `${BASE_URL}${product.imageUrl}`;
        }
        // Fall back to video thumbnail if no product image is available
        return getVideoThumbnail(video);
      };

      const imageUrl = getBestImageUrl();

      // Prepare product data with guaranteed image and proper URLs
      const productWithImage = {
        ...product,
        // Ensure we have a valid image URL
        image: imageUrl,
        // Also set imageUrl for compatibility
        imageUrl: imageUrl,
        // Ensure we have a valid base price
        price: display.price || 0,
        // Ensure we have required GST fields
        gst: display.gst || 0,
        gst_type: product.gst_type || 'exclusive',
        // Ensure we have a valid MRP
        mrp: (display.mrp ?? (display.price ? display.price * 1.2 : 0)) || 0
      };

      // Use CartContext to handle API and state
      const ok = await addToCart(productWithImage, 1);
      if (!ok) return; // CartContext shows its own toasts on failure
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const handleBuyNow = async (e, product) => {
    e.stopPropagation(); // Prevent video selection
    try {
      // Get the best available image URL (same logic as handleAddToCart)
      const getBestImageUrl = () => {
        if (product.image) {
          return product.image.startsWith('http') ? product.image : `${BASE_URL}${product.image}`;
        }
        if (product.imageUrl) {
          return product.imageUrl.startsWith('http') ? product.imageUrl : `${BASE_URL}${product.imageUrl}`;
        }
        return getVideoThumbnail(video);
      };

      const imageUrl = getBestImageUrl();

      // Prepare product data with guaranteed fields (same as handleAddToCart)
      const productWithImage = {
        ...product,
        image: imageUrl,
        imageUrl: imageUrl,
        price: display.price || 0,
        gst: display.gst || 0,
        gst_type: product.gst_type || 'exclusive',
        mrp: (display.mrp ?? (display.price ? display.price * 1.2 : 0)) || 0
      };

      // Add the item to cart with complete data
      const ok = await addToCart(productWithImage, 1);
      if (!ok) return;
      
      // Navigate to cart page
      navigate('/cart');
    } catch (error) {
      console.error('Error processing buy now:', error);
      toast.error('Failed to process your request');
    }
  };

  const getVideoThumbnail = (video) => {
    // Use the direct thumbnail URL if available
    if (video.thumbnailUrl) {
      // Handle both relative and absolute URLs
      return video.thumbnailUrl.startsWith('http') 
        ? video.thumbnailUrl 
        : `${BASE_URL}${video.thumbnailUrl.startsWith('/') ? '' : '/'}${video.thumbnailUrl}`;
    }

    // For YouTube videos, generate thumbnail from video ID
    if (video.videoUrl && (video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be'))) {
      let videoId = '';
      if (video.videoUrl.includes('youtube.com/watch?v=')) {
        videoId = video.videoUrl.split('v=')[1].split('&')[0];
      } else if (video.videoUrl.includes('youtu.be/')) {
        videoId = video.videoUrl.split('youtu.be/')[1].split('?')[0];
      }
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    }
    
    // For Vimeo videos, try to extract thumbnail
    if (video.videoUrl && video.videoUrl.includes('vimeo.com')) {
      const vimeoId = video.videoUrl.split('/').pop();
      if (vimeoId) {
        // Note: Vimeo thumbnails require API call, using placeholder for now
        return `https://via.placeholder.com/300x400/4a5568/ffffff?text=${encodeURIComponent(video.title || 'Video')}`;
      }
    }
    
    // Default placeholder with video title
    return `https://via.placeholder.com/300x400/4a5568/ffffff?text=${encodeURIComponent(video.title || 'Video')}`;
  };

  const formatViews = (views) => {
    if (views >= 1000) {
      return (views / 1000).toFixed(1) + 'k Views';
    }
    return views + ' Views';
  }

  const getVideoUrl = (video) => {
    const url = video.videoUrl;
    if (!url) return null;

    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')) {
      return url.startsWith('/uploads/') ? `${BASE_URL}${url}` : url;
    }
    // For YouTube or other URLs, we can't directly play them in a <video> tag on hover easily.
    // We will just show the thumbnail for those.
    return null;
  };

  const videoUrl = getVideoUrl(video);
  const thumbnailUrl = getVideoThumbnail(video);
  const isVideoThumbnail = thumbnailUrl && /\.(mp4|webm|mov|avi)$/i.test(thumbnailUrl);

  return (
    <div 
      className="flex-shrink-0 w-48 md:w-56 rounded-lg overflow-hidden group cursor-pointer relative" 
      onClick={() => onVideoSelect(video)}
    >
      <div className="relative h-[400px] bg-gray-200">
        {isVideoThumbnail ? (
          <video
            src={thumbnailUrl}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300"
          />
        )}
        {/* Offer badge at top-left when MRP > Price */}
        {Number(display.mrp) > Number(display.price) && (
          <div className="absolute left-2 top-2 inline-flex items-center px-2 py-1 rounded bg-yellow-400 text-black text-xs font-bold shadow">
            {Math.round(((Number(display.mrp) - Number(display.price)) / Number(display.mrp)) * 100)}% OFF
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5">
            <span className="text-white text-xs font-medium">{formatViews(video.viewCount || 0)}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(video.id);
            }}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 p-1.5 rounded-full transition-colors"
          >
            <Heart className={`h-4 w-4 ${isVideoFavorited(video.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle share functionality
            }}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 p-1.5 rounded-full transition-colors"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
      {/* Product summary card BELOW the thumbnail */}
      <div className="bg-white border border-gray-200 rounded-1xl z-50 mt-2 p-3 shadow-sm">
        {!!video.title && (
          <p className="text-[11px] text-gray-500 truncate mb-1">{video.title}</p>
        )}
        <div>
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-2">
              <h3 className="text-sm font-bold text-gray-900 truncate">{display.name}</h3>
              <div className="mt-1">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-lg font-bold text-gray-900">₹{Number(display.price).toFixed(2)}</span>
                  <span className="text-xs text-gray-500 line-through">₹{Number(display.mrp).toFixed(2)}</span>

                  {/* {display.gst !== undefined && display.gst !== null && (
                    <span className="text-[11px] text-gray-600">GST: {Number(display.gst) || 0}%</span>
                  )} */}
                </div>
                {Number(display.mrp) > Number(display.price) && (
                  <div className="mt-1 flex items-center gap-2">
                    {/* <span className="text-xs text-gray-500 line-through">₹{Number(display.mrp).toFixed(2)}</span> */}
                    {/* <span className="text-xs font-semibold text-red-600">
                      {Math.round(((Number(display.mrp) - Number(display.price)) / Number(display.mrp)) * 100)}% Off
                    </span> */}
                  </div>
                )}
              </div>
            </div>
            {video.product && video.product.id && (
              <button
                onClick={(e) => handleAddToCart(e, video.product)}
                className="shrink-0 inline-flex items-center gap-1 border border-gray-300 bg-white hover:bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-800 uppercase tracking-wide rounded-full"
                title="Add to Cart"
              >
                <ShoppingCart size={14} className="inline" />
                Add
              </button>
            )}
          </div>

          {video.product && video.product.id && (
            <button
              onClick={(e) => handleBuyNow(e, video.product)}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-xl transition"
            >
              Buy Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SkeletonLoader = () => (
    <div className="flex-shrink-0 w-48 md:w-56 bg-white rounded-lg overflow-hidden border border-gray-200 animate-pulse">
      <div className="h-64 md:h-72 bg-gray-200"></div>
      <div className="p-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gray-200"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
        </div>
        <div className="mt-2 space-y-2">
          <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
          <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );

const VideoPlayerModal = ({ video, onClose, onSelectRelated }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [buyReady, setBuyReady] = useState(false); // toggles to Checkout after first add
    const { addToCart, cart, fetchCart } = useCart();
    const { toggleFavorite, isVideoFavorited } = useFavorites();
    const navigate = useNavigate();

    // Build display values prioritizing video fields then product
    const display = (() => {
        const vPrice = parseFloat(video.price);
        const vMrp = parseFloat(video.mrp);
        const vGst = parseFloat(video.gst);
        const p = video.product || {};
        const pPrice = parseFloat(p.price);
        const pMrp = parseFloat(p.mrp);
        const pGst = parseFloat(p.gst);
        return {
            name: (video.product && video.product.name) || video.title || 'Item',
            price: Number.isFinite(vPrice) ? vPrice : (Number.isFinite(pPrice) ? pPrice : 0),
            mrp: Number.isFinite(vMrp) ? vMrp : (Number.isFinite(pMrp) ? pMrp : undefined),
            gst: Number.isFinite(vGst) ? vGst : (Number.isFinite(pGst) ? pGst : undefined)
        };
    })();

    // Robust product id detection (handles various API shapes)
    const linkedProductId = video.product?.id || video.productId || video.productID || video.product_id || null;

    const getEmbedUrl = (video) => {
        const url = video.videoUrl;
        if (!url) return { type: 'invalid' };

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            let videoId = '';
            if (url.includes('youtube.com/watch?v=')) {
                videoId = url.split('v=')[1].split('&')[0];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            }
            if (videoId) {
                // Hide controls and brand to avoid UI collision with our overlay
                const params = `autoplay=1&playsinline=1&loop=1&controls=0&modestbranding=1&rel=0&mute=${isMuted ? 1 : 0}`;
                return { type: 'youtube', src: `https://www.youtube.com/embed/${videoId}?${params}` };
            }
        } else if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')) {
            const videoSrc = url.startsWith('/uploads/') ? `${BASE_URL}${url}` : url;
            return { type: 'video', src: videoSrc };
        }

        return { type: 'invalid' };
    };

    const embedInfo = getEmbedUrl(video);

    // Add video to favorites
    const handleVideoFavorite = async () => {
        await toggleFavorite(video.id);
    };

    // Add video's product to cart
    const handleAddVideoToCart = async () => {
        if (!linkedProductId) {
            toast.error('No product associated with this video');
            return;
        }

        // Check if product has size options
        const hasSizes = video.product?.availableSizes && video.product.availableSizes.length > 0;
        
        if (hasSizes) {
            // Navigate to product details page to select size
            navigate(`/customer/product/${linkedProductId}`);
            toast('Please select a size to add to cart', { icon: 'ℹ️' });
            return;
        }

        // If no size options, add directly to cart
        if (!video.product) {
            // If product details missing, navigate to details for safer flow
            navigate(`/customer/product/${linkedProductId}`);
            return;
        }
        const ok = await addToCart(video.product, 1);
        if (ok) {
            toast.success('Product added to cart!');
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(video.videoUrl);
        toast.success('Video link copied to clipboard!');
    };

    // Shop Now -> always navigate to product details for selection (e.g., sizes)
    const handleShopNowClick = () => {
        const pid = linkedProductId;
        if (!pid) {
            toast.error('No product associated with this video');
            return;
        }
        navigate(`/customer/product/${pid}`);
    };

    // Buy Now -> first click adds to cart, then becomes Checkout
    const handleBuyNowClick = async () => {
        if (!linkedProductId) {
            toast.error('No product associated with this video');
            return;
        }

        // Check if product has size options
        const hasSizes = video.product.availableSizes && video.product.availableSizes.length > 0;
        
        if (hasSizes) {
            // Navigate to product details page to select size
            navigate(`/customer/product/${linkedProductId}`);
            toast('Please select a size to continue', { icon: 'ℹ️' });
            return;
        }

        if (!buyReady) {
            const ok = await addToCart(video.product, 1);
            if (ok) {
                // Ensure cart is refreshed so we can pick the exact cart item
                await fetchCart();
                setBuyReady(true);
                toast.success('Added to cart. Tap Checkout to proceed.');
            }
            return;
        }
        // Find the corresponding cart item for this product
        const productId = linkedProductId;
        const size = video.product.selectedSize || null;
        let cartItem = cart.find(ci => ci.productId === productId && (size ? ci.selectedSize === size : true));

        // Fallback if not found: construct a minimal item compatible with Checkout
        if (!cartItem) {
            const p = video.product;
            cartItem = {
                id: p.id,
                productId: p.id,
                quantity: 1,
                price: parseFloat(p.price) || 0,
                gst: parseFloat(p.gst) || 0,
                selectedSize: p.selectedSize || null,
                priceBeforeGST: parseFloat(p.priceBeforeGST) || parseFloat(p.price) || 0,
                gstAmount: parseFloat(p.gstAmount) || 0,
                finalPrice: parseFloat(p.finalPrice) || parseFloat(p.price) || 0,
                name: p.name || 'Item'
            };
        }

        navigate('/customer/checkout', { state: { selectedItems: [cartItem] } });
    };

    // Reset buy ready state when video changes
    useEffect(() => {
        setBuyReady(false); // reset when video changes
    }, [video.id]);

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] pointer-events-none" onClick={onClose}>
            <div className="relative w-full max-w-sm h-[80vh] bg-black rounded-lg overflow-hidden pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                {embedInfo.type === 'youtube' && (
                    <div className="w-full h-full relative">
                        <iframe
                            src={embedInfo.src}
                            title={video.title}
                            className="absolute inset-0 w-full h-full pointer-events-none z-0"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                        {(video.product?.id || video.productId) && display && (
                          <div className="absolute bottom-4 left-4 right-4 text-white z-30">
                            {Number(display.mrp) > Number(display.price) && (
                              <div className="mb-2 inline-flex items-center px-2 py-1 rounded bg-yellow-500 text-black text-xs font-bold">
                                {Math.round(((Number(display.mrp) - Number(display.price)) / Number(display.mrp)) * 100)}% OFF!
                              </div>
                            )}

                            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 pr-2">
                                  <h3 className="text-sm font-semibold truncate">{display.name}</h3>
                                  <div className="flex items-baseline space-x-2 mt-1">
                                    <span className="text-lg font-bold">₹{Number(display.price).toFixed(2)}</span>
                                    {display.gst !== undefined && display.gst !== null && (
                                      <span className="text-[11px] text-gray-200/90">GST: {Number(display.gst) || 0}%</span>
                                    )}
                                    {Number(display.mrp) > Number(display.price) && (
                                      <>
                                        <span className="text-gray-300/80 line-through text-xs">₹{Number(display.mrp).toFixed(2)}</span>
                                        <span className="text-green-400 text-xs font-semibold">{
                                          Math.round(((Number(display.mrp) - Number(display.price)) / Number(display.mrp)) * 100)
                                        }% Off</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={handleAddVideoToCart}
                                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition"
                                  title="Add to Cart"
                                >
                                  <ShoppingCart size={18} />
                                </button>
                              </div>

                              {/* Shop Now */}
                              <button
                                onClick={handleShopNowClick}
                                className="mt-3 w-full bg-black hover:bg-gray-900 text-white text-sm font-semibold py-2 rounded-lg transition"
                              >
                                Shop Now
                              </button>
                              {/* Buy Now / Checkout */}
                              <button
                                onClick={handleBuyNowClick}
                                className={`mt-3 w-full ${buyReady ? 'bg-green-600 hover:bg-green-700' : 'bg-black hover:bg-blue-600'} text-white text-sm font-semibold py-2 rounded-lg transition`}
                              >
                                {buyReady ? 'Checkout' : 'Buy Now'}
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                )}
                {embedInfo.type === 'video' && (
                    <div className="w-full h-full relative">
                        <video
                            src={embedInfo.src}
                            title={video.title}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted={isMuted}
                            loop
                        />
                        {(video.product?.id || video.productId) && display && (
                          <div className="absolute bottom-4 left-4 right-4 text-white z-20">
                            {/* Discount badge like screenshot */}
                            {Number(display.mrp) > Number(display.price) && (
                              <div className="mb-2 inline-flex items-center px-2 py-1 rounded bg-yellow-500 text-black text-xs font-bold">
                                {Math.round(((Number(display.mrp) - Number(display.price)) / Number(display.mrp)) * 100)}% OFF!
                              </div>
                            )}

                            {/* Compact product card overlay */}
                            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 pr-2">
                                  <h3 className="text-sm font-semibold truncate">{display.name}</h3>
                                  <div className="flex items-baseline space-x-2 mt-1">
                                    <span className="text-lg font-bold">₹{Number(display.price).toFixed(2)}</span>
                                    {display.gst !== undefined && display.gst !== null && (
                                      <span className="text-[11px] text-gray-200/90">GST: {Number(display.gst) || 0}%</span>
                                    )}
                                    {Number(display.mrp) > Number(display.price) && (
                                      <>
                                        <span className="text-gray-300/80 line-through text-xs">₹{Number(display.mrp).toFixed(2)}</span>
                                        <span className="text-green-400 text-xs font-semibold">{
                                          Math.round(((Number(display.mrp) - Number(display.price)) / Number(display.mrp)) * 100)
                                        }% Off</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={handleAddVideoToCart}
                                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition"
                                  title="Add to Cart"
                                >
                                  <ShoppingCart size={18} />
                                </button>
                              </div>

                              {/* Full-width Buy Now / Checkout button */}
                              {/* Shop Now button to view product detail (like screenshot) */}
                              <button
                                onClick={handleShopNowClick}
                                className="mt-3 w-full bg-black hover:bg-gray-900 text-white text-sm font-semibold py-2 rounded-lg transition"
                              >
                                Shop Now
                              </button>

                              {/* Full-width Buy Now / Checkout button */}
                              {/* <button
                                onClick={handleBuyNowClick}
                                className={`mt-3 w-full ${buyReady ? 'bg-green-600 hover:bg-green-700' : 'bg-black hover:bg-blue-600'} text-white text-sm font-semibold py-2 rounded-lg transition`}
                              >
                                {buyReady ? 'Checkout' : 'Buy Now'}
                              </button> */}
                            </div>
                          </div>
                        )}
                    </div>
                )}
                {embedInfo.type === 'invalid' && (
                    <div className="w-full h-full flex items-center justify-center bg-black text-white">
                        <p>Video not available</p>
                    </div>
                )}
                {/* Fallback overlay for YouTube to avoid iframe stacking issues */}
                {embedInfo.type === 'youtube' && (video.product?.id || video.productId || video.productID || video.product_id) && (
                  <div className="absolute bottom-4 left-4 right-4 text-white z-40">
                    {Number(display.mrp) > Number(display.price) && (
                      <div className="mb-2 inline-flex items-center px-2 py-1 rounded bg-yellow-500 text-black text-xs font-bold">
                        {Math.round(((Number(display.mrp) - Number(display.price)) / Number(display.mrp)) * 100)}% OFF!
                      </div>
                    )}

                    <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <h3 className="text-sm font-semibold truncate">{display.name}</h3>
                          <div className="flex items-baseline space-x-2 mt-1">
                            <span className="text-lg font-bold">₹{Number(display.price).toFixed(2)}</span>
                            {display.gst !== undefined && display.gst !== null && (
                              <span className="text-[11px] text-gray-200/90">GST: {Number(display.gst) || 0}%</span>
                            )}
                            {Number(display.mrp) > Number(display.price) && (
                              <>
                                <span className="text-gray-300/80 line-through text-xs">₹{Number(display.mrp).toFixed(2)}</span>
                                <span className="text-green-400 text-xs font-semibold">{
                                  Math.round(((Number(display.mrp) - Number(display.price)) / Number(display.mrp)) * 100)
                                }% Off</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={handleAddVideoToCart}
                          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition"
                          title="Add to Cart"
                        >
                          <ShoppingCart size={18} />
                        </button>
                      </div>

                      {/* Shop Now */}
                      <button
                        onClick={handleShopNowClick}
                        className="mt-3 w-full bg-black hover:bg-gray-900 text-white text-sm font-semibold py-2 rounded-lg transition"
                      >
                        Shop Now
                      </button>
                      {/* Buy Now / Checkout */}
                      <button
                        onClick={handleBuyNowClick}
                        className={`mt-3 w-full ${buyReady ? 'bg-green-600 hover:bg-green-700' : 'bg-black hover:bg-blue-600'} text-white text-sm font-semibold py-2 rounded-lg transition`}
                      >
                        {buyReady ? 'Checkout' : 'Buy Now'}
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="absolute top-4 right-4 flex items-center space-x-4">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-white">
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                    <button onClick={onClose} className="text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col items-center space-y-6 text-white">
                    <div className="text-center">
                        <span className="font-bold">{(video.viewCount / 1000).toFixed(1)}k</span>
                        <span className="text-xs block">Views</span>
                    </div>
                    <button className="text-center" onClick={handleVideoFavorite}>
                        <Heart size={28} className={isVideoFavorited(video.id) ? 'fill-red-500 text-red-500' : ''} />
                        <span className="text-xs block">{video.likes || 0}</span>
                    </button>
                    <button className="text-center" onClick={handleShare}>
                        <Send size={28} />
                        <span className="text-xs block">Share</span>
                    </button>
                    {video.product && (
                        <button className="text-center" onClick={handleAddVideoToCart}>
                            <ShoppingCart size={28} />
                            <span className="text-xs block">Shop</span>
                        </button>
                    )}
                </div>

            </div>
        </div>,
        document.getElementById('modal-root')
    );
}

const VideoCarousel = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const scrollContainerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  // Cache fetched products to avoid duplicate calls
  const productCacheRef = useRef(new Map());

  // Fetch a product by id with simple in-memory cache
  const fetchProductById = async (productId) => {
    if (!productId) return null;
    const cache = productCacheRef.current;
    if (cache.has(productId)) return cache.get(productId);
    try {
      const res = await axios.get(`${BASE_URL}/api/products/${productId}`);
      if (res.data && res.data.success && res.data.product) {
        cache.set(productId, res.data.product);
        return res.data.product;
      }
    } catch (e) {
      console.warn(`Failed to fetch product ${productId}:`, e);
    }
    return null;
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (isHovering || loading || error || videos.length === 0) return;

    const scrollInterval = setInterval(() => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

        if (scrollLeft + clientWidth >= scrollWidth) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 3000);

    return () => clearInterval(scrollInterval);
  }, [isHovering, loading, error, videos]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/videos/public`);
      if (response.data.success) {
        const videosData = response.data.data;
        // Attach product details where needed using cache
        const enriched = await Promise.all(
          videosData.map(async (v) => {
            if (!v.product && v.productId) {
              const product = await fetchProductById(v.productId);
              if (product) return { ...v, product };
            }
            return v;
          })
        );
        setVideos(enriched);
      } else {
        setError('Failed to load videos');
        toast.error('Failed to load videos');
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError('Failed to load videos');
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = async (video) => {
    try {
      await axios.post(`${BASE_URL}/api/videos/public/${video.id}/view`);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
    // Ensure product details are present before opening modal
    let v = video;
    if (!v.product && v.productId) {
      const product = await fetchProductById(v.productId);
      if (product) v = { ...v, product };
    }
    setSelectedVideo(v);
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
        const scrollAmount = direction === 'left' ? -300 : 300;
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <>
        <div className="bg-transparent py-8 md:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">SHOP OUR BEST SELLERS</h2>
                </div>

                {loading ? (
                    <div className="flex space-x-4 overflow-hidden">
                        {[...Array(5)].map((_, index) => (
                            <SkeletonLoader key={index} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500"> {error} </div>
                ) : videos.length === 0 ? (
                    <div className="text-center py-12 text-gray-500"> No videos available. </div>
                ) : (
                    <div 
                      className="relative"
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                    >
                        <button onClick={() => scroll('left')} className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-gray-800/50 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-gray-700 transition hidden md:block">
                            <ChevronLeft className="h-6 w-6 text-white" />
                        </button>
                        <div ref={scrollContainerRef} className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                            {videos.map((video) => (
                                <VideoCard key={video.id} video={video} onVideoSelect={handleVideoSelect} />
                            ))}
                        </div>
                        <button onClick={() => scroll('right')} className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-gray-800/50 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-gray-700 transition hidden md:block">
                            <ChevronRight className="h-6 w-6 text-white" />
                        </button>
                    </div>
                )}
            </div>
        </div>
        {selectedVideo && (
          <div className="bg-transparent pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <RelatedVideos videoId={selectedVideo.id} onSelect={handleVideoSelect} />
            </div>
          </div>
        )}
        {selectedVideo && <VideoPlayerModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
    </>
  );
};

export default VideoCarousel;
