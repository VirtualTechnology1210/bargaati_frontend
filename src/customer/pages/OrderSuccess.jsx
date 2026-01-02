import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Home, ShoppingBag, RefreshCw } from 'lucide-react';
// import BackgroundParticles from '../components/BackgroundParticles';
import axios from 'axios';
import { BASE_URL, getImageUrl } from '../../util';
import { toast, Toaster } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
const OrderSuccess = () => {
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState('Processing payment confirmation...');
  const [statusNote, setStatusNote] = useState('You will receive an email confirmation shortly.');
  const [isPaid, setIsPaid] = useState(false);
  const [recentOrder, setRecentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { removeSpecificItemsFromCart } = useCart();
  const [orderedItemsForCleanup, setOrderedItemsForCleanup] = useState([]);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);

  // Cancel any pending online order (UPI/Card/Advance)
  const cancelPendingOrderIfAny = async () => {
    try {
      const raw = localStorage.getItem('pending_order_id');
      if (!raw) return;
      const pendingOrderId = parseInt(raw, 10);
      if (!Number.isFinite(pendingOrderId)) return;
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/payments/cancel-pending`, { orderId: pendingOrderId }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (e) {
      // non-blocking
      console.warn('[OrderSuccess] Failed to cancel pending order', e?.response?.data || e.message);
    } finally {
      try { localStorage.removeItem('pending_order_id'); } catch {}
    }
  };

  // Start periodic status checking for pending payments
  const startPeriodicStatusCheck = () => {
    // Clear any existing interval
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }

    console.log('[OrderSuccess] Starting periodic status check for pending payment');
    
    const interval = setInterval(async () => {
      try {
        console.log('[OrderSuccess] Periodic status check...');
        await fetchRecentOrder();
        
        // Check if payment is now confirmed
        if (recentOrder) {
          const paymentStatus = (recentOrder.payment_status || '').toLowerCase();
          const phonepeStatus = (recentOrder.phonepe_status || '').toLowerCase();
          
          if (paymentStatus === 'paid' || paymentStatus === 'partial_paid' || phonepeStatus === 'success') {
            console.log('[OrderSuccess] Payment confirmed during periodic check!');
            setIsPaid(true);
            setStatusText('Payment Confirmed ✅');
            setStatusNote('Your payment has been confirmed successfully. We are processing your order.');
            clearInterval(interval);
            setStatusCheckInterval(null);
          } else if (paymentStatus === 'failed' || phonepeStatus === 'failed') {
            console.log('[OrderSuccess] Payment failed during periodic check');
            clearInterval(interval);
            setStatusCheckInterval(null);
            toast.error('Payment failed. Please try again.');
            await cancelPendingOrderIfAny();
            navigate('/customer/order-failed');
          }
        }
      } catch (error) {
        console.error('[OrderSuccess] Error during periodic status check:', error);
      }
    }, 5000); // Check every 5 seconds

    setStatusCheckInterval(interval);

    // Stop checking after 2 minutes to avoid infinite polling
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setStatusCheckInterval(null);
        console.log('[OrderSuccess] Stopped periodic status check after timeout');
      }
    }, 120000); // 2 minutes
  };

  // Fetch recent order
  const fetchRecentOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setStatusText('Order Placed Successfully!');
        setStatusNote('Please login to view order details.');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${BASE_URL}/api/orders/latest`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.order) {
        setRecentOrder(response.data.order);
        
        // Capture the fetched order for downstream status checks
        const order = response.data.order;
        console.log('[OrderSuccess] Fetched order:', {
          id: order.id,
          paymentmode: order.paymentmode,
          payment_status: order.payment_status,
          phonepe_status: order.phonepe_status
        });

        // Use the most recent order data (updated if UPI)
        const finalOrder = recentOrder || order;
        const paymentMode = (finalOrder.paymentmode || '').toUpperCase();
        const phonepeStatus = (finalOrder.phonepe_status || '').toLowerCase();
        const paymentStatus = (finalOrder.payment_status || '').toLowerCase();

        console.log('[OrderSuccess] Final order status check:', {
          paymentMode,
          phonepeStatus,
          paymentStatus,
          orderId: finalOrder.id
        });

        // Check if we're on the success page intentionally (don't redirect immediately for pending)
        // Only redirect to failed if we have explicit failure indicators
        if ((paymentStatus === 'failed' || phonepeStatus === 'failed') || 
            (paymentStatus === 'cancelled' || phonepeStatus === 'cancelled')) {
          toast.error('Payment failed. Please try again.');
          await cancelPendingOrderIfAny();
          navigate('/customer/order-failed');
          return;
        }

        // For pending status, don't redirect immediately - give time for status to update
        if (paymentStatus === 'pending' || phonepeStatus === 'pending') {
          console.log('[OrderSuccess] Payment is pending, but staying on success page to allow status updates');
          setStatusText('Processing payment confirmation...');
          setStatusNote('We are verifying your payment. This may take a moment.');
          // Start periodic status checking for pending payments
          startPeriodicStatusCheck();
          // Don't redirect - stay on success page
        }

        // COD orders are always successful
        if (paymentMode === 'COD') {
          setIsPaid(true);
          setStatusText('Order Placed Successfully! ✅');
          setStatusNote('Your COD order has been placed successfully. Thank you for your purchase!');
          setRecentOrder(finalOrder);
          setLoading(false);
          return;
        }

        // For UPI payments, check the actual updated status
        if (paymentMode === 'UPI') {
          console.log('[OrderSuccess] UPI payment detected, checking updated status');
          
          // Use the actual updated payment status
          if (paymentStatus === 'paid' || phonepeStatus === 'success') {
            console.log('[OrderSuccess] UPI payment confirmed as paid in database');
            setIsPaid(true);
            setStatusText('Payment Confirmed ✅');
            setStatusNote('Your UPI payment has been confirmed successfully. We are processing your order.');
            setRecentOrder(finalOrder);
            setLoading(false);
            
            // Clear any PhonePe transaction ID to prevent status checks
            try { localStorage.removeItem('phonepe_mtid'); } catch {}
            
            return; // Exit early for successful UPI
          } else {
            console.log('[OrderSuccess] UPI payment not yet confirmed, but staying on success page');
            setStatusText('Processing payment confirmation...');
            setStatusNote('We are verifying your UPI payment. This may take a moment.');
            setRecentOrder(finalOrder);
            setLoading(false);
            // Don't redirect - stay on success page and let user see the processing message
          }
        }

        // For other online payments, check status - but prioritize success
        if (phonepeStatus === 'success' || paymentStatus === 'paid' || paymentStatus === 'partial_paid') {
          setIsPaid(true);
          setStatusText('Payment Confirmed ✅');
          setStatusNote('Your payment has been confirmed successfully. We are processing your order.');
          setRecentOrder(order);
          return; // Exit early on success
        }
        
        if (phonepeStatus === 'failed' || paymentStatus === 'failed') {
          toast.error('Payment failed. Please try again.');
          await cancelPendingOrderIfAny();
          navigate('/customer/order-failed');
          return;
        }
        
        // For pending status in fetchRecentOrder, don't redirect - stay and show processing
        if (phonepeStatus === 'pending' || paymentStatus === 'pending') {
          console.log('[OrderSuccess] Payment pending in fetchRecentOrder, showing processing message');
          setStatusText('Processing payment confirmation...');
          setStatusNote('We are verifying your payment. This may take a moment.');
          setLoading(false);
          // Don't redirect - stay on success page
        }
      }
    } catch (error) {
      console.error('[OrderSuccess] Error fetching recent order:', error);
      toast.error('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  // Manual status check function
  const checkPaymentStatusManually = async () => {
    try {
      setLoading(true);
      setStatusText('Checking payment status...');
      setStatusNote('Please wait while we verify your payment.');
      
      console.log('[OrderSuccess] Manual status check initiated');
      await fetchRecentOrder();
      
      // Also try to check PhonePe status if we have a transaction ID
      const mtid = localStorage.getItem('phonepe_mtid');
      if (mtid && recentOrder) {
        try {
          const token = localStorage.getItem('token');
          const { data } = await axios.get(`${BASE_URL}/api/payments/phonepe/status/${encodeURIComponent(mtid)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          
          if (data.success && data.data) {
            const phonepeStatus = (data.data.phonepeStatus || '').toLowerCase();
            const paymentStatus = (data.data.paymentStatus || '').toLowerCase();
            
            if (paymentStatus === 'paid' || paymentStatus === 'partial_paid' || phonepeStatus === 'success') {
              setIsPaid(true);
              setStatusText('Payment Confirmed ✅');
              setStatusNote('Your payment has been confirmed successfully. We are processing your order.');
              toast.success('Payment status updated!');
            }
          }
        } catch (phonepeError) {
          console.error('[OrderSuccess] PhonePe status check error:', phonepeError);
        }
      }
      
    } catch (error) {
      console.error('[OrderSuccess] Manual status check error:', error);
      toast.error('Failed to check payment status');
    } finally {
      setLoading(false);
    }
  };

  // Update payment status to paid for UPI orders
  const updatePaymentStatusToPaid = async (orderId) => {
    try {
      console.log('[OrderSuccess] Calling updatePaymentStatusToPaid for order:', orderId);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${BASE_URL}/api/payments/update-to-paid`, 
        { orderId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('[OrderSuccess] updatePaymentStatusToPaid response:', response.data);

      if (response.data.success) {
        console.log('[OrderSuccess] Payment status successfully updated to paid');
        setStatusText('Payment Confirmed ✅');
        setStatusNote('Thank you! Your UPI payment has been confirmed successfully. We are processing your order.');
        setIsPaid(true);
        toast.success('Payment status updated to paid!');
        
        // Update the recent order state
        setRecentOrder(prev => ({
          ...prev,
          payment_status: 'paid',
          phonepe_status: 'success'
        }));
      } else {
        console.error('[OrderSuccess] updatePaymentStatusToPaid failed:', response.data);
        toast.error('Failed to update payment status: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('[OrderSuccess] Error updating payment status:', error);
      console.error('[OrderSuccess] Error response:', error.response?.data);
      if (error.response?.status === 400) {
        // This might not be a UPI order, continue with normal flow
        console.log('[OrderSuccess] 400 error, treating as non-UPI order');
        setStatusText('Order Placed Successfully!');
        setStatusNote('Your order has been placed successfully. Thank you for your purchase!');
      } else {
        toast.error('Failed to update payment status: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Handle PhonePe redirect query params first (e.g., ?status=FAILURE|PENDING|SUCCESS)
        try {
          const params = new URLSearchParams(window.location.search);
          const qpStatus = (params.get('status') || '').toUpperCase();
          if (qpStatus === 'FAILURE' || qpStatus === 'FAILED' || qpStatus === 'CANCELLED') {
            toast.error('Payment failed. Please try again.');
            await cancelPendingOrderIfAny();
            navigate('/customer/order-failed');
            return;
          }
          if (qpStatus === 'PENDING') {
            toast('Payment is pending. Please try again or contact support.');
            await cancelPendingOrderIfAny();
            navigate('/customer/order-failed');
            return;
          }
        } catch {}

        const mtid = localStorage.getItem('phonepe_mtid');
        if (!mtid) {
          // No PhonePe transaction, fetch recent order and check if UPI
          await fetchRecentOrder();
          return;
        }

        // If we already determined success from recent order, don't override it
        if (isPaid) {
          console.log('[OrderSuccess] Already determined as paid, skipping PhonePe status check');
          return;
        }
        
        // Do not skip for UPI - always verify status via backend
        // We will proceed to call PhonePe status or fallback to order-based status check

        const token = localStorage.getItem('token');
        let data;
        if (mtid) {
          const resp = await axios.get(`${BASE_URL}/api/payments/phonepe/status/${encodeURIComponent(mtid)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          data = resp.data;
        } else {
          // Fallback: no merchantTransactionId found in storage, try by latest order
          try {
            const recentResp = await axios.get(`${BASE_URL}/api/orders/latest`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (recentResp.data.success && recentResp.data.order) {
              const orderId = recentResp.data.order.id;
              console.log('[OrderSuccess] No mtid found. Fallback to status-by-order for order:', orderId);
              const statusByOrderResp = await axios.get(`${BASE_URL}/api/payments/phonepe/status-by-order/${orderId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              });
              data = statusByOrderResp.data;
            }
          } catch (e) {
            console.warn('[OrderSuccess] Fallback status-by-order failed', e?.response?.data || e.message);
          }
        }

        console.log('[OrderSuccess] PhonePe status response:', data);
        if (data?.data) {
          console.log('[OrderSuccess] Full data.data object:', JSON.stringify(data.data, null, 2));
        }

        if (data.success && data.data) {
          const phonepeStatus = (data.data.phonepeStatus || '').toLowerCase();
          const orderState = (data.data.phonepeOrderState || '').toUpperCase();
          const paymentStatus = (data.data.paymentStatus || '').toLowerCase();

          console.log('[OrderSuccess] Status values:', { phonepeStatus, orderState, paymentStatus });
          console.log('[OrderSuccess] Raw data.data:', data.data);

          // Check for success conditions - prioritize actual payment status over PhonePe status
          const isActuallyPaid = paymentStatus === 'paid' || paymentStatus === 'partial_paid';
          const isPhonePeSuccess = phonepeStatus === 'success' || orderState === 'COMPLETED';
          const isApiSuccess = data.data.success === true || data.data.isPaid === true;
          
          console.log('[OrderSuccess] Success checks:', { isActuallyPaid, isPhonePeSuccess, isApiSuccess });
          
          if (isActuallyPaid || isPhonePeSuccess || isApiSuccess) {
            setIsPaid(true);
            setStatusText('Payment Confirmed ✅');
            setStatusNote('Thank you! Your PhonePe payment has been confirmed successfully. We are processing your order.');
            try { localStorage.removeItem('pending_order_id'); } catch {}
            console.log('[OrderSuccess] Payment confirmed as successful');
          } else if (phonepeStatus === 'failed' || orderState === 'FAILED' || paymentStatus === 'failed') {
            console.log('[OrderSuccess] Payment failed, redirecting to failure page');
            toast.error('Payment failed. Please try again.');
            await cancelPendingOrderIfAny();
            navigate('/customer/order-failed');
            return;
          } else if (phonepeStatus === 'pending' || orderState === 'PENDING' || paymentStatus === 'pending') {
            console.log('[OrderSuccess] Payment pending, showing processing message but staying on success page');
            setStatusText('Processing payment confirmation...');
            setStatusNote('We are verifying your payment. This may take a moment.');
            // Don't redirect - stay on success page to allow status updates
          } else {
            // Unknown or not yet confirmed: do not redirect; show processing message and stay
            console.log('[OrderSuccess] Unknown status, showing processing message');
            setStatusText('Processing payment confirmation...');
            setStatusNote('We are verifying your payment. This may take a moment.');
          }
        } else {
          // API reported failure: do not show success page
          await cancelPendingOrderIfAny();
          navigate('/customer/order-failed');
          return;
        }
        
        // Also fetch recent order for display
        await fetchRecentOrder();
        
      } catch (err) {
        console.error('[OrderSuccess] status check error:', err);
        // On error, do not redirect. Show processing message and stay.
        setStatusText('Processing payment confirmation...');
        setStatusNote('We are verifying your payment. This may take a moment.');
      } finally {
        // Clear the mtid so refresh doesn't keep checking indefinitely
        try { localStorage.removeItem('phonepe_mtid'); } catch {}
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // Load any persisted ordered items (set by Checkout for online payments)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('orderedItemsForCleanup');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setOrderedItemsForCleanup(parsed);
      }
    } catch {}
  }, []);

  // Auto-remove ordered items from cart when order is confirmed/placed (run once)
  const cleanupRunRef = useRef(false);
  useEffect(() => {
    if (cleanupRunRef.current) return; // ensure this runs only once
    if (!recentOrder) return;
    const status = (recentOrder.payment_status || '').toLowerCase();
    const mode = (recentOrder.paymentmode || '').toUpperCase();

    // Consider these states as order completion for cart cleanup
    const isComplete = status === 'paid' || status === 'partial_paid' || mode === 'COD' || isPaid;
    if (!isComplete) return;

    // Prefer removing exactly what was ordered (if persisted by Checkout)
    let toRemove = Array.isArray(orderedItemsForCleanup) && orderedItemsForCleanup.length > 0
      ? orderedItemsForCleanup
      : (Array.isArray(recentOrder.items) ? recentOrder.items : []).map(it => ({
        id: it.id,
        productId: it.productId || it.product_id || it.id,
        selectedSize: it.selectedSize || it.size || null
      }));
    if (!toRemove || toRemove.length === 0) return;

    cleanupRunRef.current = true; // set guard before firing

    // Fire and forget; helper handles guest vs auth carts
    removeSpecificItemsFromCart(toRemove).catch(err => {
      console.error('[OrderSuccess] Failed to auto-remove ordered items from cart:', err);
      // allow retry on next render only if we explicitly reset the guard
    }).finally(() => {
      try { localStorage.removeItem('orderedItemsForCleanup'); } catch {}
      setOrderedItemsForCleanup([]);
    });
  }, [recentOrder, isPaid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-black p-8 rounded-2xl shadow-lg max-w-lg w-full text-center border border-white">
          <div className="mb-6 text-yellow-400">
            <div className="bg-yellow-900/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <CheckCircle className="h-16 w-16" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Processing...</h2>
          <p className="text-gray-400 mb-6">Please wait while we confirm your order details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Toaster position="top-center" reverseOrder={false} />
      {/* <BackgroundParticles /> */}
      <div className="bg-black p-8 rounded-2xl shadow-lg max-w-2xl w-full text-center border border-white">
        <div className="mb-6 text-green-400">
          <div className="bg-green-900/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-16 w-16" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-white">{statusText}</h2>
        <p className="text-gray-400 mb-6">{statusNote}</p>
        
        {/* Manual Status Check Button - Show only when payment is not confirmed */}
        {!isPaid && !loading && (
          <div className="mb-6">
            <button
              onClick={checkPaymentStatusManually}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={18} />
              Check Payment Status
            </button>
            <p className="text-gray-500 text-sm mt-2">
              Click to manually check if your payment has been processed
            </p>
          </div>
        )}
        
        {/* Order Details */}
        {recentOrder && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-gray-400 text-sm">Order ID</p>
                <p className="text-white font-medium">{recentOrder.id}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Payment Mode</p>
                <p className="text-white font-medium">{recentOrder.paymentmode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Payment Status</p>
                <p className={`font-medium ${
                  recentOrder.payment_status === 'paid' ? 'text-green-400' :
                  recentOrder.payment_status === 'partial_paid' ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  {recentOrder.payment_status === 'paid' ? 'Paid ✅' :
                   recentOrder.payment_status === 'partial_paid' ? 'Partially Paid' :
                   recentOrder.payment_status || 'Pending'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Order Status</p>
                <p className="text-white font-medium capitalize">{recentOrder.status || 'Pending'}</p>
              </div>
            </div>
            
            {/* Order Items Preview */}
            {recentOrder.items && recentOrder.items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-sm mb-2">Items ({recentOrder.items.length})</p>
                <div className="space-y-3">
                  {recentOrder.items.slice(0, 2).map((item, index) => {
                    const src = getImageUrl(item.imageUrl || item.imageurl);
                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          {src ? (
                            <img
                              src={src}
                              alt={item.productName || 'Product'}
                              className="w-10 h-10 rounded-md object-cover border border-gray-700 flex-shrink-0"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-gray-800 border border-gray-700 flex-shrink-0" />
                          )}
                          <span className="text-white truncate">{item.productName || 'Product'}</span>
                        </div>
                        <span className="text-gray-400 flex-shrink-0">Qty: {item.quantity}</span>
                      </div>
                    );
                  })}
                  {recentOrder.items.length > 2 && (
                    <p className="text-gray-400 text-sm">+{recentOrder.items.length - 2} more items</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mt-8">
          <Link 
            to="/customer/home" 
            className="w-full sm:w-auto flex-1 bg-black-700 text-white font-semibold py-3 px-6 rounded-lg hover:bg-black transition-all duration-300 flex items-center justify-center border border-gray-600 hover:border-gray-500"
          >
            <Home size={18} className="mr-2" />
            Return Home
          </Link>
          <Link 
            to="/customer/orders" 
            className="w-full sm:w-auto flex-1 bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-300 flex items-center justify-center"
          >
            <ShoppingBag size={18} className="mr-2" />
            View Orders
          </Link>
          <Link 
            to="/customer/shop" 
            className="w-full sm:w-auto flex-1 bg-yellow-500 text-black font-semibold py-3 px-6 rounded-lg hover:bg-yellow-600 transition-all duration-300 flex items-center justify-center"
          >
            <ShoppingBag size={18} className="mr-2" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
