import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ShoppingCart, ArrowRight, Trash, ShoppingBag, CheckSquare, Square, CheckCircle, Minus, Plus, X, Tag, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../util';
import { toast } from 'react-hot-toast';
import PageLayout from '../components/PageLayout';
// import BackgroundParticles from '../components/BackgroundParticles';

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
import CartDebugInfo from '../components/CartDebugInfo';

// Modern Checkbox component with animation
const Checkbox = ({ checked, onCheckedChange, className }) => {
  return (
    <button
      onClick={() => onCheckedChange(!checked)}
      className={`flex items-center justify-center transition-all duration-200 ${className || ''}`}
    >
      {checked ? (
        <CheckSquare className="h-5 w-5 text-shop-primary transition-transform duration-200 transform scale-110" />
      ) : (
        <Square className="h-5 w-5 text-gray-400 transition-all duration-200" />
      )}
    </button>
  );
};

// Cart Item component with enhanced UI
const CartItem = ({ item, stockMap }) => {
  const { updateQuantity, removeFromCart, toggleItemSelection, isItemSelected } = useCart();
  const selected = isItemSelected ? isItemSelected(item.id) : false;

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
    
    // Only check max limits when increasing quantity
    if (newQuantity > item.quantity) {
      // Prefer live values from stockMap if available
      const live = stockMap?.[item.productId] || {};
      const maxOrderQuantity = (live.maxOrderQuantity !== undefined ? live.maxOrderQuantity : (item.maxOrderQuantity || item.max_order_quantity));
      if (maxOrderQuantity && newQuantity > maxOrderQuantity) {
        toast.error(`Maximum order quantity is ${maxOrderQuantity} for "${item.name}"`);
        return;
      }
      
      // Check stock availability
      const stockQuantity = (live.stockQuantity !== undefined ? live.stockQuantity : (item.stockQuantity || item.stock_quantity || 0));
      if (newQuantity > stockQuantity) {
        toast.error(`Only ${stockQuantity} items available in stock for "${item.name}"`);
        return;
      }
    }
    
    updateQuantity(item.id, newQuantity);
  };

  // Use pre-calculated GST values from backend (no frontend calculation needed)
  const priceDetails = {
    priceBeforeGST: item.priceBeforeGST || 0,
    gstAmount: item.gstAmount || 0,
    finalPrice: item.finalPrice || 0,
    discount: item.discount || 0,
    mrp: item.mrp || 0,
    quantity: item.quantity || 1,
    gstRate: item.gst || 0,
    isInclusive: item.gst_type === 'inclusive'
  };



  // Use the actual product ID for product detail links
  const productDetailId = item.productId;

  return (
    <div className={`relative flex flex-col sm:flex-row items-stretch sm:items-center py-4 px-3 md:py-5 md:px-4 rounded-2xl transition-all duration-300 bg-gradient-to-b from-black to-gray-900 ${selected ? 'shadow-lg border border-gray-600 ring-1 ring-blue-500/30' : 'border border-gray-700 hover:ring-1 hover:ring-blue-500/30'}`}>
      {priceDetails.mrp > 0 && priceDetails.mrp > priceDetails.finalPrice && (
        <div className="absolute top-2 right-3 z-10">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-400 text-black shadow ring-1 ring-green-500/50">
            {Math.round(((priceDetails.mrp - priceDetails.finalPrice) / priceDetails.mrp) * 100)}% OFF
          </span>
        </div>
      )}
      <div className="mr-4">
        <Checkbox
          checked={selected}
          onCheckedChange={() => toggleItemSelection(item.id)}
          className="h-5 w-5"
        />
      </div>

      <Link to={`/customer/product/${productDetailId}`} className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg">
        <img
          src={item.image || '/assets/placeholder.png'}
          alt={item.name}
          className="h-full w-full object-cover object-center bg-gray-100"
          onError={(e) => {
            console.log('Image failed to load:', e.target.src); // Debug logging
            e.target.onerror = null;
            // Use inline SVG as data URI for fallback
            e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150" fill="none"%3E%3Crect width="150" height="150" fill="%23f5f5f5"/%3E%3Ctext x="50%" y="50%" font-family="Arial" font-size="14" fill="%23555555" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />
      </Link>

      <div className="mt-3 sm:mt-0 sm:ml-4 flex flex-1 flex-col">
        <div className="flex flex-col sm:flex-row justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/customer/product/${productDetailId}`} className="text-base font-medium text-white hover:text-yellow-500 transition-colors duration-200 group block truncate md:max-w-[420px]">
              {item.name || `Product #${item.id}`}
              <span className="block max-w-0 group-hover:max-w-full transition-all duration-300 h-0.5 bg-blue-600"></span>
            </Link>
            {item.brand && (
              <p className="text-xs text-gray-400 mt-1 font-medium">{item.brand}</p>
            )}
            <div className="flex gap-2 flex-wrap mt-1.5">
              {/* <p className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full inline-block">
                {item.categoryName || 'Category'}
              </p> */}
              {item.selectedSize && (
                <p className="text-sm text-gray-600 bg-blue-50 px-2 py-0.5 rounded-full inline-flex items-center">
                  <span className="mr-1">Size:</span>
                  <span className="font-medium">{item.selectedSize}</span>
                </p>
              )}
              
              {/* Payment Types Display */}
              {(() => {
                const live = stockMap?.[item.productId] || {};
                const allow_cod = live.allow_cod !== undefined ? !!live.allow_cod : (item.allow_cod ?? item.allowCOD ?? true);
                const allow_card = live.allow_card !== undefined ? !!live.allow_card : (item.allow_card ?? item.allowCard ?? true);
                const allow_upi = live.allow_upi !== undefined ? !!live.allow_upi : (item.allow_upi ?? item.allowUPI ?? true);
                const allow_advance = live.allow_advance !== undefined ? !!live.allow_advance : (item.allow_advance ?? item.allowAdvance ?? true);
                
                const paymentMethods = [];
                if (allow_cod) paymentMethods.push('COD');
                if (allow_card) paymentMethods.push('Card');
                if (allow_upi) paymentMethods.push('UPI');
                if (allow_advance) paymentMethods.push('Advance');
                
                if (paymentMethods.length > 0) {
                  return (
                    <p className="text-xs text-gray-600 bg-green-50 px-2 py-0.5 rounded-full inline-flex items-center">
                      <span className="mr-1">Payment:</span>
                      <span className="font-medium">{paymentMethods.join(', ')}</span>
                    </p>
                  );
                }
                return null;
              })()}
              
            </div>
          </div>

          <div className="text-right mt-2 sm:mt-0 w-full sm:w-auto">
            <div className="flex flex-col items-end gap-2 w-full">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xl md:text-2xl font-extrabold text-white tracking-tight whitespace-nowrap">₹{priceDetails.finalPrice.toFixed(2)}</span>
                {priceDetails.mrp > 0 && priceDetails.mrp > priceDetails.finalPrice && (
                  <span className="text-sm line-through text-gray-500 whitespace-nowrap">₹{priceDetails.mrp.toFixed(2)}</span>
                )}
              </div>

              {/* Row: quantity (left) and total (right) */}
              <div className="w-full grid grid-cols-2 items-center gap-3 sm:w-auto md:min-w-[360px]">
                <div className="flex items-center border border-gray-600 rounded-full overflow-hidden shadow-sm bg-gray-700 justify-self-start">
                  <button
                    onClick={() => handleQuantityChange(item.quantity - 1)}
                    className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                    disabled={item.quantity <= 1}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-3 py-1 text-white text-sm min-w-[28px] text-center font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.quantity + 1)}
                    disabled={(() => {
                      const live = stockMap?.[item.productId] || {};
                      const maxOrderQuantity = (live.maxOrderQuantity !== undefined ? live.maxOrderQuantity : (item.maxOrderQuantity || item.max_order_quantity));
                      const stockQuantity = (live.stockQuantity !== undefined ? live.stockQuantity : (item.stockQuantity || item.stock_quantity || 0));
                      return (maxOrderQuantity && item.quantity >= maxOrderQuantity) || item.quantity >= stockQuantity;
                    })()}
                    className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 ml-1 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors rounded-full"
                    aria-label="Remove item"
                  >
                    <Trash size={16} />
                  </button>
                </div>

                <div className="text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 rounded-full w-max shadow justify-self-end whitespace-nowrap">
                  Total: ₹{(priceDetails.finalPrice * priceDetails.quantity).toFixed(2)}
                </div>
              </div>

              {/* Show quantity limits info */}
              <div className="text-xs text-gray-400 mt-2 col-span-2">
                {(() => {
                  const live = stockMap?.[item.productId] || {};
                  const maxOrderQuantity = (live.maxOrderQuantity !== undefined ? live.maxOrderQuantity : (item.maxOrderQuantity || item.max_order_quantity));
                  const stockQuantity = (live.stockQuantity !== undefined ? live.stockQuantity : (item.stockQuantity || item.stock_quantity || 0));
                  const minOrderQuantity = (live.minOrderQuantity !== undefined ? live.minOrderQuantity : (item.minOrderQuantity || item.min_order_quantity || 1));
                  
                  let info = [];
                  if (minOrderQuantity > 1) {
                    info.push(`Min: ${minOrderQuantity}`);
                  }
                  if (maxOrderQuantity) {
                    info.push(`Max: ${maxOrderQuantity}`);
                  }
                  // if (stockQuantity > 0) {
                  //   info.push(`Stock: ${stockQuantity}`);
                  // }
                  
                  return info.length > 0 ? info.join(' • ') : '';
                })()}
              </div>
              {/* Stock Status Indicator */}
              <div className="col-span-2 mt-2">
                {(() => {
                  const live = stockMap?.[item.productId] || {};
                  const stockQuantity = (live.stockQuantity !== undefined ? live.stockQuantity : (item.stockQuantity || item.stock_quantity || 0));
                  const isActive = (live.isActive !== undefined ? live.isActive : (item.isActive !== false));
                  
                  if (!isActive) {
                    return (
                      <div className="flex items-center text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md">
                        <div className="w-2 h-2 mr-2 bg-red-400 rounded-full"></div>
                        Product Unavailable
                      </div>
                    );
                  }
                  
                  if (stockQuantity === 0) {
                    return (
                      <div className="flex items-center text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md">
                        <div className="w-2 h-2 mr-2 bg-red-400 rounded-full"></div>
                        Out of Stock
                      </div>
                    );
                  }
                  
                  if (item.quantity > stockQuantity) {
                    return (
                      <div className="flex items-center text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-md">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                        Quantity exceeds stock ({stockQuantity} available)
                      </div>
                    );
                  }
                  
                  if (stockQuantity <= (live.lowStockThreshold !== undefined ? live.lowStockThreshold : (item.lowStockThreshold || item.low_stock_threshold || 5))) {
                    return (
                      <div className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                        Low Stock ({stockQuantity} left)
                      </div>
                    );
                  }
                  
                  return (
                    <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      In Stock (available)
                    </div>
                  );
                })()}
              </div>

              {/* <p className="text-xs text-gray-600 mt-1">Inclusive of all taxes</p> */}
            </div>
          </div>

        </div>

        {/* Bottom row removed; controls moved next to amount */}
      </div>
    </div >
  );
};

