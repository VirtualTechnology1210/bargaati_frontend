import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaTruck, FaCheckCircle, FaTimesCircle, FaFileExcel, FaDownload } from 'react-icons/fa';
import axios from 'axios';
import { BASE_URL } from '../../util';
import { toast } from 'react-hot-toast';
import AdminVerifyModal from '../AdminVerifyModal';
import ConfirmationModal from '../ConfirmationModal';
import { exportOrdersToExcel } from '../components/xlmigration';
import { generateBillPDF } from '../../utils/billGenerator';

const DispatchDetails = () => {
  const navigate = useNavigate();
  const listRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [expandedOrderDetails, setExpandedOrderDetails] = useState(null); // For storing full order details with images
  const [imageLoadingModal, setImageLoadingModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null); // To show loading on specific buttons // For image loading state in modal
  const [downloadingBill, setDownloadingBill] = useState(null); // To track bill download status

  const [showAdminVerify, setShowAdminVerify] = useState(false);
  const [adminVerifying, setAdminVerifying] = useState(false);
  const [adminVerifyError, setAdminVerifyError] = useState("");
    const [currentOrderId, setCurrentOrderId] = useState(null);
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const user = JSON.parse(localStorage.getItem('user'));

  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [pendingRejectReasonForVerify, setPendingRejectReasonForVerify] = useState("");

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
      console.warn('[DispatchDetails] getShippingAmountForOrder failed', e);
      return 0;
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    try {
      if (!dateString) return 'Unknown';
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Unknown' : date.toISOString().split('T')[0];
    } catch(error){
      console.error('Invalid date format:', dateString, error);
      return 'Unknown';
    }
  }, []);

  const fetchDispatchedOrders = useCallback(async () => {
  try {
    setLoading(true);
    const response = await axios.get(`${BASE_URL}/api/orders/getall`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (response.data && Array.isArray(response.data)) {
      const dispatchedAndShippedOrders = response.data.filter(
        order => order.status && (order.status.toLowerCase() === 'dispatched' || order.status.toLowerCase() === 'shipped')
      );

      const formattedOrders = await Promise.all(dispatchedAndShippedOrders.map(async (order) => {
        // Use backend GST and totals
        const orderItems = (order.orderItems && Array.isArray(order.orderItems)) ? order.orderItems.map(item => {
          let productId = item.product?.id;
          if (!productId) productId = item.product_id;
          if (!productId) productId = item.productId;
          if (!productId) productId = item.id;

          return {
            productId: productId,
            productName: item.product?.productname || item.productName || "Product",
            quantity: parseInt(item.quantity, 10) || 0,
            price: parseFloat(item.priceatpurchase) || 0,
            selectedSize: item.selectedSize || null, // Include selected size
            // GST fields from backend
            priceBeforeGST: item.priceBeforeGST || 0,
            gstAmount: item.gstAmount || 0,
            finalPrice: item.finalPrice || parseFloat(item.priceatpurchase) || 0,
            gstRate: item.gstRate || 0,
            gstType: item.gstType || 'exclusive',
            // Advance per-unit (for ADVANCE bills): try multiple possible fields
            advancePerUnit: (Number(item.advancePerUnit) || Number(item.advance_amount) || Number(item.advanceAmount) || Number(item.advance) || Number(item.deposit) || Number(item.product?.advance_amount) || Number(item.product?.advanceAmount) || Number(item.product?.advance) || Number(item.product?.deposit)) || 0
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
          dispatchDate: formatDate(order.updatedAt),
          trackingid: order.trackingid || "N/A",
          couriercompany: order.couriercompany || "N/A",
          estimatedDelivery: "N/A",
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
          paymentDetails: {
            method: order.paymentmode || "N/A",
            status: order.payment_status ? 
              (order.payment_status === 'paid' ? 'Paid' : 
               order.payment_status === 'partial_paid' ? 'Partially Paid' : 
               order.payment_status === 'failed' ? 'Failed' : 'Pending') : 'Pending',
            transactionId: order.payment_transaction_id || order.phonepe_pg_transaction_id || order.advance_payment_txn_id || 'N/A',
            phonepeStatus: order.phonepe_status || null
          },
          // Include advance payment fields for bill generation
          balance_due_amount: Number(order.balance_due_amount || 0),
          advance_paid_amount: Number(order.advance_paid_amount || 0),
          advance_required_amount: Number(order.advance_required_amount || 0),
          payment_status: order.payment_status || 'unpaid',
          rejectReason: order.rejectreason || ""
        };
      }));
      setOrders(formattedOrders);
    } else {
      toast.error("Failed to fetch orders or data is not in expected format.");
      setOrders([]);
    }
  } catch (error) {
    console.error("Error fetching dispatched orders:", error);
    toast.error(error.response?.data?.message || "Error fetching dispatched orders. Please try again.");
    setOrders([]); 
  } finally {
    setLoading(false);
  }
}, [formatDate, setLoading, setOrders]);

  // Restore search and scroll position after returning from details
  useEffect(() => {
    const savedSearch = sessionStorage.getItem('dispatchOrdersSearchQuery');
    if (savedSearch != null) {
      setSearchQuery(savedSearch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && listRef.current) {
      const saved = sessionStorage.getItem('dispatchOrdersScrollTop');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) {
          requestAnimationFrame(() => {
            if (listRef.current) listRef.current.scrollTop = val;
          });
        }
        sessionStorage.removeItem('dispatchOrdersScrollTop');
      }
    }
  }, [loading]);

  // Deduct stock for each product in an order
  const updateStockForOrder = useCallback(async (order) => {
    if (!order || !Array.isArray(order.orderDetails) || order.orderDetails.length === 0) return;
    const token = localStorage.getItem('token');
    try {
      await Promise.all(
        order.orderDetails.map(async (item) => {
          const productId = item.productId;
          const qty = parseInt(item.quantity, 10) || 0;
          if (!productId || qty <= 0) return;
          try {
            await axios.put(
              `${BASE_URL}/api/products/${productId}/stock`,
              { action: 'subtract', stockQuantity: qty },
              { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
            );
          } catch (e) {
            console.error(`[DispatchDetails] Failed to update stock for product ${productId}`, e);
            // Don't throw to allow other items to proceed
          }
        })
      );
      toast.success('Stock updated for dispatched items');
    } catch (e) {
      console.error('[DispatchDetails] updateStockForOrder failed', e);
      toast.error('Some stock updates may have failed');
    }
  }, []);

  useEffect(() => {
    fetchDispatchedOrders();
  }, [fetchDispatchedOrders]);

  const handleUpdateOrderStatus = (orderId, newStatus, actionType) => {
    const performUpdate = async () => {
      setUpdatingStatus(orderId + '_' + actionType);
      try {
        const token = localStorage.getItem('token');
        await axios.post(
          `${BASE_URL}/api/orders/update/${orderId}`,
          { status: newStatus },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success(`Order ${orderId} marked as ${newStatus.toLowerCase()}.`);

        // Do not deduct stock here. Stock was already reduced at order creation.
        fetchDispatchedOrders(); // Refresh the list
      } catch (error) {
        console.error(`Error updating order ${orderId} to ${newStatus}:`, error);
        toast.error(
          error.response?.data?.message || `Failed to mark order as ${newStatus.toLowerCase()}. Please try again.`
        );
      } finally {
        setUpdatingStatus(null);
      }
    };

    setConfirmModalState({
      isOpen: true,
      title: 'Confirm Status Change',
      message: `Are you sure you want to mark order ${orderId} as ${newStatus.toLowerCase()}?`,
      onConfirm: () => {
        setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        performUpdate();
      },
    });
  };

  const handleMarkAsDelivered = (orderId) => {
    handleUpdateOrderStatus(orderId, 'Delivered', 'delivered');
  };

  const handleRejectDispatch = (orderId) => {
    const orderToCancel = orders.find(o => o.id === orderId);
    setCurrentOrderId(orderId);
    setRejectReasonInput(orderToCancel?.rejectReason || "");
    setShowRejectReasonModal(true);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await fetchDispatchedOrders();
      toast.success("Orders list refreshed successfully");
    } catch (error) {
      console.error("Error refreshing orders:", error);
      toast.error("Failed to refresh orders list");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBill = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }

    setDownloadingBill(orderId);
    try {
      const fileName = await generateBillPDF(order);
      toast.success(`Bill downloaded: ${fileName}`);
    } catch (error) {
      console.error('Error downloading bill:', error);
      toast.error('Failed to download bill. Please try again.');
    } finally {
      setDownloadingBill(null);
    }
  };

  const handleSubmitRejectReason = () => {
    if (!rejectReasonInput.trim()) {
      toast.error("Cancellation reason cannot be empty.");
      return;
    }
    setPendingRejectReasonForVerify(rejectReasonInput);
    setShowRejectReasonModal(false);
    setShowAdminVerify(true);
    setAdminVerifyError(""); 
  };

  const handleAdminVerify = async (password) => {
    setAdminVerifying(true);
    setAdminVerifyError("");
    try {
      const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: user?.email,
        password
      });
      
      if (adminLoginResponse.data && adminLoginResponse.data.user && adminLoginResponse.data.user.role === 'admin') {
        setUpdatingStatus(currentOrderId + '_cancelled'); 
        try {
          const token = localStorage.getItem('token');
          await axios.post(
            `${BASE_URL}/api/orders/update/${currentOrderId}`,
            { 
              status: 'cancelled', 
              rejectreason: pendingRejectReasonForVerify
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          toast.success(`Order ${currentOrderId} marked as cancelled.`);
          fetchDispatchedOrders();
          setShowAdminVerify(false);
          setCurrentOrderId(null);
          setPendingRejectReasonForVerify("");
          setRejectReasonInput("");
        } catch (error) {
          console.error(`Error updating order ${currentOrderId} to cancelled:`, error);
          toast.error(
            error.response?.data?.message || `Failed to mark order as cancelled after verification.`
          );
          setAdminVerifyError(error.response?.data?.message || `Failed to mark order as cancelled after verification.`);
        } finally {
          setUpdatingStatus(null);
        }
      } else {
        setAdminVerifyError('Invalid admin credentials.');
      }
    } catch (err) {
      setAdminVerifyError(
        err.response?.data?.message || 'Invalid admin credentials or server error.'
      );
    } finally {
      setAdminVerifying(false);
    }
  };

  const handleAdminCancel = () => {
    setShowAdminVerify(false);
    setAdminVerifyError("");
  };

  const handleCancelRejectReasonModal = () => {
    setShowRejectReasonModal(false);
    setCurrentOrderId(null);
    setRejectReasonInput("");
    setPendingRejectReasonForVerify("");
  };

  const handleNavigateToDetails = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    try {
      const scrollTop = listRef.current?.scrollTop ?? 0;
      sessionStorage.setItem('dispatchOrdersScrollTop', String(scrollTop));
      sessionStorage.setItem('dispatchOrdersSearchQuery', String(searchQuery ?? ''));
      sessionStorage.setItem('dispatchOrdersSelectedOrderId', String(orderId));
    } catch (e) {
      console.warn('[DispatchDetails] Failed to persist scroll/search state', e);
    }
    navigate(`/admin/orders/${orderId}`, { state: { order } });
  };

  const handleViewDetails = async (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      setExpandedOrderDetails(null); // Clear details when collapsing
    } else {
      setExpandedOrder(orderId);
      setActiveTab({ ...activeTab, [orderId]: 'customerDetails' });
      setImageLoadingModal(true);
      setExpandedOrderDetails(null); // Clear previous details first

      const orderToExpand = orders.find(o => o.id === orderId);
      if (orderToExpand && orderToExpand.orderDetails) {
        try {
          const itemsWithImages = await Promise.all(
            orderToExpand.orderDetails.map(async (item) => {
              if (!item.productId) {
                console.error(`[DispatchDetails] handleViewDetails: Skipping image fetch for product '${item.productName}' because its productId is undefined. Item details:`, item);
                return { ...item, imageUrl: null };
              }
              try {
                const imageResponse = await axios.get(`${BASE_URL}/api/products/${item.productId}/images`, {
                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                // Assuming imageResponse.data is the array of images
                const imageUrl = imageResponse.data?.[0]?.url || null;
                return { ...item, imageUrl: imageUrl ? `${BASE_URL}${imageUrl}` : null };
              } catch (error) {
                console.error(`[DispatchDetails] Error fetching image for product ${item.productId}:`, error);
                return { ...item, imageUrl: null }; // Set imageUrl to null on error
              }
            })
          );
          setExpandedOrderDetails({ ...orderToExpand, orderDetails: itemsWithImages });
        } catch (error) {
          console.error("[DispatchDetails] Error processing images for order details:", error);
          setExpandedOrderDetails(orderToExpand); // Show details without images if processing fails
        }
      } else {
        setExpandedOrderDetails(orderToExpand); // Order might not have items or structure is different
      }
      setImageLoadingModal(false);
    }
  };

  const toggleTab = (orderId, tabName) => {
    setActiveTab({...activeTab, [orderId]: activeTab[orderId] === tabName ? null : tabName});
  };

  const handleDeleteOrder = (orderId) => {
    setOrderToDelete(orderId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    // In a real application, you'd call an API to delete the order
    setOrders(orders.filter(order => order.id !== orderToDelete));
    setShowDeleteConfirm(false);
    setOrderToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setOrderToDelete(null);
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'dispatched':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Dispatched</span>;
      case 'delivered':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Delivered</span>;
      case 'in transit':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">In Transit</span>;
      case 'delayed':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Delayed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  // Filter orders based on search query
  const handleExportToExcel = async () => {
    try {
      if (filteredOrders.length === 0) {
        toast.warning('No dispatch orders to export');
        return;
      }
      
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `dispatch_orders_${currentDate}.xlsx`;
      
      await exportOrdersToExcel(filteredOrders, filename);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export dispatch orders to Excel');
    }
  };
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.customerName.toLowerCase().includes(searchLower) ||
      order.contactNumber.toLowerCase().includes(searchLower) ||
      order.trackingid.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-3 sm:p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm min-h-screen border border-gray-100">
      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText="Yes, Update"
        icon={FaTruck}
        iconColor="text-blue-500"
      />
      <h2 className="text-xl sm:text-2xl font-bold mb-2 text-gray-800 flex flex-wrap items-center gap-2 sm:gap-4 mt-12 sm:mt-0">
        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Dispatch Details</span>
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-600">In Transit</span>
      </h2>
      <p className="text-gray-500 mb-6 sm:mb-8">View and manage orders in transit</p>
      
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-black px-3 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:justify-between sm:items-center">
            <h5 className="text-lg font-semibold text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Dispatch Orders
            </h5>
            <div className="relative w-full sm:w-96">              <input
                type="text"
                placeholder="Search orders..."
                className="w-full px-3 sm:px-4 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="text-sm font-medium text-blue-600 hover:underline flex items-center"
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
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
          ) : (
            <div ref={listRef} className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {/* <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    className="block w-full px-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Search by Order ID, Customer Name, Contact, or Tracking ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div> */}
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking Info</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order, index) => (
                    <React.Fragment key={order.id}>
                      <tr className="hover:bg-blue-50/50 transition-colors duration-150 cursor-pointer">
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
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="items-center bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                            <div className="flex flex-row">
                            <FaTruck className="h-4 w-3 mr-1 text-black" />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-black mb-1">{order.couriercompany}</span>
                              <span className="text-xs font-medium text-black">{order.trackingid}</span>
                            </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right sticky right-0 bg-white">
                          <div className="flex space-x-2 justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleNavigateToDetails(order.id); }}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors duration-150 shadow-sm hover:shadow disabled:opacity-50"
                              title="View Details"
                              disabled={updatingStatus?.startsWith(order.id)}
                            >
                              <FaEye className="h-4 w-4" />
                            </button>
                            {/* <button
                              onClick={(e) => { e.stopPropagation(); handleDownloadBill(order.id); }}
                              className="bg-purple-50 text-purple-600 hover:bg-purple-100 p-2 rounded-lg transition-colors duration-150 shadow-sm hover:shadow disabled:opacity-50"
                              title="Download Bill"
                              disabled={downloadingBill === order.id || updatingStatus?.startsWith(order.id)}
                            >
                              {downloadingBill === order.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-600"></div>
                              ) : (
                                <FaDownload className="h-4 w-4" />
                              )}
                            </button> */}
                            <button
                              onClick={() => handleMarkAsDelivered(order.id)}
                              className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors duration-150 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Mark as Delivered"
                              disabled={updatingStatus === order.id + '_delivered' || order.status === 'Delivered'}
                            >
                              {updatingStatus === order.id + '_delivered' ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-600"></div>
                              ) : (
                                <FaCheckCircle className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRejectDispatch(order.id)}
                              className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors duration-150 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Reject Dispatch"
                              disabled={updatingStatus === order.id + '_cancelled' || ['Delivered', 'Cancelled'].includes(order.status)}
                            >
                              {updatingStatus === order.id + '_cancelled' ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                              ) : (
                                <FaTimesCircle className="h-4 w-4" />
                              )}
                            </button>
                            
                          </div>
                        </td>
                      </tr>
                      {expandedOrder === order.id && (
                        <tr>
                        <td colSpan="7" className="p-0">
                          <div className="fixed inset-0 z-50 overflow-y-auto">
                            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                              <div className="fixed inset-0 bg-white/60 backdrop-blur-sm" aria-hidden="true"></div>
                              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true"></span>
                              <div className="inline-block align-bottom bg-white rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full sm:p-6">
                                <div className="sm:flex sm:items-start justify-between">
                                  <h3 className="text-2xl font-bold leading-6 text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Order Details
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
                                    {['customerDetails', 'shippingAddress', 'orderDetails', 'priceDetails', 'paymentDetails'].map((tab) => {
                                      const tabLabels = {
                                        customerDetails: 'Customer Details',
                                        shippingAddress: 'Shipping Address',
                                        orderDetails: 'Order Details',
                                        priceDetails: 'Price Details',
                                        paymentDetails: 'Payment Details'
                                      };
                                      return (
                                        <button 
                                          key={tab}
                                          className={`px-6 py-3 text-center transition-all duration-200 ${
                                            activeTab[order.id] === tab 
                                              ? 'bg-white text-blue-600 border-b-2 border-blue-500 font-medium' 
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
                                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                              <span className="text-sm font-medium text-gray-600">Registered Since:</span>
                                              <span className="text-sm text-gray-800 col-span-2">{order.customerDetails.registeredSince}</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                          <h4 className="text-lg font-medium text-gray-700 mb-4">Order Summary</h4>
                                          <div className="space-y-3">
                                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                              <span className="text-sm font-medium text-gray-600">Order ID:</span>
                                              <span className="text-sm text-gray-800 col-span-2">{order.id}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                              <span className="text-sm font-medium text-gray-600">Order Date:</span>
                                              <span className="text-sm text-gray-800 col-span-2">{order.orderDate}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                              <span className="text-sm font-medium text-gray-600">Status:</span>
                                              <span className="text-sm text-gray-800 col-span-2">{order.status}</span>
                                            </div>
                                            {order.trackingid && (
                                              <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                <span className="text-sm font-medium text-gray-600">Tracking ID:</span>
                                                <span className="text-sm text-gray-800 col-span-2">{order.trackingid}</span>
                                              </div>
                                            )}
                                            {order.couriercompany && (
                                              <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                <span className="text-sm font-medium text-gray-600">Courier Company:</span>
                                                <span className="text-sm text-gray-800 col-span-2">{order.couriercompany}</span>
                                              </div>
                                            )}
                                            {order.status === 'Cancelled' && order.rejectReason && (
                                              <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                                <span className="text-sm font-medium text-gray-600">Cancellation Reason:</span>
                                                <span className="text-sm text-gray-800 col-span-2">{order.rejectReason}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {activeTab[order.id] === 'shippingAddress' && (
                                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="text-lg font-medium text-gray-700 mb-4">Shipping Address</h4>
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
                                          <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                            <span className="text-sm font-medium text-gray-600">Country:</span>
                                            <span className="text-sm text-gray-800 col-span-2">{order.shippingAddress.country}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {activeTab[order.id] === 'orderDetails' && (
                                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="text-lg font-medium text-gray-700 mb-4">Order Details</h4>
                                        <table className="min-w-full divide-y divide-gray-200">
                                          <thead className="bg-gray-100">
                                            <tr>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-200">
                                            {imageLoadingModal && expandedOrder === order.id ? (
                                              <tr>
                                                <td colSpan="5" className="text-center py-4">
                                                  <div className="flex justify-center items-center">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                                                    Loading product images...
                                                  </div>
                                                </td>
                                              </tr>
                                            ) : (expandedOrderDetails && expandedOrderDetails.id === order.id && expandedOrderDetails.orderDetails) ? (
                                              expandedOrderDetails.orderDetails.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                  <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.imageUrl ? (
                                                      <img src={item.imageUrl} alt={item.productName} className="h-16 w-16 object-cover rounded-md shadow-sm" />
                                                    ) : (
                                                      <div className="h-16 w-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 shadow-sm">
                                                        <FaEye size={24} />
                                                      </div>
                                                    )}
                                                  </td>
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
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">₹{item.price?.toFixed(2) || '0.00'}</td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">₹{(item.price * item.quantity)?.toFixed(2) || '0.00'}</td>
                                                </tr>
                                              ))
                                            ) : order.orderDetails && order.orderDetails.length > 0 ? (
                                              order.orderDetails.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                  <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="h-16 w-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 shadow-sm">
                                                      <FaEye size={24} />
                                                    </div>
                                                  </td>
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
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">₹{item.price?.toFixed(2) || '0.00'}</td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">₹{(item.price * item.quantity)?.toFixed(2) || '0.00'}</td>
                                                </tr>
                                              ))
                                            ) : (
                                              <tr>
                                                <td colSpan="5" className="text-center py-4 text-gray-500">No order items to display.</td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                    {activeTab[order.id] === 'priceDetails' && (
                                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="text-lg font-medium text-gray-700 mb-4">Price Details</h4>
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
                                            <span className="text-sm font-bold text-blue-600 col-span-2">₹{order.priceDetails.total.toFixed(2)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {activeTab[order.id] === 'paymentDetails' && (
                                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="text-lg font-medium text-gray-700 mb-4">Payment Details</h4>
                                        <div className="space-y-3">
                                          <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                            <span className="text-sm font-medium text-gray-600">Payment Method:</span>
                                            <span className="text-sm text-gray-800 col-span-2">{order.paymentDetails.method}</span>
                                          </div>
                                          <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3">
                                            <span className="text-sm font-medium text-gray-600">Payment Status:</span>
                                            <span className={`text-sm col-span-2 ${order.paymentDetails.status === 'Paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                              {order.paymentDetails.status}
                                            </span>
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
                    <td colSpan="7" className="px-6 py-4">
                      <div className="flex justify-end items-center text-sm">
                        <span className="font-medium mr-2 text-gray-600">Total Dispatchs:</span>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
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
      
      <AdminVerifyModal
        show={showAdminVerify}
        onCancel={handleAdminCancel}
        onVerify={handleAdminVerify}
        verifying={adminVerifying}
        error={adminVerifyError}
      />

      {showRejectReasonModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md border border-gray-100">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Provide Cancellation Reason</h3>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="rejectReasonInput">
                Reason for Cancellation
              </label>
              <textarea
                id="rejectReasonInput"
                className="shadow-sm appearance-none border border-gray-200 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="Enter reason for cancelling this order"
                rows="4"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-150"
                onClick={handleCancelRejectReasonModal}
              >
                Cancel
              </button>
              <button
                className={`bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150 ${!rejectReasonInput.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
                onClick={handleSubmitRejectReason}
                disabled={!rejectReasonInput.trim()}
              >
                Submit Reason
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchDetails;



