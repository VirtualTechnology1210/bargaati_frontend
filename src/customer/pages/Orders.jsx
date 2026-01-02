import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TruckIcon, XCircleIcon, ClockIcon, CheckCircleIcon, RefreshCcw, ShoppingBag, Package, Star, Download } from 'lucide-react';
import axios from 'axios';
import { BASE_URL, getImageUrl } from '../../util';
// import BackgroundParticles from '../components/BackgroundParticles';
import { toast, Toaster } from 'react-hot-toast';
import ConfirmationModal from '../../admin/ConfirmationModal';
// Import jsPDF and autoTable
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF with autoTable
jsPDF.autoTable = autoTable;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProduct, setReviewProduct] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Define order status types
  const orderStatuses = [
    { id: 'all', label: 'All Orders', icon: Package },
    { id: 'pending', label: 'Pending', icon: ClockIcon },
    { id: 'dispatched', label: 'Dispatched', icon: TruckIcon },
    { id: 'delivered', label: 'Delivered', icon: CheckCircleIcon },
    { id: 'cancelled', label: 'Cancelled', icon: XCircleIcon },
  ];

  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => 
    activeTab === 'all' ? true : order.status === activeTab
  );

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view your orders');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${BASE_URL}/api/orders/history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrders();
    
    // Set up polling for near real-time updates
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000); // refresh every 30 seconds
    
    setRefreshInterval(interval);
    
    // Cleanup
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  // Status icon mapping
  const getStatusIcon = (status) => {
    switch(status) {
      case 'delivered':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'dispatched':
        return <TruckIcon className="w-5 h-5 text-blue-500" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'pending':
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'dispatched':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  // Get tab style based on active state
  const getTabStyle = (tabId) => activeTab === tabId ? 'bg-black border-yellow-500 text-white' : 'bg-black hover:bg-black/90 border-gray-700 text-white';

  // Get count of orders by status
  const getOrderCount = (status) => {
    if (status === 'all') return orders.length;
    return orders.filter(order => order.status === status).length;
  };

  // Manual refresh handler
  const handleRefresh = () => {
    setLoading(true);
    fetchOrders();
  };

  // Generate and download invoice
  const downloadInvoice = (order) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Colors
      const primaryColor = [245, 158, 11]; // Yellow-500
      const secondaryColor = [31, 41, 55]; // Gray-800
      const textColor = [55, 65, 81]; // Gray-700
      const borderColor = [229, 231, 235]; // Gray-200

      // -- Header --
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('BARGAATI', 14, 22);

      // Company details (wrapped to page width)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      const companyLinesRaw = [
        'BARGAATI E-COMMERCE',
        'Floor No.: Ground Floor, Building No./Flat No.: No.1',
        'K H No.640/1, Road/Street: Vinayaka Green Park Layout',
        'Varanasi Main Road, Opp to Sunny Layout, Nearby Landmark: Opp to Sunny Layout',
        'Locality/Sub Locality: Maragondanahalli, City/Town/Village: Bengaluru',
        'District: Bengaluru Urban, State: Karnataka, PIN CODE: 560036',
        'bargaati@gmail.com'
      ];
      let yCursor = 32;
      const lineGap = 6;
      const maxTextWidth = pageWidth - 28; // 14 margin on both sides
      companyLinesRaw.forEach((ln) => {
        const wrapped = doc.splitTextToSize(ln, maxTextWidth);
        wrapped.forEach((wLine) => {
          doc.text(wLine, 14, yCursor);
          yCursor += lineGap;
        });
      });

      // -- Invoice Details --
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice No:', pageWidth - 60, 22);
      doc.text('Date:', pageWidth - 60, 28);
      doc.text('Status:', pageWidth - 60, 34);

      doc.setFont('helvetica', 'normal');
      doc.text(`${order.id}`, pageWidth - 14, 22, { align: 'right' });
      doc.text(new Date(order.createdAt).toLocaleDateString('en-GB'), pageWidth - 14, 28, { align: 'right' });
      doc.text(order.status.charAt(0).toUpperCase() + order.status.slice(1), pageWidth - 14, 34, { align: 'right' });

      // -- Line Separator -- place just after header block
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.5);
      const headerBottom = Math.max(yCursor, 70);
      doc.line(14, headerBottom, pageWidth - 14, headerBottom);

      // -- Billing Details --
      const shippingDetails = order.shippingDetails || order.shippingAddress || {};
      const billTop = headerBottom + 10;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Bill To:', 14, billTop);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(shippingDetails.fullName || shippingDetails.name || 'N/A', 14, billTop + 7);
      const billingAddressLines = doc.splitTextToSize(
        `${shippingDetails.address || 'N/A'}`,
        maxTextWidth
      );
      let billCursor = billTop + 13;
      billingAddressLines.forEach((l) => { doc.text(l, 14, billCursor); billCursor += 6; });
      doc.text(
        `${shippingDetails.city || ''}, ${shippingDetails.state || ''} ${shippingDetails.pinCode || shippingDetails.pincode || ''}`,
        14,
        billCursor
      );
      billCursor += 6;
      doc.text(shippingDetails.email || 'N/A', 14, billCursor);
      billCursor += 6;
      doc.text(shippingDetails.phone || 'N/A', 14, billCursor);

      // -- Items Table --
      const items = Array.isArray(order.items) ? order.items.map(item => ({
        name: item.productName || 'Product',
        size: item.selectedSize || item.size || 'N/A',
        quantity: parseInt(item.quantity || 1),
        mrp: parseFloat(item.mrp) || parseFloat(item.finalPrice || item.price || 0),
        price: parseFloat(item.price || 0),
        gstRate: parseFloat(item.gstRate) || 0,
        total: parseFloat(item.finalPrice || item.subtotal || 0),
      })) : [];

      autoTable(doc, {
        startY: Math.max(billCursor + 12, headerBottom + 40),
        head: [['Product', 'Size', 'Qty', 'MRP', 'Price', 'GST %', 'Total']],
        body: items.map(item => [
          item.name,
          item.size,
          item.quantity,
          `₹${item.mrp.toFixed(2)}`,
          `₹${item.price.toFixed(2)}`,
          `${item.gstRate}%`,
          `₹${item.total.toFixed(2)}`
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: secondaryColor,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' }, // Product
          1: { cellWidth: 20, halign: 'center' }, // Size
          2: { cellWidth: 20, halign: 'center' }, // Qty
          3: { cellWidth: 30, halign: 'center' }, // MRP
          4: { cellWidth: 27, halign: 'center' }, // Price
          5: { cellWidth: 20, halign: 'center' }, // GST %
          6: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }, // Total
        },
        alternateRowStyles: {
          fillColor: [243, 244, 246] // gray-100
        }
      });

      // -- Totals Section --
      const finalY = doc.lastAutoTable.finalY + 10;
      const totals = [];
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = items.reduce((sum, item) => {
        const itemTotal = parseFloat(item.total || 0);
        const itemGstRate = parseFloat(item.gstRate || 0);
        // Re-calculate tax from final price if gstAmount is not available
        const itemTax = item.gstAmount || (itemTotal * itemGstRate / (100 + itemGstRate));
        return sum + itemTax;
      }, 0);
      const shippingCharge = parseFloat(
        (order.priceBreakdown && order.priceBreakdown.shippingAmount != null)
          ? order.priceBreakdown.shippingAmount
          : (order.shippingamount != null ? order.shippingamount : 0)
      );
      const discount = parseFloat(order.discount || 0);
      const totalAmount = parseFloat(
        (order.priceBreakdown && order.priceBreakdown.totalWithShipping != null)
          ? order.priceBreakdown.totalWithShipping
          : (subtotal + shippingCharge - discount)
      );

      totals.push(['Subtotal', `₹${subtotal.toFixed(2)}`]);
      if (discount > 0) totals.push(['Discount', `-₹${discount.toFixed(2)}`]);
      totals.push(['Shipping', `₹${shippingCharge.toFixed(2)}`]);
      totals.push(['Tax (included in total)', `₹${taxAmount.toFixed(2)}`]);

      autoTable(doc, {
        startY: finalY,
        body: totals,
        theme: 'plain',
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: { top: 1, right: 0, bottom: 1, left: 0 },
        },
        columnStyles: {
          0: { halign: 'right', fontStyle: 'bold' },
          1: { halign: 'right' },
        },
        margin: { left: pageWidth - 80 },
      });

      // -- Final Total --
      const totalFinalY = doc.lastAutoTable.finalY;
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(pageWidth - 80, totalFinalY + 2, pageWidth - 14, totalFinalY + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Total Amount', pageWidth - 80, totalFinalY + 8);
      doc.text(`₹${totalAmount.toFixed(2)}`, pageWidth - 14, totalFinalY + 8, { align: 'right' });

      // -- Footer --
      const footerY = pageHeight - 30;
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.5);
      doc.line(14, footerY, pageWidth - 14, footerY);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text('Thank you for your business!', 14, footerY + 8);
      // doc.text('Payment is due within 30 days. Please make payments to the specified account.', 14, footerY + 13);
      doc.text('© 2025 BARGAATI. All rights reserved.', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save the PDF
      doc.save(`invoice-${order.id}.pdf`);

    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  // const deleteOrder = async (orderId) => {
  //   try {
  //     setLoading(true);
  //     const token = localStorage.getItem('token');
  //     await axios.delete(`${BASE_URL}/api/orders/${orderId}`, {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });
  //     setOrders(prev => prev.filter(o => o.id !== orderId));
  //     toast.success('Order removed successfully.');
  //   } catch (err) {
  //     toast.error('Failed to remove order.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleOpenReview = (product) => {
    setReviewProduct(product);
    setReviewText('');
    setReviewRating(5);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewProduct) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      await axios.post(
        `${BASE_URL}/api/reviews/${reviewProduct.productId}`,
        {
          rating: reviewRating,
          reviewText: reviewText
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setShowReviewModal(false);
      toast.success('Review submitted!');
    } catch (err) {
      toast.error('Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-300 transition-colors duration-200">
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
          {/* <BackgroundParticles count={30} /> */}
        </div>
        <div className="relative z-10 container mx-auto px-6 py-12 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">My Orders</h1>
          </div>
          <div className="space-y-6">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 animate-pulse">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-28"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="h-10 bg-gray-200 rounded w-24"></div>
                  </div>
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
      <div className="min-h-screen bg-gray-900 text-gray-300 transition-colors duration-200">
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
          {/* <BackgroundParticles count={30} /> */}
        </div>
        <div className="relative z-10 container mx-auto px-6 py-12 max-w-7xl">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-8">My Orders</h1>
          <div className="text-center bg-black rounded-xl shadow-lg p-12 border border-gray-700">
        <XCircleIcon className="mx-auto h-16 w-16 text-red-500" />
        <h2 className="mt-4 text-xl font-medium text-white">Error Fetching Orders</h2>
        <p className="mt-2 text-gray-400">{error}</p>
        <button onClick={() => { setLoading(true); setError(null); fetchOrders(); }} className="mt-6 inline-block bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-yellow-600 transition-all duration-200">
          Try Again
        </button>
      </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white transition-colors duration-200">
      <Toaster position="top-center" reverseOrder={false} />
      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText="Yes, Remove"
        icon={XCircleIcon}
        iconColor="text-red-500"
      />
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        {/* <BackgroundParticles count={30} /> */}
      </div>
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-7xl pb-20">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Orders</h1>
        </div>

        {orders.length === 0 ? (
          <div className="bg-black rounded-xl p-12 text-center border border-gray-700">
            <ShoppingBag className="mx-auto h-16 w-16 text-yellow-500 mb-6" />
            <h3 className="text-xl font-medium text-white mb-3">No orders yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">You haven't placed any orders yet. Start exploring our products!</p>
            <Link to="/" className="inline-flex items-center px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-600 transition-all duration-200 shadow-lg hover:scale-105">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Order Status Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
              {orderStatuses.map((status) => {
                const Icon = status.icon;
                const count = getOrderCount(status.id);
                return (
                  <button
                    key={status.id}
                    onClick={() => setActiveTab(status.id)}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all duration-200 ${activeTab === status.id ? 'bg-black border-yellow-500 text-white' : 'bg-black hover:bg-black/90 border-gray-700 text-white'}`}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800/50 mb-2"><status.icon className="w-5 h-5 text-yellow-500" /></div>
                    <span className="text-sm font-medium">{status.label}</span>
                    <span className="text-xs mt-1 text-gray-500">{count} orders</span>
                  </button>
                );
              })}
            </div>

            {/* Filtered Orders */}
            <div className="space-y-6">
              {filteredOrders.length === 0 ? (
                <div className="bg-black rounded-xl p-8 text-center border border-gray-700">
                  <Package className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No {activeTab} orders</h3>
                  <p className="text-gray-400">You don't have any orders with this status.</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <React.Fragment key={order.id}>
                    <div className="bg-black rounded-xl shadow-sm overflow-hidden border border-gray-700 hover:border-yellow-500/50 hover:shadow-md transition-all duration-200 relative">
                      {/* Remove Icon */}
                      {/* <XCircleIcon
                        className="absolute top-4 right-4 w-6 h-6 text-gray-500 hover:text-yellow-500 cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModalState({
                            isOpen: true,
                            title: 'Confirm Removal',
                            message: 'Are you sure you want to remove this order?',
                            onConfirm: () => {
                              setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                              deleteOrder(order.id);
                            },
                          });
                        }}
                      /> */}

                      {/* Main content with padding */}
                      <div className="p-6">
                        {/* Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-700">
                              <Package className="w-6 h-6 text-yellow-500" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-3 mb-2">                              <h3 className="text-lg font-semibold text-white">
                                {order.items && order.items[0] ? order.items[0].productName : 'No product name'}
                              </h3>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                                <span className="ml-1.5 capitalize">{order.status}</span>
                              </span>
                            </div>
                            <p className="text-sm text-gray-400">
                              Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {/* <div className="mt-1 text-sm text-gray-300">
                              <span className="mr-4">
                                Shipping: ₹{Number((order.priceBreakdown?.shippingAmount ?? order.shippingamount ?? 0)).toFixed(2)}
                              </span>
                              <span>
                                Total: ₹{Number((order.priceBreakdown?.totalWithShipping ?? 0)).toFixed(2)}
                              </span>
                            </div> */}
                            {(() => {
                              // Compute total with robust fallbacks
                              const itemsTotal = Array.isArray(order.items)
                                ? order.items.reduce((sum, it) => sum + (Number(it.totalPrice ?? it.total_price ?? it.price ?? 0)), 0)
                                : 0;
                              const shipping = Number(order.priceBreakdown?.shippingAmount ?? order.shippingamount ?? 0);
                              const pbTotal = Number(order.priceBreakdown?.totalWithShipping ?? order.priceBreakdown?.grandTotal ?? NaN);
                              const explicitTotal = Number(order.totalWithShipping ?? order.total_with_shipping ?? NaN);
                              const totalWithShipping = Number.isFinite(pbTotal)
                                ? pbTotal
                                : (Number.isFinite(explicitTotal) ? explicitTotal : (itemsTotal + shipping));

                              // Payment mode
                              const rawPaymentMode = order.paymentmode ?? order.paymentMode;
                              const mode = (rawPaymentMode || '').toUpperCase();

                              // Pure COD: show only Balance COD, no advance badges
                              if (mode === 'COD') {
                                return (
                                  <div className="mt-2 text-xs text-gray-300">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-800 border border-gray-600">
                                      Balance COD: ₹{(Number.isFinite(totalWithShipping) ? totalWithShipping : 0).toFixed(2)}
                                    </span>
                                  </div>
                                );
                              }

                              // Advance amounts from backend (snake_case) with camel fallback
                              const advanceRequired = Number(order.advance_required_amount ?? order.advanceRequiredAmount ?? 0);
                              const advancePaid = Number(order.advance_paid_amount ?? order.advancePaidAmount ?? 0);
                              const balanceDueField = Number(order.balance_due_amount ?? order.balanceDueAmount ?? NaN);
                              const hasAdvance = (Number.isFinite(advanceRequired) && advanceRequired > 0)
                                || (Number.isFinite(advancePaid) && advancePaid > 0)
                                || (Number.isFinite(balanceDueField) && balanceDueField > 0);

                              if (hasAdvance) {
                                const balanceDue = Number.isFinite(balanceDueField)
                                  ? balanceDueField
                                  : Math.max(0, (Number.isFinite(totalWithShipping) ? totalWithShipping : 0) - (Number.isFinite(advancePaid) ? advancePaid : 0));
                                return (
                                  <div className="mt-2 text-xs text-gray-300 space-x-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-800 border border-gray-600">
                                      Advance Required: ₹{(Number.isFinite(advanceRequired) ? advanceRequired : 0).toFixed(2)}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-800 border border-gray-600">
                                      Advance Paid: ₹{(Number.isFinite(advancePaid) ? advancePaid : 0).toFixed(2)}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-800 border border-gray-600">
                                      Balance COD: ₹{(Number.isFinite(balanceDue) ? balanceDue : 0).toFixed(2)}
                                    </span>
                                  </div>
                                );
                              }

                              return null;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Order Summary */}
                      <div className="flex flex-col space-y-6">
                        {/* Order Items */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-3">Items in this order</h4>
                          <div className="flex items-center space-x-3 overflow-x-auto pb-2">
                            {order.items && order.items.slice(0, 4).map((item, index) => (
                                <div key={index} className="flex-shrink-0 flex items-center space-x-2 bg-black rounded-lg p-2 border border-gray-600">
                                  <div className="w-52 h-52 bg-black rounded-lg overflow-hidden flex-shrink-0">
                                    {item.imageUrl ? (
                                      <img 
                                        src={getImageUrl(item.imageUrl)}
                                        alt={item.productName} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div className="w-full h-full flex items-center justify-center" style={{ display: item.imageUrl ? 'none' : 'flex' }}>
                                      <Package className="w-4 h-4 text-gray-400" />
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-200 truncate max-w-[150px]">
                                      {item.productName || `Product ID: ${item.productId}`}
                                    </p>
                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                    {item.selectedSize && (
                                      <p className=" mr-3 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1 ">
                                        Size: {item.selectedSize}
                                      </p>
                                    )}
                                    {/* Review button for delivered orders */}
                                    {order.status === 'delivered' && (
                                      <button
                                        className="mt-2 inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold rounded-full hover:from-yellow-600 hover:to-amber-600 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1"
                                        onClick={() => handleOpenReview({
                                          productId: item.productId,
                                          orderId: order.id,
                                          productName: item.productName
                                        })}
                                      >
                                        <Star className="w-3 h-3 mr-1.5 fill-current" />
                                        Review Product
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {order.items && order.items.length > 4 && (
                                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-gray-700 rounded-lg text-xs font-medium text-gray-400">
                                  +{order.items.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Buttons Row */}
                        <div className="flex flex-row justify-between gap-4 mt-2 w-100 h-12">
                          <Link
                            to={`/customer/orders/${order.id}`}
                            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-yellow-500 text-black font-medium rounded-xl hover:bg-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                          >
                            <Package className="w-5 h-5 mr-2" />
                            View Details
                          </Link>
                          {order.status === 'delivered' && (
                            <button
                              onClick={() => downloadInvoice(order)}
                              className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                            >
                              <Download className="w-5 h-5 mr-2" />
                              Download Invoice
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative transform transition-all duration-300 scale-100 animate-in fade-in-0 zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Write a Review</h3>
                  <p className="text-sm text-gray-500 mt-1">{reviewProduct?.productName}</p>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200" 
                onClick={() => setShowReviewModal(false)}
              >
                <XCircleIcon className="w-6 h-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Rating Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">How would you rate this product?</label>
                <div className="flex items-center space-x-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`p-1 transition-colors duration-200 ${
                        star <= reviewRating 
                          ? 'text-yellow-400 hover:text-yellow-500' 
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    >
                      <svg className="w-8 h-8 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  {reviewRating === 5 && "Excellent!"}
                  {reviewRating === 4 && "Very Good"}
                  {reviewRating === 3 && "Good"}
                  {reviewRating === 2 && "Fair"}
                  {reviewRating === 1 && "Poor"}
                </p>
              </div>

              {/* Review Text Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Share your experience</label>
                <div className="relative">
                  <textarea 
                    value={reviewText} 
                    onChange={e => setReviewText(e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none placeholder-gray-400" 
                    rows={4}
                    placeholder="Tell others about your experience with this product..."
                    maxLength={500}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {reviewText.length}/500
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button 
                onClick={() => setShowReviewModal(false)}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitReview}
                disabled={!reviewText.trim() || reviewRating === 0}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;