const CartPage = () => {
  const navigate = useNavigate();
  const {
    cart,
    clearCart,
    getTotalPrice,
    selectedItems,
    selectAllItems,
    deselectAllItems,
    getSelectedItemsTotal,
    getSelectedItems,
    toggleItemSelection,
    removeFromCart,
    removeSelectedItemsFromCart,
    loading,
    error,
    fetchCart
  } = useCart();

  // Remove duplicate calculateTotals and use the one below

  const [isAllSelected, setIsAllSelected] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const isEmpty = cart.length === 0;

  // Live stock map for items in cart { [productId]: { stockQuantity, minOrderQuantity, maxOrderQuantity, isActive } }
  const [stockMap, setStockMap] = useState({});

  // Poll lightweight bulk stock for all products in cart
  useEffect(() => {
    const ids = [...new Set(cart.map(it => it.productId || it.id))].filter(Boolean);
    if (ids.length === 0) { setStockMap({}); return; }

    let timer;
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await axios.post(`${BASE_URL}/api/products/stock/bulk`, { ids }, { timeout: 8000 });
        if (!data?.success || cancelled) return;
        const map = {};
        for (const s of data.stocks || []) map[s.id] = s;
        setStockMap(map);
      } catch (_) { /* silent */ }
    };

    load();
    timer = setInterval(load, 5000);

    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [cart]);

  // Calculate totals using pre-calculated GST values from backend
  const calculateTotals = () => {
    return cart.reduce((totals, item) => {
      const quantity = item.quantity || 1;
      // Use pre-calculated values from backend
      const priceBeforeGST = parseFloat(item.priceBeforeGST) || 0;
      const gstAmount = parseFloat(item.gstAmount) || 0;
      const finalPrice = parseFloat(item.finalPrice) || 0;

      return {
        subtotal: totals.subtotal + (priceBeforeGST * quantity),
        totalGst: totals.totalGst + (gstAmount * quantity),
        total: totals.total + (finalPrice * quantity)
      };
    }, {
      subtotal: 0,
      totalGst: 0,
      total: 0
    });
  };

  const { total: totalPrice } = calculateTotals();
  const selectedItemsTotal = getSelectedItemsTotal();
  const hasSelectedItems = selectedItems.length > 0;

  // Refresh cart data when page loads
  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update isAllSelected when selectedItems changes
  useEffect(() => {
    setIsAllSelected(selectedItems.length === cart.length && cart.length > 0);
  }, [selectedItems, cart]);

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      deselectAllItems();
    } else {
      selectAllItems();
    }
  };

  const removeSelectedItems = () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected for removal');
      return;
    }
    
    setShowRemoveConfirm(true);
  };

  const confirmRemoveSelected = async () => {
    console.log('confirmRemoveSelected called');
    console.log('Selected items before removal:', selectedItems);
    console.log('Cart items before removal:', cart.map(item => ({ id: item.id, name: item.name })));
    
    setShowRemoveConfirm(false);
    setIsRemoving(true);
    
    try {
      await removeSelectedItemsFromCart();
      console.log('After removeSelectedItemsFromCart call completed');
    } catch (error) {
      console.error('Error in confirmRemoveSelected:', error);
      toast.error('Failed to remove selected items');
    } finally {
      setIsRemoving(false);
    }
  };

  const cancelRemoveSelected = () => {
    setShowRemoveConfirm(false);
  };


  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="relative overflow-hidden">
      
        <div className="container mx-auto px-3 sm:px-4 py-6 md:py-12 max-w-7xl relative z-10">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
              Your Shopping Cart
            </h1>
            <div className="w-32 h-1.5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full mb-6 mx-auto md:mx-0"></div>
            <p className="text-white max-w-2xl mx-auto md:mx-0">Review your items and proceed to checkout</p>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="flex items-center">
                <X className="h-5 w-5 mr-2" />
                {error}
              </p>
              {error.includes('Session expired') && (
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 inline-flex items-center justify-center"
                  >
                    <LogIn className="h-4 w-4 mr-1" />
                    Login
                  </button>
                  <button
                    onClick={fetchCart}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Continue shopping with guest cart
                  </button>
                </div>
              )}
              {!error.includes('Session expired') && (
                <button
                  onClick={fetchCart}
                  className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {!loading && !error && isEmpty ? (
            <div className="bg-black rounded-2xl shadow-xl p-8 md:p-12 text-center border border-gray-700 max-w-3xl mx-auto">
              <div className="flex justify-center mb-8">
                <div className="relative animate-pulse">
                  <div className="absolute inset-0 bg-blue-50 rounded-full blur-xl opacity-70"></div>
                  <ShoppingCart size={120} className="relative text-blue-400/50" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Your cart is empty</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">Looks like you haven't added any products to your cart yet. Explore our collection to find something you'll love.</p>
              <Link
                to="/customer/shop"
                className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-3.5 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium group"
              >
                Start Shopping
                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </div>
          ) : (
            !loading && !error && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 order-1 lg:order-1">
                  <div className="bg-black rounded-2xl shadow-lg border border-gray-700">
                    <div className="flex justify-between items-center p-5 md:p-6 bg-black">
                      <div className="flex items-center">
                        <div className="mr-3">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAllToggle}
                            className="h-5 w-5 text-blue-600  rounded-sm"
                          />
                        </div>
                        <h2 className="text-lg md:text-xl font-bold text-white">Cart Items ({cart.length})</h2>
                        {hasSelectedItems && (
                          <span className="ml-2 text-sm text-yellow-300 bg-yellow-900/50 px-2.5 py-1 rounded-full font-medium">
                            {selectedItems.length} selected
                          </span>
                        )}
                      </div>

                    </div>
                    <div className="divide-y divide-gray-700 p-4 md:p-6 space-y-3">
                      {cart.map((item) => (
                        <CartItem key={item.id} item={item} stockMap={stockMap} />
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <Link
                      to="/customer/shop"
                      className="flex items-center text-white hover:text-yellow-400 font-medium transition-colors duration-200 group"
                    >
                      <ArrowRight size={18} className="mr-2 transform rotate-180 group-hover:-translate-x-1 transition-transform duration-200" />
                      <span>Continue Shopping</span>
                    </Link>

                    {hasSelectedItems && (
                      <button
                        className="flex items-center text-white bg-gray-700 hover:bg-gray-600 transition-colors duration-200 px-4 py-2 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={removeSelectedItems}
                        disabled={isRemoving}
                      >
                        {isRemoving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash size={16} className="mr-2" />
                            Remove Selected ({selectedItems.length})
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1 order-2 lg:order-2 mb-6 lg:mb-0">
                  <div className="bg-black-800 rounded-2xl shadow-lg border border-gray-700 lg:sticky lg:top-4">
                    <div className="p-6 border-b border-gray-700">
                      <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                        <CheckCircle className="mr-2 text-white" size={20} />
                        Order Summary
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-5">
                        {(() => {
                          const { subtotal, totalGst, total } = calculateTotals();
                          return (
                            <>
                              <div className="flex justify-between items-center">
                                <p className="text-gray-400">Subtotal (before GST)</p>
                                <p className="font-medium text-white">₹{subtotal.toFixed(2)}</p>
                              </div>
                              <div className="flex justify-between items-center">
                                <p className="text-gray-400">GST</p>
                                <p className="font-medium text-white">₹{totalGst.toFixed(2)}</p>
                              </div>
                              <div className="flex justify-between items-center">
                                <p className="text-gray-400">Shipping</p>
                                <p className="font-medium text-gray-500">Calculated at checkout</p>
                              </div>

                              <div className="p-5 md:p-6 border-b border-gray-800">
                                <div className="flex justify-between items-center">
                                  <p className="text-lg font-bold text-white">Total (incl. GST)</p>
                                  <p className="text-lg font-bold text-white">₹{total.toFixed(2)}</p>
                                </div>
                                {hasSelectedItems && (
                                  <div className="mt-2 flex justify-between text-sm">
                                    <p className="text-white font-bold">Selected Items</p>
                                    <p className="font-medium text-white">₹{selectedItemsTotal.toFixed(2)}</p>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={() => {
                            const selectedCartItems = getSelectedItems();
                            if (selectedCartItems.length === 0) {
                              return;
                            }

                            // Validate stock for all selected items
                            const stockIssues = [];
                            for (const item of selectedCartItems) {
                              const live = stockMap?.[item.productId] || {};
                              const stockQuantity = (live.stockQuantity !== undefined ? live.stockQuantity : (item.stockQuantity || item.stock_quantity || 0));
                              const isActive = (live.isActive !== undefined ? live.isActive : (item.isActive !== false));
                              
                              if (!isActive) {
                                stockIssues.push(`${item.name} is no longer active`);
                              } else if (stockQuantity === 0) {
                                stockIssues.push(`${item.name} is out of stock`);
                              } else if (item.quantity > stockQuantity) {
                                stockIssues.push(`${item.name}: Only ${stockQuantity} available, but ${item.quantity} in cart`);
                              }
                            }
                            
                            if (stockIssues.length > 0) {
                              toast.error(`Cannot proceed to checkout:\n${stockIssues.join('\n')}`);
                              return;
                            }

                            navigate('/customer/checkout', {
                              state: {
                                selectedItems: selectedCartItems
                              }
                            });
                          }}
                          className="mt-8 w-full bg-white hover:bg-white text-black py-3.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center group disabled:opacity-70 disabled:hover:bg-yellow-500 disabled:cursor-not-allowed"
                          disabled={!hasSelectedItems || (() => {
                            // Disable if any selected item has stock issues
                            const selectedCartItems = getSelectedItems();
                            return selectedCartItems.some(item => {
                              const live = stockMap?.[item.productId] || {};
                              const stockQuantity = (live.stockQuantity !== undefined ? live.stockQuantity : (item.stockQuantity || item.stock_quantity || 0));
                              const isActive = (live.isActive !== undefined ? live.isActive : (item.isActive !== false));
                              return !isActive || stockQuantity === 0 || item.quantity > stockQuantity;
                            });
                          })()}
                        >
                          <span>Proceed to Checkout</span>
                          <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>


      {/* Remove Selected Items Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash className="w-5 h-5 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Remove Selected Items</h3>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove {selectedItems.length} selected item{selectedItems.length > 1 ? 's' : ''} from your cart? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={cancelRemoveSelected}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveSelected}
                disabled={isRemoving}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isRemoving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Removing...
                  </>
                ) : (
                  'Remove Items'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;


