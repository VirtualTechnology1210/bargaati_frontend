import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaChevronDown, FaChevronUp, FaCheckCircle, FaFileExcel } from 'react-icons/fa';
import axios from 'axios';
import { BASE_URL } from '../../util';
import { toast } from 'react-hot-toast';
import { exportOrdersToExcel } from '../components/xlmigration';

const DeliveredOrders = () => {
  const navigate = useNavigate();
  const listRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState({});
  const [expandedOrderDetails, setExpandedOrderDetails] = useState(null);
  const [imageLoadingModal, setImageLoadingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Resolve shipping amount from backend. Prefer persisted values; otherwise fetch by pincode.
  const getShippingAmountForOrder = useCallback(async (rawOrder) => {
    try {
      const persisted = rawOrder?.priceBreakdown?.shippingAmount ?? rawOrder?.shippingamount;
      if (persisted != null) return Number(persisted) || 0;

      const pin = rawOrder?.pincode || rawOrder?.shippingAddress?.PinCode;
      if (!pin) return 0;
      const { data } = await axios.get(`${BASE_URL}/api/shipping/amount`, { params: { pincode: String(pin) } });
      return data && data.amount != null ? Number(data.amount) : 0;
    } catch (e) {
      console.warn('[DeliveredOrders] getShippingAmountForOrder failed', e);
      return 0;
    }
  }, []);

  // Filter orders based on search query
  const handleExportToExcel = async () => {
    try {
      if (filteredOrders.length === 0) {
        toast.warning('No delivered orders to export');
        return;
      }
      
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `delivered_orders_${currentDate}.xlsx`;
      
      await exportOrdersToExcel(filteredOrders, filename);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export delivered orders to Excel');
    }
  };
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.customerName.toLowerCase().includes(searchLower) ||
      order.contactNumber.toLowerCase().includes(searchLower) ||
      order.trackingId.toLowerCase().includes(searchLower)
    );
  });

  // Helper function for status badge - moved outside of JSX
  const getStatusBadge = (status) => {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <FaCheckCircle className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return 'Invalid Date';
    }
  }, []);

  useEffect(() => {
    const fetchDeliveredOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/api/orders/getall`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.data && Array.isArray(response.data)) {
          const deliveredOrders = response.data.filter(
            order => order.status && order.status.toLowerCase() === 'delivered'
          );

          const formattedOrders = await Promise.all(deliveredOrders.map(async (order) => {
            // Use backend GST and totals
            const processedOrderItems = (order.orderItems && Array.isArray(order.orderItems)) ? order.orderItems.map(item => {
              let productId = item.product?.id;
              if (!productId) productId = item.productid;
              if (!productId) productId = item.product_id;
              if (!productId) productId = item.productId;

              return {
                productId: productId,
                productName: item.product?.productname || item.productName || "Product",
                quantity: parseInt(item.quantity, 10) || 0,
                price: parseFloat(item.priceatpurchase) || 0,
                selectedSize: item.selectedSize || null, // Include selected size
                // GST fields from backend if needed
                priceBeforeGST: item.priceBeforeGST || 0,
                gstAmount: item.gstAmount || 0,
                finalPrice: item.finalPrice || parseFloat(item.priceatpurchase) || 0,
                gstRate: item.gstRate || 0,
                gstType: item.gstType || 'exclusive'
              };
            }) : [];

            // Use backend calculated totals; fetch shipping from backend API if not present
            const subtotal = order.priceBreakdown?.subtotalBeforeGST || 0;
            const tax = order.priceBreakdown?.totalGSTAmount || 0;
            const shipping = await getShippingAmountForOrder(order);
            const total = (order.priceBreakdown?.grandTotal || 0) + shipping;

            const shippingAddress = {
              street: order.address || 'N/A',
              city: order.city || 'N/A',
              state: order.state || 'N/A',
              PinCode: order.pincode || 'N/A',
              country: order.country || 'N/A'
            };

            return {
              id: order.id.toString(),
              orderDate: formatDate(order.createdAt),
              customerName: order.fullname || (order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Unknown'),
              contactNumber: order.phonenumber || "Not provided",
              status: order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : "Unknown",
              deliveryDate: formatDate(order.updatedAt),
              trackingId: order.trackingid || "N/A",
              courierName: order.couriercompany || "N/A",
              customerDetails: {
                email: order.email || (order.user ? order.user.email : 'Unknown'),
                registeredSince: order.user ? formatDate(order.user.createdAt) : 'Unknown',
                additionalPhone: (order.user && order.user.profile && order.user.profile.additionalPhone) ? order.user.profile.additionalPhone : null
              },
              shippingAddress,
              orderItems: processedOrderItems,
              priceDetails: {
                subtotal,
                tax,
                shipping,
                total
              },
              paymentDetails: {
                method: order.paymentmode || "N/A",
                status: order.payment_status ? 
                  (order.payment_status === 'paid' ? 'Paid' : 
                   order.payment_status === 'partial_paid' ? 'Partially Paid' : 
                   order.payment_status === 'failed' ? 'Failed' : 'Pending') : 'Pending',
                transactionId: order.payment_transaction_id || order.phonepe_pg_transaction_id || order.advance_payment_txn_id || 'N/A',
                phonepeStatus: order.phonepe_status || null
              }
            };
          }));
          setOrders(formattedOrders);
        } else {
          toast.error("Failed to fetch orders or data is not in expected format.");
          setOrders([]);
        }
      } catch (error) {
        console.error("Error fetching delivered orders:", error);
        toast.error(error.response?.data?.message || "Error fetching delivered orders. Please try again.");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveredOrders();
  }, [formatDate, getShippingAmountForOrder]);

  // Restore search and scroll
  useEffect(() => {
    const savedSearch = sessionStorage.getItem('deliveredOrdersSearchQuery');
    if (savedSearch != null) setSearchQuery(savedSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && listRef.current) {
      const saved = sessionStorage.getItem('deliveredOrdersScrollTop');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) {
          requestAnimationFrame(() => {
            if (listRef.current) listRef.current.scrollTop = val;
          });
        }
        sessionStorage.removeItem('deliveredOrdersScrollTop');
      }
    }
  }, [loading]);

  const handleNavigateToDetails = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    try {
      const scrollTop = listRef.current?.scrollTop ?? 0;
      sessionStorage.setItem('deliveredOrdersScrollTop', String(scrollTop));
      sessionStorage.setItem('deliveredOrdersSearchQuery', String(searchQuery ?? ''));
      sessionStorage.setItem('deliveredOrdersSelectedOrderId', String(orderId));
    } catch (e) {
      console.warn('[DeliveredOrders] Failed to persist scroll/search state', e);
    }
    navigate(`/admin/orders/${orderId}`, { state: { order } });
  };

  const handleViewDetails = async (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      setExpandedOrderDetails(null);
    } else {
      setExpandedOrder(orderId);
      setActiveTab({ ...activeTab, [orderId]: 'customerDetails' });
      setImageLoadingModal(true);
      setExpandedOrderDetails(null);

      const orderToExpand = orders.find(o => o.id === orderId);

      if (orderToExpand && orderToExpand.orderItems && orderToExpand.orderItems.length > 0) {
        try {
          const itemsWithImages = await Promise.all(
            orderToExpand.orderItems.map(async (item) => {
              if (!item.productId) {
                console.error(`[DeliveredOrders] handleViewDetails: Skipping image fetch for product '${item.productName}' because its productId is undefined.`);
                return { ...item, imageUrl: null };
              }
              try {
                const imageResponse = await axios.get(`${BASE_URL}/api/products/${item.productId}/images`, {
                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                const imageUrl = imageResponse.data?.[0]?.url || null;
                return { ...item, imageUrl: imageUrl ? `${BASE_URL}${imageUrl}` : null };
              } catch (error) {
                console.error(`Error fetching image for product ${item.productId}:`, error);
                return { ...item, imageUrl: null };
              }
            })
          );
          setExpandedOrderDetails({ ...orderToExpand, orderItems: itemsWithImages });
        } catch (error) {
          console.error("Error processing product images for order:", error);
          setExpandedOrderDetails(orderToExpand);
        }
      } else {
        setExpandedOrderDetails(orderToExpand);
      }
      setImageLoadingModal(false);
    }
  };

  const toggleTab = (orderId, tabName) => {
    setActiveTab({ ...activeTab, [orderId]: activeTab[orderId] === tabName ? null : tabName });
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/orders/getall`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data && Array.isArray(response.data)) {
        const deliveredOrders = response.data.filter(
          order => order.status && order.status.toLowerCase() === 'delivered'
        );

        const formattedOrders = await Promise.all(deliveredOrders.map(async (order) => {
          const processedOrderItems = (order.orderItems && Array.isArray(order.orderItems)) ? order.orderItems.map(item => {
            let productId = item.product?.id;
            if (!productId) productId = item.product_id;
            if (!productId) productId = item.productId;
            if (!productId) productId = item.id;

            return {
              productId: productId,
              productName: item.product?.productname || item.productName || "Product",
              quantity: parseInt(item.quantity, 10) || 0,
              price: parseFloat(item.priceatpurchase) || 0,
              priceBeforeGST: item.priceBeforeGST || 0,
              gstAmount: item.gstAmount || 0,
              finalPrice: item.finalPrice || parseFloat(item.priceatpurchase) || 0,
              gstRate: item.gstRate || 0,
              gstType: item.gstType || 'exclusive'
            };
          }) : [];

          const subtotal = order.priceBreakdown?.subtotalBeforeGST || 0;
          const tax = order.priceBreakdown?.totalGSTAmount || 0;
          const shipping = await getShippingAmountForOrder(order);
          const total = (order.priceBreakdown?.grandTotal || 0) + shipping;

          const shippingAddress = {
            street: order.address || 'N/A',
            city: order.city || 'N/A',
            state: order.state || 'N/A',
            PinCode: order.pincode || 'N/A',
            country: order.country || 'N/A'
          };

          return {
            id: order.id.toString(),
            orderDate: formatDate(order.createdAt),
            customerName: order.fullname || (order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Unknown'),
            contactNumber: order.phonenumber || "Not provided",
            status: order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : "Unknown",
            deliveryDate: formatDate(order.updatedAt),
            trackingId: order.trackingid || "N/A",
            courierName: order.couriercompany || "N/A",
            customerDetails: {
              email: order.email || (order.user ? order.user.email : 'Unknown'),
              registeredSince: order.user ? formatDate(order.user.createdAt) : 'Unknown'
            },
            shippingAddress,
            orderItems: processedOrderItems,
            priceDetails: {
              subtotal,
              tax,
              shipping,
              total
            },
            paymentDetails: {
              method: order.paymentmode || "N/A",
              status: order.payment_status ? 
                (order.payment_status === 'paid' ? 'Paid' : 
                 order.payment_status === 'partial_paid' ? 'Partially Paid' : 
                 order.payment_status === 'failed' ? 'Failed' : 'Pending') : 'Pending',
              transactionId: order.payment_transaction_id || order.phonepe_pg_transaction_id || order.advance_payment_txn_id || 'N/A',
              phonepeStatus: order.phonepe_status || null
            }
          };
        }));
        setOrders(formattedOrders);
      } else {
        toast.error("Failed to fetch orders or data is not in expected format.");
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching delivered orders:", error);
      toast.error(error.response?.data?.message || "Error fetching delivered orders. Please try again.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 sm:p-4 mt-12 sm:mt-0">
      <div className="max-w-7xl mx-auto">
        <div className="p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm min-h-screen border border-gray-100">
          <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center">
            <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Delivered Orders</span>
            <span className="ml-4 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-600">Completed</span>
          </h2>
          <p className="text-gray-500 mb-8">View and manage completed and delivered orders</p>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 text-black px-6 py-4 border-b border-gray-100">        <div className="flex justify-between items-center">
              <h5 className="text-lg font-semibold text-gray-700 flex items-center">
                <FaCheckCircle className="h-5 w-5 mr-2 text-green-500" />
                Completed Orders
              </h5>
              <div className="relative w-96">
                <input
                  type="text"
                  placeholder="Search by Order ID, Customer Name, Contact or Tracking ID"
                  className="w-full px-4 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <svg
                  className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            </div>
            <div className='bg-white/70 backdrop-blur-md border-b border-gray-100'>
              <div className="flex items-center justify-between p-4">
                <h5 className="text-lg font-semibold text-gray-700">Orders List</h5>
                                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleExportToExcel}
                    className="text-sm font-medium text-green-600 hover:underline flex items-center bg-green-50 px-3 py-1 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <FaFileExcel className="h-4 w-4 mr-1" />
                    Export Excel
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="text-sm font-medium text-green-600 hover:underline flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6v6h6M20 18v-6h-6m-4 4H4m16-8h-4" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-10">
                  <FaCheckCircle className="mx-auto text-6xl text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Delivered Orders</h3>
                  <p className="text-gray-500">There are currently no orders marked as delivered.</p>
                </div>
              ) : (
                <div ref={listRef} className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courier & Tracking</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 rounded-tr-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrders.map((order, index) => (
                        <React.Fragment key={order.id}>
                          <tr className="hover:bg-green-50/50 transition-colors duration-150 cursor-pointer">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">{order.id}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-500">{order.deliveryDate}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700 font-medium">{order.customerName}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(order.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="items-center bg-gray-100 px-3 py-1.5 rounded-lg inline-block">
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-700 mb-1">{order.courierName}</span>
                                  <span className="text-xs font-medium text-gray-500">{order.trackingId}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right sticky right-0 bg-white group-hover:bg-green-50/50">
                              <div className="flex space-x-2 justify-end">
                                <button
                                  onClick={() => handleNavigateToDetails(order.id)}
                                  className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors duration-150 shadow-sm hover:shadow"
                                  title="View Details"
                                >
                                  <FaEye className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedOrder === order.id && expandedOrderDetails && (
                            <tr>
                              <td colSpan="7" className="p-0">
                                <div className="fixed inset-0 z-[100] overflow-y-auto">
                                  <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                    <div className="fixed inset-0 bg-white/70 backdrop-blur-md" aria-hidden="true" onClick={() => setExpandedOrder(null)}></div>
                                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true"></span>
                                    <div className="inline-block align-bottom bg-white rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full sm:p-6 border border-gray-200">
                                      <div className="sm:flex sm:items-start justify-between mb-4 pb-3 border-b border-gray-200">
                                        <h3 className="text-2xl font-bold leading-6 text-gray-900 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                                          Order Details
                                        </h3>
                                        <button
                                          type="button"
                                          className="rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 transition-colors duration-150"
                                          onClick={() => { setExpandedOrder(null); setExpandedOrderDetails(null); }}
                                        >
                                          <span className="sr-only">Close</span>
                                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>

                                      {imageLoadingModal && expandedOrder === order.id ? (
                                        <div className="flex justify-center items-center py-10">
                                          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
                                          <p className="ml-4 text-gray-600">Loading order details...</p>
                                        </div>
                                      ) : expandedOrderDetails && expandedOrderDetails.id === order.id ? (
                                        <div className="mt-2">
                                          <div className="flex flex-wrap border-b border-gray-200 mb-4">
                                            {['customerDetails', 'shippingAddress', 'orderDetails', 'priceDetails', 'paymentDetails'].map((tab) => {
                                              const tabLabels = {
                                                customerDetails: 'Customer & Order Info',
                                                shippingAddress: 'Shipping Address',
                                                orderDetails: 'Order Items',
                                                priceDetails: 'Price Breakdown',
                                                paymentDetails: 'Payment Info'
                                              };
                                              return (
                                                <button
                                                  key={tab}
                                                  className={`px-5 py-3 text-sm text-center transition-all duration-200 focus:outline-none ${activeTab[order.id] === tab
                                                      ? 'bg-white text-green-600 border-b-2 border-green-500 font-semibold'
                                                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                                    }`}
                                                  onClick={() => toggleTab(order.id, tab)}
                                                >
                                                  {tabLabels[tab]}
                                                </button>
                                              );
                                            })}
                                          </div>
                                          {/* Tab Content Area */}
                                          <div className="p-4">
                                            {activeTab[order.id] === 'customerDetails' && (
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-gray-50/70 p-5 rounded-lg border border-gray-200/80">
                                                  <h4 className="text-lg font-semibold text-gray-700 mb-4">Customer Information</h4>
                                                  <div className="space-y-3 text-sm">
                                                    {[
                                                      { label: "Name", value: order.customerName },
                                                      { label: "Contact", value: order.contactNumber },
                                                      { label: "Email", value: order.customerDetails.email },
                                                      { label: "Registered Since", value: order.customerDetails.registeredSince }
                                                    ].map(info => (
                                                      <div key={info.label} className="flex justify-between items-center border-b border-gray-200/70 pb-2 last:border-b-0 last:pb-0">
                                                        <span className="font-medium text-gray-600">{info.label}:</span>
                                                        <span className="text-gray-800">{info.value}</span>
                                                      </div>
                                                    ))}
                                                    {order.customerDetails?.additionalPhone && (
                                                      <div className="flex justify-between items-center border-b border-gray-200/70 pb-2 last:border-b-0 last:pb-0">
                                                        <span className="font-medium text-gray-600">Additional Contact:</span>
                                                        <span className="text-gray-800">{order.customerDetails.additionalPhone}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="bg-gray-50/70 p-5 rounded-lg border border-gray-200/80">
                                                  <h4 className="text-lg font-semibold text-gray-700 mb-4">Order Summary</h4>
                                                  <div className="space-y-3 text-sm">
                                                    {[
                                                      { label: "Order ID", value: order.id },
                                                      { label: "Order Date", value: order.orderDate },
                                                      { label: "Delivery Date", value: order.deliveryDate },
                                                      { label: "Status", value: getStatusBadge(order.status) },
                                                      ...(order.trackingId !== "N/A" ? [{ label: "Tracking ID", value: order.trackingId }] : []),
                                                      ...(order.courierName !== "N/A" ? [{ label: "Courier", value: order.courierName }] : [])
                                                    ].map(info => (
                                                      <div key={info.label} className="flex justify-between items-center border-b border-gray-200/70 pb-2 last:border-b-0 last:pb-0">
                                                        <span className="font-medium text-gray-600">{info.label}:</span>
                                                        <span className="text-gray-800">{info.value}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                            {activeTab[order.id] === 'shippingAddress' && (
                                              <div className="bg-gray-50/70 p-5 rounded-lg border border-gray-200/80">
                                                <h4 className="text-lg font-semibold text-gray-700 mb-4">Shipping Address</h4>
                                                <div className="space-y-3 text-sm">
                                                  {[
                                                    { label: "Street", value: order.shippingAddress.street },
                                                    { label: "City", value: order.shippingAddress.city },
                                                    { label: "State", value: order.shippingAddress.state },
                                                    { label: "Pin Code", value: order.shippingAddress.PinCode },
                                                    { label: "Country", value: order.shippingAddress.country }
                                                  ].map(info => (
                                                    <div key={info.label} className="flex justify-between border-b border-gray-200/70 pb-2 last:border-b-0 last:pb-0">
                                                      <span className="font-medium text-gray-600">{info.label}:</span>
                                                      <span className="text-gray-800">{info.value}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {activeTab[order.id] === 'orderDetails' && (
                                              <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-200/80">
                                                <h4 className="text-lg font-semibold text-gray-700 mb-4">Order Items ({expandedOrderDetails.orderItems.length})</h4>
                                                <div className="overflow-x-auto">
                                                  <table className="min-w-full divide-y divide-gray-200/70">
                                                    <thead className="bg-gray-100/70">
                                                      <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200/70">
                                                      {expandedOrderDetails.orderItems.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50/50">
                                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                            <div>
                                                              {item.productName}
                                                              {item.selectedSize && (
                                                                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                                                  Size: {item.selectedSize}
                                                                </div>
                                                              )}
                                                            </div>
                                                          </td>
                                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{item.quantity}</td>
                                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">₹{item.price.toFixed(2)}</td>
                                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            )}
                                            {activeTab[order.id] === 'priceDetails' && (
                                              <div className="bg-gray-50/70 p-5 rounded-lg border border-gray-200/80">
                                                <h4 className="text-lg font-semibold text-gray-700 mb-4">Price Breakdown</h4>
                                                <div className="space-y-3 text-sm">
                                                  {[
                                                    { label: "Subtotal", value: `₹${order.priceDetails.subtotal.toFixed(2)}` },
                                                    { label: "Tax", value: `₹${order.priceDetails.tax.toFixed(2)}` },
                                                    { label: "Shipping", value: `₹${order.priceDetails.shipping.toFixed(2)}` },
                                                  ].map(info => (
                                                    <div key={info.label} className="flex justify-between border-b border-gray-200/70 pb-2 last:border-b-0 last:pb-0">
                                                      <span className="font-medium text-gray-600">{info.label}:</span>
                                                      <span className="text-gray-800">{info.value}</span>
                                                    </div>
                                                  ))}
                                                  <div className="flex justify-between pt-2 border-t border-gray-300 mt-2">
                                                    <span className="text-md font-bold text-gray-700">Total:</span>
                                                    <span className="text-md font-bold text-green-600">₹{order.priceDetails.total.toFixed(2)}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                            {activeTab[order.id] === 'paymentDetails' && (
                                              <div className="bg-gray-50/70 p-5 rounded-lg border border-gray-200/80">
                                                <h4 className="text-lg font-semibold text-gray-700 mb-4">Payment Information</h4>
                                                <div className="space-y-3 text-sm">
                                                  {[
                                                    { label: "Method", value: order.paymentDetails.method },
                                                    { label: "Status", value: <span className={`font-semibold ${order.paymentDetails.status === 'Paid' ? 'text-green-600' : 'text-yellow-600'}`}>{order.paymentDetails.status}</span> },
                                                  ].map(info => (
                                                    <div key={info.label} className="flex justify-between border-b border-gray-200/70 pb-2 last:border-b-0 last:pb-0">
                                                      <span className="font-medium text-gray-600">{info.label}:</span>
                                                      <span className="text-gray-800">{info.value}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="7" className="px-6 py-4">
                          <div className="flex justify-end items-center text-sm text-gray-700">
                            <span className="font-medium mr-2">Total Orders:</span>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                              {filteredOrders.length}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveredOrders;


