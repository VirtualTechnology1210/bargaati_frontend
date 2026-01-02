import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import RemoveAlert from '../components/RemoveAlert';
import axios from 'axios';
import { BASE_URL } from '../../util';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showRemoveAlert, setShowRemoveAlert] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [finalPrice, setFinalPrice] = useState(0);

  // Helper function to get auth token
  const getAuthToken = () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      console.log('getAuthToken - token exists:', !!token);
      console.log('getAuthToken - user exists:', !!user);
      
      if (!token || !user) {
        console.log('getAuthToken - missing token or user, returning null');
        return null;
      }
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Helper function to format image URL correctly
  const formatImageUrl = (imgUrl) => {
    if (!imgUrl) return null;
    return imgUrl.startsWith('http') ? imgUrl : `${BASE_URL}${imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`}`;
  };
  
  // Inline SVG data URI for fallback image
  const getPlaceholderImage = () => {
    return 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150" fill="none"%3E%3Crect width="150" height="150" fill="%23f5f5f5"/%3E%3Ctext x="50%" y="50%" font-family="Arial" font-size="14" fill="%23555555" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
  };
  
  // Helper for API requests with auth header
  const getAuthConfig = () => {
    const token = getAuthToken();
    console.log('getAuthConfig - token retrieved:', !!token);
    if (!token) {
      console.log('getAuthConfig - no token, returning null');
      return null;
    }
    
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    console.log('getAuthConfig - returning config with auth header');
    return config;
  };
  
  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  };

  // Helper functions for guest cart
  const getGuestCart = () => {
    try {
      return JSON.parse(localStorage.getItem('guestCart') || '[]');
    } catch (error) {
      console.error('Error reading guest cart:', error);
      return [];
    }
  };

  const saveGuestCart = (items) => {
    try {
      localStorage.setItem('guestCart', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving guest cart:', error);
    }
  };

  // Fetch cart from API on component mount only if authenticated
  useEffect(() => {
    // Always use fetchCart, it handles both auth and guest (with normalization)
    fetchCart();
  }, []);

  // Fetch cart items from API
  const fetchCart = useCallback(async () => {
    const authConfig = getAuthConfig();
    
    if (!authConfig) {
      // For guests, load cart from localStorage and normalize missing fields (GST, image)
      try {
        const guestItemsRaw = getGuestCart();
        const normalized = guestItemsRaw.map((item) => {
          // Ensure image URL
          const image = item.image || (item.imageUrl ? formatImageUrl(item.imageUrl) : getPlaceholderImage());

          // Ensure GST fields
          const basePrice = parseFloat(item.price) || 0;
          const gstRate = item.gst != null ? parseFloat(item.gst) : (parseFloat(item.gstRate) || 0);
          const gstType = item.gst_type || (item.isGstInclusive ? 'inclusive' : 'exclusive');
          let priceBeforeGST = item.priceBeforeGST != null ? parseFloat(item.priceBeforeGST) : null;
          let gstAmount = item.gstAmount != null ? parseFloat(item.gstAmount) : null;
          let finalPrice = item.finalPrice != null ? parseFloat(item.finalPrice) : null;

          if (priceBeforeGST == null || gstAmount == null || finalPrice == null) {
            if (gstType === 'inclusive' && basePrice > 0 && gstRate >= 0) {
              const pb = basePrice / (1 + gstRate / 100);
              const ga = basePrice - pb;
              priceBeforeGST = Number(pb.toFixed(2));
              gstAmount = Number(ga.toFixed(2));
              finalPrice = Number(basePrice.toFixed(2));
            } else {
              const pb = basePrice;
              const ga = basePrice * (gstRate / 100);
              priceBeforeGST = Number(pb.toFixed(2));
              gstAmount = Number(ga.toFixed(2));
              finalPrice = Number((pb + ga).toFixed(2));
            }
          }

          return {
            ...item,
            image,
            gst: gstRate,
            gst_type: gstType || 'exclusive',
            priceBeforeGST,
            gstAmount,
            finalPrice,
          };
        });

        setCart(normalized);
        setError(null);
      } catch (e) {
        console.warn('Failed to load guest cart:', e);
        setCart([]);
      }
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${BASE_URL}/api/cart/get`, authConfig);
      
      if (response.data && response.data.success && Array.isArray(response.data.cartItems)) {
        const apiCartItems = response.data.cartItems;
        
        const frontendCartItems = apiCartItems.map(item => {
          const product = item.product || {};
          const sizedMrp = product?.currentPrice?.mrp;
          // Use item.price first (from cart item), fallback to product.price
          const basePrice = parseFloat(item.price) || parseFloat(product.price) || 0;
          const gstRate = parseFloat(product.gst) || 0;
          const gstType = product.gst_type || 'exclusive';
          // Get size from item (cart item level) or product level
          const selectedSize = item.size || product.selectedSize || null;
          
          // Calculate GST fields if not provided
          let priceBeforeGST = parseFloat(product.priceBeforeGST) || 0;
          let gstAmount = parseFloat(product.gstAmount) || 0;
          let finalPrice = parseFloat(product.finalPrice) || 0;
          
          if (!priceBeforeGST || !gstAmount || !finalPrice) {
            if (gstType === 'inclusive' && basePrice > 0 && gstRate >= 0) {
              priceBeforeGST = basePrice / (1 + gstRate / 100);
              gstAmount = basePrice - priceBeforeGST;
              finalPrice = basePrice;
            } else {
              // Default to exclusive GST
              priceBeforeGST = basePrice;
              gstAmount = basePrice * (gstRate / 100);
              finalPrice = priceBeforeGST + gstAmount;
            }
          }
          
          return {
            id: item.id,
            productId: product.id,
            name: product.name || 'Unknown Product',
            price: basePrice,
            mrp: parseFloat(sizedMrp ?? product.mrp) || 0,
            quantity: item.quantity || 1,
            // Handle image from various possible fields
            image: (product.image
              ? (product.image.startsWith('http') ? product.image : formatImageUrl(product.image))
              : (product.imageUrl ? formatImageUrl(product.imageUrl) : getPlaceholderImage())),
            selectedSize: selectedSize,
            availableSizes: Array.isArray(product.availableSizes) 
              ? product.availableSizes 
              : (product.availableSizes 
                  ? (typeof product.availableSizes === 'string' 
                      ? product.availableSizes.split(',').map(s => s.trim())
                      : product.availableSizes)
                  : (product.size 
                      ? (typeof product.size === 'string' 
                          ? product.size.split(',').map(s => s.trim())
                          : product.size)
                      : (Array.isArray(product.productSizes) 
                          ? product.productSizes.map(s => s.size_value || s.size || s) 
                          : []))),
            category: product.categoryName || product.category || 'Uncategorized',
            brand: product.brand || '',
            description: product.description || '',
            // GST fields
            gst: gstRate,
            gst_type: gstType,
            gstRate: gstRate, // Backward compatibility
            isGstInclusive: gstType === 'inclusive', // Backward compatibility
            // Pre-calculated GST values
            priceBeforeGST: Number(priceBeforeGST.toFixed(2)),
            gstAmount: Number(gstAmount.toFixed(2)),
            finalPrice: Number(finalPrice.toFixed(2)),
            discount: parseFloat(product.discount) || 0,
            // Additional metadata
            cartItemId: item.id,
            ...(product.selectedSizePrice && { selectedSizePrice: product.selectedSizePrice }),
            // Stock management fields from backend
            stockQuantity: Number(
              product.stockQuantity ?? product.stock_quantity ?? 0
            ),
            lowStockThreshold: (
              product.lowStockThreshold ?? product.low_stock_threshold ?? null
            ),
            isActive: (
              (product.isActive !== undefined ? product.isActive : undefined) ??
              (product.is_active !== undefined ? product.is_active : undefined) ??
              true
            ),
            minOrderQuantity: Number(
              product.minOrderQuantity ?? product.min_order_quantity ?? 1
            ),
            maxOrderQuantity: (
              product.maxOrderQuantity ?? product.max_order_quantity ?? null
            )
          };
        });
        
        setCart(frontendCartItems);
      } else {
        setCart([]);
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
      
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to load cart');
      }
      setCart([]);
    } finally {
      setLoading(false);
    }
  }, [BASE_URL]);

  const addToCart = async (product, quantity = 1, selectedSize = null) => {
    if (!product?.id) {
      toast.error('Invalid product');
      return false;
    }

    const validQty = Math.max(1, Number(quantity) || 1);
    
    try {
      if (isAuthenticated()) {
        // For authenticated users, ensure we're sending size if it exists
        const payload = {
          productId: product.id,
          quantity: validQty,
          ...(selectedSize && { size: selectedSize })
        };
        
        const response = await axios.post(`${BASE_URL}/api/cart/add`, payload, getAuthConfig());
        
        // If the API returns the updated cart, use it directly
        if (response.data?.success && Array.isArray(response.data.cartItems)) {
          const updatedItems = response.data.cartItems.map(item => ({
            ...item,
            selectedSize: item.size || null, // Ensure selectedSize is set
            product: {
              ...item.product,
              // Ensure availableSizes is properly formatted
              availableSizes: item.product.availableSizes || 
                (item.product.size ? item.product.size.split(',').map(s => s.trim()) : [])
            }
          }));
          setCart(updatedItems);
        } else {
          // Fallback to refetching the cart
          await fetchCart();
        }
      } else {
        const guestCart = getGuestCart();
        
        // For guest cart, we need to match both product ID and size to consider it the same item
        const existingIndex = guestCart.findIndex(item => {
          const sameProduct = item.productId === product.id;
          const sameSize = (item.selectedSize || null) === (selectedSize || null);
          return sameProduct && sameSize;
        });

        // Prefer size-based price/MRP if passed from ProductDetails
        const sizedPrice = product.selectedSizePrice?.price ?? product.currentPrice?.price;
        const sizedMrp = product.selectedSizePrice?.mrp ?? product.currentPrice?.mrp;
        
        // Compute GST-related fields for guests so checkout can show proper prices and tax
        const basePrice = parseFloat(sizedPrice ?? product.price) || 0;
        const gstRate = parseFloat(product.gst) || 0;
        const gstType = product.gst_type || 'exclusive';
        
        let priceBeforeGST = 0;
        let gstAmount = 0;
        let finalPriceCalc = 0;

        if (gstType === 'inclusive' && basePrice > 0 && gstRate >= 0) {
          priceBeforeGST = basePrice / (1 + gstRate / 100);
          gstAmount = basePrice - priceBeforeGST;
          finalPriceCalc = basePrice;
        } else {
          // treat as exclusive by default
          priceBeforeGST = basePrice;
          gstAmount = basePrice * (gstRate / 100);
          finalPriceCalc = priceBeforeGST + gstAmount;
        }
        
        // Format availableSizes to ensure it's always an array
        const formatSizes = (sizes) => {
          if (Array.isArray(sizes)) return sizes;
          if (typeof sizes === 'string') return sizes.split(',').map(s => s.trim());
          if (Array.isArray(product.productSizes)) {
            return product.productSizes.map(s => s.size_value || s.size || s);
          }
          return [];
        };
        
        const availableSizes = formatSizes(
          product.availableSizes || product.size || product.productSizes || []
        );

        const newItem = {
          id: `guest-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: basePrice,
          mrp: parseFloat(sizedMrp ?? product.mrp) || 0,
          // Pre-calc values for guest parity with authenticated cart
          priceBeforeGST: Number(priceBeforeGST.toFixed(2)),
          gstAmount: Number(gstAmount.toFixed(2)),
          finalPrice: Number((product.finalPrice ?? finalPriceCalc).toFixed(2)),
          gst: gstRate,
          gst_type: gstType,
          quantity: validQty,
          // Accept either image or imageUrl from product
          image: (product.image
            ? (product.image.startsWith('http') ? product.image : formatImageUrl(product.image))
            : (product.imageUrl ? formatImageUrl(product.imageUrl) : getPlaceholderImage())),
          selectedSize: selectedSize || null,
          availableSizes: availableSizes,
        };

        if (existingIndex >= 0) {
          guestCart[existingIndex].quantity += validQty;
        } else {
          guestCart.push(newItem);
        }

        setCart(guestCart);
        saveGuestCart(guestCart);
      }

      toast.success('Added to cart');
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(error.response?.data?.message || 'Failed to add to cart');
      return false;
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      if (isAuthenticated()) {
        // Find the cart item to extract productId and size
        const cartItem = cart.find(item => item.id === itemId);
        if (!cartItem) {
          toast.error('Cart item not found');
          return false;
        }

        const payload = {
          productId: cartItem.productId,
          ...(cartItem.selectedSize ? { size: cartItem.selectedSize } : {})
        };

        await axios.post(`${BASE_URL}/api/cart/remove`, payload, getAuthConfig());
        await fetchCart();
      } else {
        const updatedCart = cart.filter(item => item.id !== itemId);
        setCart(updatedCart);
        saveGuestCart(updatedCart);
      }
      toast.success('Item removed from cart');
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item');
      return false;
    }
  };

  const updateQuantity = async (cartItemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    
    // Find the cart item to get the productId
    const cartItem = cart.find(item => item.id === cartItemId);
    if (!cartItem) {
      toast.error('Cart item not found');
      return;
    }
    
    const authConfig = getAuthConfig();
    if (!authConfig) {
      // Guest: update localStorage cart
      const updated = cart.map(item =>
        item.id === cartItemId ? { ...item, quantity } : item
      );
      setCart(updated);
      saveGuestCart(updated);
      return;
    }
    
    try {
      const response = await axios.post(`${BASE_URL}/api/cart/update`, {
        productId: cartItem.productId,
        quantity,
        size: cartItem.selectedSize
      }, authConfig);
      
      if (response.data && response.data.success) {
        await fetchCart();
      } else {
        toast.error('Failed to update cart');
      }
    } catch (err) {
      console.error('Error updating cart:', err);
      
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to update cart');
      }
    }
  };

  const clearCart = async () => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      // Guest: clear local cart
      setCart([]);
      saveGuestCart([]);
      toast.success('Cart cleared');
      setSelectedItems([]);
      return;
    }
    
    try {
      // Remove items one by one since there's no bulk delete endpoint
      const promises = cart.map(item => 
        axios.post(`${BASE_URL}/api/cart/remove`, {
          productId: item.productId,
          size: item.selectedSize
        }, authConfig)
      );
      
      await Promise.all(promises);
      await fetchCart();
      
      toast.success("Cart cleared", {
        description: "All items have been removed from your cart"
      });
      
      setSelectedItems([]);
    } catch (err) {
      console.error('Error clearing cart:', err);
      
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to clear cart');
      }
    }
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const calculateItemPrice = (item) => {
    // Use pre-calculated finalPrice from backend, fallback to old calculation if not available
    return parseFloat(item.finalPrice) || parseFloat(item.price) || 0;
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      const itemTotalPrice = calculateItemPrice(item) * item.quantity;
      return total + itemTotalPrice;
    }, 0);
  };
  
  const getSelectedItemsTotal = () => {
    return cart
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => total + (item.finalPrice || item.price) * item.quantity, 0);
  };
  
  const toggleItemSelection = (productId) => {
    setSelectedItems(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };
  
  const selectAllItems = () => {
    setSelectedItems(cart.map(item => item.id));
  };
  
  const deselectAllItems = () => {
    setSelectedItems([]);
  };
  
  const isItemSelected = (productId) => {
    return selectedItems.includes(productId);
  };

  const getSelectedItems = () => {
    return cart.filter(item => selectedItems.includes(item.id));
  };

  const removeSelectedItemsFromCart = async () => {
    console.log('removeSelectedItemsFromCart called with selectedItems:', selectedItems);
    
    const authConfig = getAuthConfig();
    if (!authConfig) {
      // Guest: remove selected by local id
      if (selectedItems.length === 0) {
        toast.error('No items selected for removal');
        return;
      }
      const updated = cart.filter(item => !selectedItems.includes(item.id));
      setCart(updated);
      saveGuestCart(updated);
      setSelectedItems([]);
      toast.success(`Successfully removed items from cart`);
      return;
    }
    
    if (selectedItems.length === 0) {
      toast.error('No items selected for removal');
      return;
    }
    
    try {
      console.log(`Attempting to remove ${selectedItems.length} items:`, selectedItems);
      
      // Remove selected items one by one
      const promises = selectedItems.map(cartItemId => {
        // Find the cart item to get its product ID and size information
        const cartItem = cart.find(item => item.id === cartItemId);
        if (!cartItem) {
          console.error('Cart item not found for ID:', cartItemId);
          return Promise.resolve({ data: { success: false, message: 'Cart item not found' } });
        }
        
        const payload = {
          productId: cartItem.productId
        };
        
        // Include size if the item has one
        if (cartItem.selectedSize) {
          payload.size = cartItem.selectedSize;
        }
        
        console.log('Cart item found:', { cartItemId: cartItem.id, productId: cartItem.productId, selectedSize: cartItem.selectedSize });
        console.log('Removing cart item ID:', cartItemId, 'with payload:', payload);
        return axios.post(`${BASE_URL}/api/cart/remove`, payload, authConfig);
      });
      
      console.log('Waiting for all removal promises to complete...');
      const results = await Promise.all(promises);
      console.log('All removal requests completed:', results.map(r => r.data));
      
      console.log('Fetching updated cart...');
      await fetchCart();
      
      // Clear selected items after removal
      setSelectedItems([]);
      console.log('Selected items cleared, removal process complete');
      
      toast.success(`Successfully removed ${selectedItems.length} items from cart`, {
        description: "Items have been removed from your cart"
      });
    } catch (err) {
      console.error('Error removing selected items from cart:', err);
      
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to remove items from cart');
      }
    }
  };

  // New function to remove specific items from cart (used after order completion)
  const removeSpecificItemsFromCart = async (itemsToRemove) => {
    // Guard against duplicate/concurrent calls
    if (!removeSpecificItemsFromCart._inProgressRef) {
      removeSpecificItemsFromCart._inProgressRef = { current: false };
    }
    if (removeSpecificItemsFromCart._inProgressRef.current) {
      console.log('removeSpecificItemsFromCart skipped: already in progress');
      return;
    }
    removeSpecificItemsFromCart._inProgressRef.current = true;

    const authConfig = getAuthConfig();
    if (!authConfig) {
      // Guest: remove matching items from the local cart
      try {
        const updated = cart.filter(item => {
          return !itemsToRemove.some(rem => {
            const remPid = rem.productId || rem.id;
            const remSize = rem.selectedSize || rem.size || null;
            const itemSize = item.selectedSize || null;
            // Match either by exact local id or by productId + size
            return rem.id === item.id || (remPid === item.productId && remSize === itemSize);
          });
        });
        setCart(updated);
        saveGuestCart(updated);
        return;
      } catch (e) {
        console.error('Error removing guest items from cart:', e);
        return;
      }
    }
    
    try {
      // Deduplicate by productId + size to avoid repeated calls for same item
      const uniqueMap = new Map();
      for (const rem of (itemsToRemove || [])) {
        const pid = rem.productId || rem.id;
        const size = rem.selectedSize || rem.size || '';
        if (!pid) continue;
        const key = `${pid}|${size}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, { productId: pid, size: size || undefined });
        }
      }
      const uniqueRemovals = Array.from(uniqueMap.values());

      if (uniqueRemovals.length === 0) {
        console.log('removeSpecificItemsFromCart: nothing to remove');
        return;
      }

      console.log('Removing specific items from cart (deduped):', uniqueRemovals);
      
      // For items with the same product but different sizes, we need to handle them carefully
      // The backend cart/remove API expects productId and optionally size
      const promises = uniqueRemovals.map(item => {
        const payload = { productId: item.productId };
        if (item.size) payload.size = item.size;
        console.log('Removing cart item with payload:', payload);
        return axios.post(`${BASE_URL}/api/cart/remove`, payload, authConfig);
      });
      
      await Promise.all(promises);
      await fetchCart();
      
      console.log('Successfully removed ordered items from cart');
    } catch (err) {
      console.error('Error removing specific items from cart:', err);
      
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.error('Session expired. Please log in again.');
      } else {
        console.error('Failed to remove ordered items from cart');
        // Don't show error toast here as order was successful
      }
    }
  };

  // Method to initialize cart after login
  const initializeCart = useCallback(() => {
    if (isAuthenticated()) {
      fetchCart();
    }
  }, [fetchCart]);

  const value = {
    cart,
    selectedItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    isItemSelected,
    getSelectedItems,
    getSelectedItemsTotal,
    removeSelectedItemsFromCart,
    removeSpecificItemsFromCart,
    loading,
    error,
    fetchCart,
    initializeCart,
    isAuthenticated,
    getItemSize: (productId) => {
      const item = cart.find(item => item.id === productId);
      return item ? item.selectedSize : null;
    },
    getAvailableSizes: (productId) => {
      const item = cart.find(item => item.id === productId);
      return item ? item.availableSizes : [];
    }
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      <RemoveAlert />
    </CartContext.Provider>
  );
};