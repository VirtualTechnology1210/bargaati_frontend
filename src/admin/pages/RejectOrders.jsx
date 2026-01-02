import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaChevronDown, FaChevronUp, FaInfoCircle, FaEye, FaFileExcel } from 'react-icons/fa';
import axios from 'axios';
import { BASE_URL } from '../../util';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../ConfirmationModal'; import { exportOrdersToExcel } from '../components/xlmigration';

const RejectOrders = () => {
  const navigate = useNavigate();
  const listRef = useRef(null);
  const restoredRef = useRef(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState({});
  const [showReasonPopup, setShowReasonPopup] = useState(false);
  const [activeReasonOrder, setActiveReasonOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });
  const [stockRestoring, setStockRestoring] = useState({});
  const [stockRestored, setStockRestored] = useState({});

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
      console.warn('[RejectOrders] getShippingAmountForOrder failed', e);
      return 0;
    }
  }, []);

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Unknown';
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Unknown' : date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Invalid date format:', dateString, error);
      return 'Unknown';
    }
  };

  useEffect(() => {
    const fetchRejectedOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/api/orders/getall`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.data && Array.isArray(response.data)) {
          const rejectedOrCancelledOrders = response.data.filter(
            order => order.status &&
              (order.status.toLowerCase() === 'rejected' || order.status.toLowerCase() === 'cancelled')
          );

          const formattedOrders = await Promise.all(rejectedOrCancelledOrders.map(async (order) => {
            // Use backend GST and totals
            const orderItems = (order.orderItems && Array.isArray(order.orderItems)) ? order.orderItems.map(item => {
              let productId = item.product?.id;
              if (!productId) productId = item.productid;
              if (!productId) productId = item.product_id;
              if (!productId) productId = item.productId;

              return {
                productId: productId,
                productName: item.product?.productname || "Product",
                quantity: parseInt(item.quantity, 10) || 0,
                price: parseFloat(item.priceatpurchase) || 0,
                selectedSize: item.selectedSize || null, // Include selected size
                priceBeforeGST: item.priceBeforeGST || 0,
                gstAmount: item.gstAmount || 0,
                finalPrice: item.finalPrice || parseFloat(item.priceatpurchase) || 0,
                gstRate: item.gstRate || 0,
                gstType: item.gstType || 'exclusive'
              };
            }) : [];

            // Use backend calculated totals
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

              rejectionDate: formatDate(order.updatedAt),
              rejectionReason: order.rejectreason || "No reason provided",
              rejectedBy: "Admin/System",
              additionalNotes: "N/A",

              customerDetails: {
                email: order.email || (order.user ? order.user.email : 'Unknown'),
                registeredSince: order.user ? formatDate(order.user.createdAt) : 'Unknown'
              },
              shippingAddress,
              orderDetails: orderItems,
              priceDetails: {
                subtotal,
                tax,
                shipping,
                total
              },
              stockRestored: order.stock_restored || false,
              stockRestoredAt: order.stock_restored_at || null,
            };
          }));
          setOrders(formattedOrders);

          // Initialize stockRestored state from database
          const restoredMap = {};
          formattedOrders.forEach(order => {
            if (order.stockRestored) {
              restoredMap[order.id] = true;
            }
          });
          setStockRestored(restoredMap);
        } else {
          toast.error("Failed to fetch orders or data is not in expected format.");
          setOrders([]);
        }
      } catch (error) {
        console.error("Error fetching rejected orders:", error);
        toast.error(error.response?.data?.message || "Error fetching rejected orders. Please try again.");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRejectedOrders();
  }, [getShippingAmountForOrder]);

  // Restore search and scroll after coming back from details
  useEffect(() => {
    const savedSearch = sessionStorage.getItem('rejectedOrdersSearchQuery');
    if (savedSearch != null) setSearchQuery(savedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && listRef.current && !restoredRef.current) {
      const saved = sessionStorage.getItem('rejectedOrdersScrollTop');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) {
          // Try to restore after paint
          requestAnimationFrame(() => {
            if (listRef.current) listRef.current.scrollTop = val;
            // Fallback after a tick in case rows render after paint
            setTimeout(() => {
              if (listRef.current) listRef.current.scrollTop = val;
            }, 0);
          });
          restoredRef.current = true;
        }
        sessionStorage.removeItem('rejectedOrdersScrollTop');
      }
    }
  }, [loading, orders.length]);

  const handleNavigateToDetails = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    try {
      const scrollTop = listRef.current?.scrollTop ?? 0;
      sessionStorage.setItem('rejectedOrdersScrollTop', String(scrollTop));
      sessionStorage.setItem('rejectedOrdersSearchQuery', String(searchQuery ?? ''));
      sessionStorage.setItem('rejectedOrdersSelectedOrderId', String(orderId));
    } catch (e) {
      console.warn('[RejectOrders] Failed to persist scroll/search state', e);
    }
    navigate(`/admin/orders/${orderId}`, { state: { order } });
  };

  const handleViewDetails = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      setActiveTab({});
    } else {
      setExpandedOrder(orderId);
      setActiveTab({ [orderId]: 'rejectionDetails' });
    }
  };

  const toggleTab = (orderId, tabName) => {
    setActiveTab({ ...activeTab, [orderId]: activeTab[orderId] === tabName ? null : tabName });
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'rejected':
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">{status}</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const handleViewReason = (orderId, e) => {
    e.stopPropagation();
    setActiveReasonOrder(orders.find(order => order.id === orderId));
    setShowReasonPopup(true);
  };

  const closeReasonPopup = () => {
    setShowReasonPopup(false);
    setActiveReasonOrder(null);
  };

  const handleDeleteOrder = (orderId) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete this order? This action cannot be undone.`,
      onConfirm: () => confirmDelete(orderId),
    });
  };

  const confirmDelete = async (orderId) => {
    try {
      console.log('Attempting to delete order with ID:', orderId);
      console.log('Order ID type:', typeof orderId);
      console.log('Using BASE_URL:', BASE_URL);
      console.log('Token exists:', !!localStorage.getItem('token'));

      // Ensure orderId is properly formatted - try both string and number
      const numericOrderId = parseInt(orderId, 10);
      console.log('Numeric order ID:', numericOrderId);
      console.log('Is valid number:', !isNaN(numericOrderId));

      const response = await axios.delete(`${BASE_URL}/api/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      console.log('Delete response:', response.data);
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      toast.success('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Request URL:', `${BASE_URL}/api/orders/${orderId}`);
      console.error('Full error:', error);

      // More specific error messages
      if (error.response?.status === 404) {
        toast.error('Order not found. It may have already been deleted or the ID is invalid.');
      } else if (error.response?.status === 401) {
        toast.error('Authentication failed. Please login again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Admin privileges required.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete order');
      }
    } finally {
      setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    }
  };

  const handleRestoreStock = (orderId) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Restore Stock',
      message: `Are you sure you want to restore stock for all products in this order? This will add the ordered quantities back to the product inventory.`,
      onConfirm: () => confirmRestoreStock(orderId),
    });
  };

  const confirmRestoreStock = async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order || !order.orderDetails) {
        toast.error('Order details not found');
        return;
      }

      setStockRestoring(prev => ({ ...prev, [orderId]: true }));

      // Restore stock for each product in the order
      const restorePromises = order.orderDetails.map(async (item) => {
        if (!item.productId || !item.quantity) {
          console.warn('Skipping item with missing productId or quantity:', item);
          return null;
        }

        try {
          const response = await axios.put(
            `${BASE_URL}/api/products/${item.productId}/stock`,
            {
              stockQuantity: item.quantity,
              action: 'add',
              // If the order item had a specific size, restore that size's stock too
              sizeValue: item.selectedSize || undefined
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          return {
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            success: true,
            response: response.data
          };
        } catch (error) {
          console.error(`Failed to restore stock for product ${item.productId}:`, error);
          return {
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            success: false,
            error: error.response?.data?.message || error.message
          };
        }
      });

      const results = await Promise.all(restorePromises);
      const validResults = results.filter(r => r !== null);
      const successCount = validResults.filter(r => r.success).length;
      const failCount = validResults.filter(r => !r.success).length;

      if (successCount > 0) {
        const successItems = validResults.filter(r => r.success);
        const itemsList = successItems.map(r => `${r.productName} (+${r.quantity})`).join(', ');

        // Mark stock as restored in database
        try {
          await axios.post(
            `${BASE_URL}/api/orders/${orderId}/stock-restored`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );
          console.log(`Stock restoration marked in database for order ${orderId}`);
        } catch (dbError) {
          console.error('Failed to mark stock as restored in database:', dbError);
          // Continue anyway, stock was restored even if DB update failed
        }

        toast.success(`Stock restored successfully for ${successCount} product(s): ${itemsList}`);
        // Mark this order as stock restored in state
        setStockRestored(prev => ({ ...prev, [orderId]: true }));
      }

      if (failCount > 0) {
        const failedItems = validResults.filter(r => !r.success);
        const failList = failedItems.map(r => `${r.productName} (${r.error})`).join(', ');
        toast.error(`Failed to restore stock for ${failCount} product(s): ${failList}`);
      }

      if (successCount === 0 && failCount === 0) {
        toast.warning('No valid products found to restore stock');
      }

    } catch (error) {
      console.error('Error restoring stock:', error);
      toast.error('Failed to restore stock. Please try again.');
    } finally {
      setStockRestoring(prev => ({ ...prev, [orderId]: false }));
      setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    }
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
        const rejectedOrCancelledOrders = response.data.filter(
          order => order.status &&
            (order.status.toLowerCase() === 'rejected' || order.status.toLowerCase() === 'cancelled')
        );

        const formattedOrders = await Promise.all(rejectedOrCancelledOrders.map(async (order) => {
          // Use backend GST and totals
          const orderItems = (order.orderItems && Array.isArray(order.orderItems)) ? order.orderItems.map(item => {
            let productId = item.product?.id;
            if (!productId) productId = item.productid;
            if (!productId) productId = item.product_id;
            if (!productId) productId = item.productId;

            return {
              productId: productId,
              productName: item.product?.productname || "Product",
              quantity: parseInt(item.quantity, 10) || 0,
              price: parseFloat(item.priceatpurchase) || 0,
              selectedSize: item.selectedSize || null,
              priceBeforeGST: item.priceBeforeGST || 0,
              gstAmount: item.gstAmount || 0,
              finalPrice: item.finalPrice || parseFloat(item.priceatpurchase) || 0,
              gstRate: item.gstRate || 0,
              gstType: item.gstType || 'exclusive'
            };
          }) : [];

          // Use backend calculated totals; resolve shipping via API if needed
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

            rejectionDate: formatDate(order.updatedAt),
            rejectionReason: order.rejectreason || "No reason provided",
            rejectedBy: "Admin/System",
            additionalNotes: "N/A",

            customerDetails: {
              email: order.email || (order.user ? order.user.email : 'Unknown'),
              registeredSince: order.user ? formatDate(order.user.createdAt) : 'Unknown'
            },
            shippingAddress,
            orderDetails: orderItems,
            priceDetails: {
              subtotal,
              tax,
              shipping,
              total
            },
            stockRestored: order.stock_restored || false,
            stockRestoredAt: order.stock_restored_at || null,
          };
        }));
        setOrders(formattedOrders);

        // Initialize stockRestored state from database
        const restoredMap = {};
        formattedOrders.forEach(order => {
          if (order.stockRestored) {
            restoredMap[order.id] = true;
          }
        });
        setStockRestored(restoredMap);

        toast.success('Orders refreshed successfully');
      } else {
        toast.error("Failed to fetch orders or data is not in expected format.");
        setOrders([]);
      }
    } catch (error) {
      console.error('Error refreshing orders:', error);
      toast.error(error.response?.data?.message || "Error refreshing orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  const handleExportToExcel = async () => {
    try {
      if (filteredOrders.length === 0) {
        toast.warning('No cancelled orders to export');
        return;
      }

      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `cancelled_orders_${currentDate}.xlsx`;

      await exportOrdersToExcel(filteredOrders, filename);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export cancelled orders to Excel');
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    return (
      order.id.toString().toLowerCase().includes(searchLower) ||
      order.customerName.toLowerCase().includes(searchLower) ||
      order.contactNumber.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 sm:p-4 mt-12 sm:mt-0">
      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText="Yes, Delete"
        icon={FaTrash}
        iconColor="text-red-500"
      />
      <div className="max-w-7xl mx-auto">
        <div className="p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm min-h-screen border border-gray-100">
          <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Cancelled Orders Management</span>
            <span className="ml-4 px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">Cancelled</span>
          </h2>
          <p className="text-gray-500 mb-8">Manage orders that have been cancelled</p>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-black px-6 py-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h5 className="text-lg font-semibold text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cancelled Orders
                </h5>
                <div className="relative w-96">
                  <input
                    type="text"
                    placeholder="Search by Order ID, Customer Name, Contact or Tracking ID"
                    className="w-full px-4 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <h5 className=" text-lg font-semibold text-gray-700">Orders List </h5>
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
                    className="text-sm font-medium text-red-600 hover:underline flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="bg-red-50 text-red-600 hover:bg-red-100 h-4 w-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div ref={listRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                  <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 rounded-tr-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrders.map((order, index) => (
                        <React.Fragment key={order.id}>
                          <tr className="hover:bg-red-50/30 transition-colors duration-150 cursor-pointer" onClick={() => handleViewDetails(order.id)}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">{order.id}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-500">{order.orderDate}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700 font-medium">{order.customerName}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-sm text-gray-500">{order.contactNumber}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(order.status)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors duration-200 inline-flex items-center justify-center"
                                onClick={(e) => handleViewReason(order.id, e)}
                                title="View Cancellation Reason"
                              >
                                <FaInfoCircle className="h-4 w-4" />
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right sticky right-0 bg-white">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigateToDetails(order.id);
                                  }}
                                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors duration-150 shadow-sm hover:shadow group relative"
                                  title="View Details"
                                >
                                  <FaEye className="h-4 w-4" />
                                </button>
                                {!stockRestored[order.id] ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestoreStock(order.id);
                                    }}
                                    disabled={stockRestoring[order.id]}
                                    className="bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-lg transition-colors duration-150 shadow-sm hover:shadow group relative"
                                    title="Restore Stock"
                                  >
                                    {stockRestoring[order.id] ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-600"></div>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                      </svg>
                                    )}
                                  </button>
                                ) : (
                                  <div className="bg-gray-100 text-gray-500 p-2 rounded-lg" title="Stock Already Restored">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteOrder(order.id);
                                  }}
                                  className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors duration-150 shadow-sm hover:shadow group relative"
                                  title="Delete Order"
                                >
                                  <FaTrash className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedOrder === order.id && (
                            <tr>
                              <td colSpan="8" className="p-0">
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                  <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm" aria-hidden="true" onClick={() => setExpandedOrder(null)}></div>
                                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                                    <div className="inline-block align-bottom bg-white rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full sm:p-6">
                                      <div className="sm:flex sm:items-start justify-between">
                                        <h3 className="text-2xl font-bold leading-6 text-gray-900 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                                          Order Details (Cancelled)
                                        </h3>
                                        <button
                                          type="button"
                                          className="rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                          onClick={() => setExpandedOrder(null)}
                                        >
                                          <span className="sr-only">Close</span>
                                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                      <div className="mt-4">
                                        <div className="flex flex-wrap border-b border-gray-200">
                                          {['rejectionDetails', 'customerDetails', 'shippingAddress', 'orderDetails', 'priceDetails'].map((tab) => {
                                            const tabLabels = {
                                              rejectionDetails: 'Cancellation Details',
                                              customerDetails: 'Customer Details',
                                              shippingAddress: 'Shipping Address',
                                              orderDetails: 'Order Details',
                                              priceDetails: 'Price Details',
                                            };
                                            return (
                                              <button
                                                key={tab}
                                                className={`px-6 py-3 text-center transition-all duration-200 ${activeTab[order.id] === tab
                                                  ? 'bg-white text-red-600 border-b-2 border-red-500 font-medium'
                                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                  }`}
                                                onClick={() => toggleTab(order.id, tab)}
                                              >
                                                {tabLabels[tab]}
                                              </button>
                                            );
                                          })}
                                        </div>
                                        <div className="p-6">
                                          {activeTab[order.id] === 'rejectionDetails' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                <h4 className="text-lg font-medium text-gray-700 mb-4">Cancellation Information</h4>
                                                <div className="space-y-3">
                                                  <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                    <span className="text-sm font-medium text-gray-600">Order ID:</span>
                                                    <span className="text-sm text-gray-800 col-span-2">{order.id}</span>
                                                  </div>
                                                  <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                    <span className="text-sm font-medium text-gray-600">Cancellation Date:</span>
                                                    <span className="text-sm text-gray-800 col-span-2">{order.rejectionDate}</span>
                                                  </div>
                                                  <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                    <span className="text-sm font-medium text-gray-600">Cancelled By:</span>
                                                    <span className="text-sm text-gray-800 col-span-2">{order.rejectedBy}</span>
                                                  </div>
                                                  <div className="grid grid-cols-3 gap-4 pb-3">
                                                    <span className="text-sm font-medium text-gray-600">Reason:</span>
                                                    <span className="text-sm text-gray-800 col-span-2">{order.rejectionReason}</span>
                                                  </div>
                                                  <div className="grid grid-cols-3 gap-4 pb-3">
                                                    <span className="text-sm font-medium text-gray-600">Additional Notes:</span>
                                                    <span className="text-sm text-gray-800 col-span-2">{order.additionalNotes}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          {activeTab[order.id] === 'customerDetails' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                <h4 className="text-lg font-medium text-gray-700 mb-4">Customer Information</h4>
                                                <div className="space-y-3">
                                                  <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                    <span className="text-sm font-medium text-gray-600">Name:</span>
                                                    <span className="text-sm text-gray-800 col-span-2">{order.customerName}</span>
                                                  </div>
                                                  <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                    <span className="text-sm font-medium text-gray-600">Contact Number:</span>
                                                    <span className="text-sm text-gray-800 col-span-2">{order.contactNumber}</span>
                                                  </div>
                                                  <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                    <span className="text-sm font-medium text-gray-600">Email:</span>
                                                    <span className="text-sm text-gray-800 col-span-2">{order.customerDetails.email}</span>
                                                  </div>
                                                  <div className="grid grid-cols-3 gap-4 pb-3">
                                                    <span className="text-sm font-medium text-gray-600">Registered Since:</span>
                                                    <span className="text-sm text-gray-800 col-span-2">{order.customerDetails.registeredSince}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          {activeTab[order.id] === 'shippingAddress' && (
                                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                              <h4 className="text-lg font-medium text-gray-700 mb-4">Shipping Address (At time of order)</h4>
                                              <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                  <span className="text-sm font-medium text-gray-600">Street:</span>
                                                  <span className="text-sm text-gray-800 col-span-2">{order.shippingAddress.street}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                  <span className="text-sm font-medium text-gray-600">City:</span>
                                                  <span className="text-sm text-gray-800 col-span-2">{order.shippingAddress.city}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                  <span className="text-sm font-medium text-gray-600">State:</span>
                                                  <span className="text-sm text-gray-800 col-span-2">{order.shippingAddress.state}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                  <span className="text-sm font-medium text-gray-600">Pin Code:</span>
                                                  <span className="text-sm text-gray-800 col-span-2">{order.shippingAddress.PinCode}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 pb-3">
                                                  <span className="text-sm font-medium text-gray-600">Country:</span>
                                                  <span className="text-sm text-gray-800 col-span-2">{order.shippingAddress.country}</span>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          {activeTab[order.id] === 'orderDetails' && (
                                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                              <h4 className="text-lg font-medium text-gray-700 mb-4">Order Details (At time of order)</h4>
                                              <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-100">
                                                  <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                  {order.orderDetails.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        <div>
                                                          {item.productName}
                                                          {item.selectedSize && (
                                                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                                              Size: {item.selectedSize}
                                                            </div>
                                                          )}
                                                        </div>
                                                      </td>
                                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.quantity}</td>
                                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">₹{item.price.toFixed(2)}</td>
                                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                          {activeTab[order.id] === 'priceDetails' && (
                                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                              <h4 className="text-lg font-medium text-gray-700 mb-4">Price Details (At time of order)</h4>
                                              <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                  <span className="text-sm font-medium text-gray-600">Subtotal:</span>
                                                  <span className="text-sm text-gray-800 col-span-2">₹{order.priceDetails.subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                  <span className="text-sm font-medium text-gray-600">Tax:</span>
                                                  <span className="text-sm text-gray-800 col-span-2">₹{order.priceDetails.tax.toFixed(2)}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                  <span className="text-sm font-medium text-gray-600">Shipping:</span>
                                                  <span className="text-sm text-gray-800 col-span-2">₹{order.priceDetails.shipping.toFixed(2)}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 pt-2">
                                                  <span className="text-sm font-medium text-gray-600">Total:</span>
                                                  <span className="text-sm font-bold text-red-600 col-span-2">₹{order.priceDetails.total.toFixed(2)}</span>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                        </div>
                                      </div>
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
                        <td colSpan="8" className="px-6 py-4">
                          <div className="flex justify-end items-center text-sm">
                            <span className="font-medium mr-2 text-gray-600">Total Rejects:</span>
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-semibold">
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

          {showReasonPopup && activeReasonOrder && (
            <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm" onClick={closeReasonPopup}>
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-100 animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">Cancellation Reason</h3>
                  <button onClick={closeReasonPopup} className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center mb-4">
                    <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-1 rounded-full">Order {activeReasonOrder.id}</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-sm text-gray-500">{activeReasonOrder.rejectionDate}</span>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg mb-6">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Reason</h4>
                  <p className="text-gray-700">{activeReasonOrder.rejectionReason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RejectOrders;


