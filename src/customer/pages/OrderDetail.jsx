import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Truck, Package, RefreshCcw, Clock, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { BASE_URL, getImageUrl } from '../../util';
// import BackgroundParticles from '../components/BackgroundParticles';

const OrderDetail = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [overrideShipping, setOverrideShipping] = useState(null);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view your order details');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${BASE_URL}/api/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        setError('Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrderDetails();

    // Set up polling for near real-time updates
    const interval = setInterval(() => {
      fetchOrderDetails();
    }, 15000); // refresh every 15 seconds for more real-time tracking

    setRefreshInterval(interval);

    // Cleanup
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [orderId]);

  // If order doesn't include shipping amount, fetch it by pincode and override locally
  useEffect(() => {
    const fetchShippingIfMissing = async () => {
      if (!order) return;
      const existing = order?.priceBreakdown?.shippingAmount ?? order?.shippingamount;
      if (existing != null) return; // already provided by backend

      const pin = order?.shippingDetails?.pinCode || order?.shippingDetails?.pincode;
      if (!pin || !/^\d{6}$/.test(String(pin))) return;
      try {
        const { data } = await axios.get(`${BASE_URL}/api/shipping/amount`, { params: { pincode: String(pin) } });
        if (data && data.amount != null) {
          setOverrideShipping(Number(data.amount));
        }
      } catch (e) {
        // Silently ignore; UI will fallback to 0 or backend-provided
        setOverrideShipping(null);
      }
    };
    fetchShippingIfMissing();
  }, [order]);

  // Manual refresh handler
  const handleRefresh = () => {
    setLoading(true);
    fetchOrderDetails();
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-black text-white transition-colors duration-200">
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
          {/* <BackgroundParticles count={30} /> */}
        </div>
        <div className="relative z-10 container mx-auto px-6 py-12 max-w-7xl">
          <div className="flex items-center mb-8">
            <Link to="/customer/orders" className="mr-4 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight">Order Details</h1>
          </div>
          <div className="space-y-6">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 animate-pulse">
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative bg-white text-gray-800 transition-colors duration-200">
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
          {/* <BackgroundParticles count={30} /> */}
        </div>
        <div className="relative z-10 container mx-auto px-6 py-12 max-w-7xl">
          <div className="flex items-center mb-8">
            <Link to="/customer/orders" className="mr-4 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight">Order Details</h1>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6 text-red-700 shadow-sm">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen relative bg-white text-gray-800 transition-colors duration-200">
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
          {/* <BackgroundParticles count={30} /> */}
        </div>
        <div className="relative z-10 container mx-auto px-6 py-12 max-w-7xl">
          <div className="flex items-center mb-8">
            <Link to="/customer/orders" className="mr-4 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight">Order Details</h1>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm p-12 text-center border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">Order not found</h3>
            <p className="text-gray-300 leading-relaxed">We couldn't find the order you're looking for.</p>
            <Link
              to="/customer/orders"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'dispatched':
        return <Truck className="w-5 h-5 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  // Use pre-calculated values from backend with safe fallbacks
  const subtotal = parseFloat(order.priceBreakdown?.subtotalBeforeGST ?? order.subtotalBeforeGST) || 0;
  const taxAmount = parseFloat(order.priceBreakdown?.totalGSTAmount ?? order.totalGSTAmount) || 0;
  const grandTotal = parseFloat(order.priceBreakdown?.grandTotal ?? order.totalAmount) || 0;
  const baseShippingAmount = parseFloat(order.priceBreakdown?.shippingAmount ?? order.shippingamount ?? 0) || 0;
  const shippingAmount = overrideShipping != null ? Number(overrideShipping) : baseShippingAmount;
  const totalWithShipping = parseFloat(order.priceBreakdown?.totalWithShipping ?? (grandTotal + shippingAmount)) || 0;

  // Compute per-item advance from product.advance_payment_value and sum across items
  const computeAdvancePaidFromItems = () => {
    if (!Array.isArray(order.items)) return 0;
    return order.items.reduce((sum, it) => {
      const perUnit = Number(it.product?.advance_payment_value) || Number(it.advance_payment_value) || Number(it.advancePerUnit) || Number(it.advance_amount) || Number(it.advanceAmount) || Number(it.advance) || Number(it.deposit) || 0;
      const qty = Number(it.quantity) || 0;
      return sum + (perUnit * qty);
    }, 0);
  };

  const computedAdvancePaid = computeAdvancePaidFromItems();

  // Prefer computed advance; fallback to backend fields
  const advancePaid = computedAdvancePaid > 0 ? computedAdvancePaid : (Number(order.advancePaidAmount ?? order.advance_paid_amount ?? 0));
  const balanceDue = Math.max(0, totalWithShipping - advancePaid);

  // Status and mode with robust fallbacks
  const rawPaymentStatus = order?.paymentStatus ?? order?.payment_status;
  const paymentStatus = order?.status === 'delivered' ? 'completed' : (rawPaymentStatus || 'pending');
  const rawPaymentMode = order?.paymentMode ?? order?.paymentmode;
  const paymentModeLabel = (() => {
    const mode = (rawPaymentMode || '').toUpperCase();
    if (mode === 'ADVANCE_UPI_BALANCE_COD') return 'Advance Payment (UPI) + Balance COD';
    if (mode === 'COD') return 'Cash on Delivery';
    if (mode === 'UPI') return 'UPI';
    if (mode === 'CARD' || mode === 'CREDIT-CARD' || mode === 'CREDIT_CARD') return 'Credit Card';
    return rawPaymentMode || 'N/A';
  })();

  return (
    <div className="min-h-screen relative transition-colors duration-200 bg-black text-white">
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        {/* <BackgroundParticles count={30} /> */}
      </div>
      <div className="relative z-10 container mx-auto px-3 sm:px-6 py-8 sm:py-12 max-w-7xl pb-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link to="/customer/orders" className="mr-4 text-gray-300 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Orders</h1>
          </div>
        </div>

        {/* Order Status Section */}
        <div className="rounded-xl shadow-sm p-5 md:p-8 mb-6 border border-gray-700 bg-black">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Package className="w-5 h-5 text-white" />
              </div>
              Order Status
            </h2>
            <div className="flex items-center space-x-3">
              <div className={`flex items-center px-4 py-2 rounded-full text-sm font-semibold ${order.status === 'delivered' ? 'bg-green-500 text-white' :
                  order.status === 'dispatched' ? 'bg-blue-500 text-white' :
                    order.status === 'cancelled' ? 'bg-red-500 text-white' :
                      'bg-yellow-500 text-gray-900'
                }`}>
                {getStatusIcon(order.status)}
                <span className="ml-2 capitalize">{order.status}</span>
              </div>
              <div className="text-sm text-gray-300 bg-gray-700 px-3 py-2 rounded-lg">
                Ordered on {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>

          {/* Professional Status Timeline */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Progress Line */}
              <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-700 hidden md:block"></div>
              <div
                className="absolute top-6 left-6 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 hidden md:block transition-all duration-500"
                style={{
                  width: `${(order.statusTimeline.filter(s => s.completed).length - 1) * 33.33}%`
                }}
              ></div>

              {order.statusTimeline.map((status, index) => (
                <div key={index} className="relative flex flex-col items-center text-center">
                  {/* Status Icon */}
                  <div className={`relative z-10 w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${status.completed
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-500 shadow-lg'
                      : 'bg-gray-800 border-gray-600 shadow-sm'
                    }`}>
                    {status.completed ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <Clock className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  {/* Status Details */}
                  <div className="mt-4 space-y-1">
                    <h4 className={`text-sm font-semibold ${status.completed ? 'text-white' : 'text-gray-400'}`}>
                      {status.status}
                    </h4>
                    {status.date ? (
                      <p className="text-xs text-gray-400">
                        {new Date(status.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">Pending</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Status Information */}
          <div className="mt-8 space-y-4">
            {/* Tracking Information */}
            {order.status === 'dispatched' && order.trackingId && (
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-6 border border-blue-700">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center mr-4">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Your order is on its way!</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white">
                      <div>
                        <p className="text-sm text-blue-300 font-medium">Tracking ID</p>
                        <p className="text-lg font-bold text-white">{order.trackingId}</p>
                      </div>
                      {order.courierCompany && (
                        <div>
                          <p className="text-sm text-blue-300 font-medium">Courier Company</p>
                          <p className="text-lg font-bold text-white">{order.courierCompany}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Reason */}
            {order.status === 'cancelled' && order.rejectReason && (
              <div className="bg-gradient-to-r from-red-900 to-red-800 rounded-xl p-6 border border-red-700">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mr-4">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Order Cancelled</h3>
                    <p className="text-red-300 font-medium">Reason: {order.rejectReason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="rounded-xl shadow-sm p-5 md:p-8 mb-6 border border-gray-700 bg-black">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                <Package className="w-5 h-5 text-white" />
              </div>
              Order Items
            </h2>
            <div className="bg-gray-700 px-3 py-1.5 rounded-lg self-start sm:self-auto">
              <span className="text-sm font-semibold text-white">{order.totalItems} items</span>
            </div>
          </div>

          <div className="grid gap-6">
            {order.items.map((item) => (
              <div key={item.id} className="bg-black rounded-xl border border-gray-700 overflow-hidden hover:shadow-md transition-all duration-200">
                <div className="flex flex-col md:flex-row">
                  {/* Product Image */}
                  <div className="w-full sm:w-40 md:w-48 h-36 sm:h-32 bg-gray-900 flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={getImageUrl(item.imageUrl)}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const nextSibling = e.target.nextSibling;
                          if (nextSibling) {
                            nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <Package className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 p-4 sm:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between h-full">
                      <div className="flex-1 mb-4 md:mb-0">
                        <h3 className="text-lg font-semibold text-white mb-2">{item.productName}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-300">
                          <div className="flex items-center">
                            <span className="font-medium">Quantity:</span>
                            <span className="ml-1 px-2 py-1 bg-blue-500 text-white rounded-md font-semibold">{item.quantity}</span>
                          </div>
                          {(item.selectedSize || item.size) && (
                            <div className="flex items-center">
                              <span className="font-medium">Size:</span>
                              <span className="ml-1 px-2 py-1 bg-green-500 text-white rounded-md font-semibold">
                                {item.selectedSize || item.size}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <span className="font-medium">Unit Price:</span>
                            <div className="ml-1 flex items-baseline space-x-2">
                              <p className="font-semibold text-white">
                                ₹{item.finalPrice ? item.finalPrice.toFixed(2) : (typeof item.price === 'number' ? item.price.toFixed(2) : Number(item.price).toFixed(2))}
                              </p>
                              {(item.mrp && parseFloat(item.mrp) > parseFloat(item.price)) && (
                                <p className="text-xs text-gray-400 line-through">₹{typeof item.mrp === 'number' ? item.mrp.toFixed(2) : Number(item.mrp).toFixed(2)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right mt-2 md:mt-0">
                        <p className="text-2xl font-bold text-white">
                          ₹{item.finalPrice ? (item.finalPrice * item.quantity).toFixed(2) : (typeof item.subtotal === 'number' ? item.subtotal.toFixed(2) : Number(item.subtotal).toFixed(2))}
                        </p>
                        {item.finalPrice && (
                          <p className="text-xs text-gray-400 mt-1">without shippingAmount</p>
                        )}
                        {(item.mrp && parseFloat(item.mrp) > parseFloat(item.price)) && (
                          <>
                            <p className="text-sm text-gray-400 line-through">
                              ₹{(Number(item.mrp) * Number(item.quantity)).toFixed(2)}
                            </p>
                            <p className="text-xs font-medium text-green-400">
                              You save ₹{((Number(item.mrp) - Number(item.price)) * Number(item.quantity)).toFixed(2)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="mt-8 bg-black rounded-xl p-5 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Order Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Subtotal (before GST)</span>
                <span className="text-white font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Tax (GST)</span>
                <span className="text-white font-medium">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Shipping</span>
                <span className="text-white font-medium">₹{shippingAmount}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-700 mt-3">
                <span className="text-xl font-bold text-white">Total (incl. shipping)</span>
                <span className="text-2xl font-bold text-white">₹{totalWithShipping.toFixed(2)}</span>
              </div>
              {Number(advancePaid) > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Advance Paid</span>
                    <span className="text-white font-medium">₹{(Number.isFinite(advancePaid) ? advancePaid : 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-700 mt-3">
                    <span className="text-xl font-bold text-white">Net Payable (COD Due)</span>
                    <span className="text-2xl font-bold text-white">₹{(Number.isFinite(balanceDue) ? balanceDue : Math.max(0, totalWithShipping - (Number.isFinite(advancePaid) ? advancePaid : 0))).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Shipping & Payment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 mt-6">
          {/* Shipping Details */}
          <div className="bg-black rounded-xl shadow-sm p-5 sm:p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-blue-400" />
              Shipping Details
            </h2>
            <div className="space-y-3">
              <div className="p-4 bg-black rounded-lg border border-gray-600">
                <p className="text-sm font-semibold text-white">{order.shippingDetails.fullName}</p>
                <p className="text-sm text-gray-300 mt-1">{order.shippingDetails.address}</p>
                <p className="text-sm text-gray-300">
                  {order.shippingDetails.city}, {order.shippingDetails.state} {order.shippingDetails.pinCode}
                </p>
                <p className="text-sm text-gray-300">{order.shippingDetails.country}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-black rounded-lg border border-gray-600">
                  <p className="text-xs text-white uppercase tracking-wide">Phone</p>
                  <p className="text-sm font-medium text-white">{order.shippingDetails.phone}</p>
                </div>
                <div className="p-3 bg-black rounded-lg border border-gray-600">
                  <p className="text-xs text-white uppercase tracking-wide">Email</p>
                  <p className="text-sm font-medium text-white">{order.shippingDetails.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-black rounded-xl shadow-sm p-5 sm:p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Package className="w-5 h-5 mr-2 text-blue-400" />
              Payment Details
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-black rounded-lg border border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white">Payment Method</span>
                  <span className="text-sm font-semibold text-white">{paymentModeLabel}</span>
                </div>
              </div>
              <div className="p-3 bg-black rounded-lg border border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white">Payment Status</span>
                  <span className={`text-sm font-semibold flex items-center ${paymentStatus === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {paymentStatus === 'completed' ? <CheckCircle className="w-4 h-4 mr-1" /> : <Clock className="w-4 h-4 mr-1" />}
                    {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
                  </span>
                </div>
              </div>
              {(() => {
                const showAdvance = (advancePaid > 0) || (balanceDue > 0);
                if (!showAdvance) return null;
                return (
                  <div className="p-3 bg-black rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white">Balance COD</span>
                      <span className="text-sm font-semibold text-white">₹{balanceDue.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
              <div className="p-4 bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg border border-blue-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total (incl. shipping)</span>
                  <span className="text-xl font-bold text-white">₹{totalWithShipping.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail; 