import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../../util';
import { FaArrowLeft, FaTruck, FaTimes, FaDownload } from 'react-icons/fa';
import { generateBillPDF } from '../../utils/billGenerator';
import { toast } from 'react-hot-toast';

const AdminOrderDetails = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();

  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order);
  const [downloading, setDownloading] = useState(false);

  // helper: format date
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Invalid Date';
    }
  }, []);

  // normalize image URL coming from backend
  const normalizeImageUrl = useCallback((url) => {
    if (!url) return null;
    try {
      const trimmed = String(url).trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed; // already absolute
      // ensure single slash join
      const base = BASE_URL.replace(/\/$/, '');
      const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return `${base}${path}`;
    } catch {
      return null;
    }
  }, []);

  const getShippingAmountForOrder = useCallback(async (rawOrder) => {
    try {
      const persisted = rawOrder?.priceBreakdown?.shippingAmount ?? rawOrder?.shippingamount;
      if (persisted != null) return Number(persisted) || 0;
      const pin = rawOrder?.pincode || rawOrder?.shippingAddress?.PinCode;
      if (!pin) return 0;
      const { data } = await axios.get(`${BASE_URL}/api/shipping/amount`, { params: { pincode: String(pin) } });
      return data && data.amount != null ? Number(data.amount) : 0;
    } catch {
      return 0;
    }
  }, []);

  // Ensure each order item has advancePerUnit by fetching product details when missing
  const enrichItemsWithAdvance = useCallback(async (orderObj) => {
    if (!orderObj) return orderObj;
    const items = orderObj.orderDetails || orderObj.orderItems;
    if (!Array.isArray(items)) return orderObj;
    const getAdvanceFromObj = (obj) => {
      if (!obj || typeof obj !== 'object') return 0;
      // prioritize string advance_payment_value first, then numeric fields
      return (
        Number(obj.advance_payment_value) ||
        Number(obj.advancePerUnit) ||
        Number(obj.advance_amount) ||
        Number(obj.advanceAmount) ||
        Number(obj.advance) ||
        Number(obj.deposit) ||
        Number(obj.advance_per_unit) ||
        Number(obj.advanceUnit) ||
        Number(obj.advance_unit) ||
        Number(obj.advancePrice) ||
        Number(obj.advance_amt) ||
        0
      );
    };

    const filled = await Promise.all(items.map(async (it) => {
      const current = Number(it.advancePerUnit) || Number(it.advance_amount) || Number(it.advanceAmount) || Number(it.advance) || Number(it.deposit) || 0;
      if (current > 0) return { ...it, advancePerUnit: current };
      const pid = it.productId || it.product_id || it.product?.id || it.id;
      if (!pid) return { ...it, advancePerUnit: 0 };
      try {
        const resp = await axios.get(`${BASE_URL}/api/products/${pid}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const d = resp?.data ?? {};
        const p = d.product ?? d.data ?? d; // support different API shapes
        // direct fields
        let adv = getAdvanceFromObj(p);
        // try nested variant/size/option by selectedSize
        const sel = it.selectedSize || it.size || it.variant || null;
        if (!adv && sel) {
          const collections = [
            p.productSizes, // main list from your API
            p.variants,
            p.sizes,
            p.options,
            p.attributes,
            p.stock,
            p.inventory
          ];
          for (const coll of collections) {
            if (Array.isArray(coll)) {
              const match = coll.find(v => {
                const cand = String(v.size || v.Size || v.name || v.variant || v.label || v.sku || '').toLowerCase();
                return cand && cand === String(sel).toLowerCase();
              });
              if (match) {
                adv = getAdvanceFromObj(match);
                if (adv) break;
              }
            }
          }
        }
        // last resort: first element in variants-like arrays
        if (!adv) {
          const collections = [p.variants, p.sizes, p.options];
          for (const coll of collections) {
            if (Array.isArray(coll) && coll.length) {
              adv = getAdvanceFromObj(coll[0]);
              if (adv) break;
            }
          }
        }
        console.log('[AdminOrderDetails] advance lookup', { pid, selectedSize: sel, adv, product: p });
        return { ...it, advancePerUnit: adv || 0 };
      } catch {
        return { ...it, advancePerUnit: 0 };
      }
    }));
    return { ...orderObj, orderDetails: filled, orderItems: filled };
  }, [BASE_URL]);

  // helper: ensure each order item has an imageUrl populated
  const enrichItemsWithImages = useCallback(async (orderObj) => {
    if (!orderObj) return orderObj;
    const orderItems = orderObj.orderDetails || orderObj.orderItems;
    if (!Array.isArray(orderItems)) return orderObj;
    try {
      const itemsWithImages = await Promise.all(
        orderItems.map(async (it) => {
          const productId = it.productId || it.product_id || it.product?.id || it.id;
          if (!productId) return { ...it, imageUrl: it.imageUrl ?? null };
          // if already has imageUrl, keep
          if (it.imageUrl) return it;
          try {
            const imageResp = await axios.get(`${BASE_URL}/api/products/${productId}/images`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const imageUrl = imageResp.data?.[0]?.url || imageResp.data?.[0]?.imageurl || null;
            return { ...it, imageUrl: normalizeImageUrl(imageUrl) };
          } catch (e) {
            console.warn('[AdminOrderDetails] image fetch failed for product', productId, e);
            return { ...it, imageUrl: null };
          }
        })
      );
      return { ...orderObj, orderDetails: itemsWithImages, orderItems: itemsWithImages };
    } catch (e) {
      console.warn('[AdminOrderDetails] enrichItemsWithImages error', e);
      return orderObj;
    }
  }, []);

  // fetch when state not provided
  useEffect(() => {
    const fetchById = async () => {
      try {
        setLoading(true);
        const resp = await axios.get(`${BASE_URL}/api/orders/getall`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const all = Array.isArray(resp.data) ? resp.data : [];
        const raw = all.find((o) => String(o.id) === String(id));
        if (!raw) {
          toast.error('Order not found');
          return;
        }
        // map to UI shape
        const orderItems = Array.isArray(raw.orderItems) ? raw.orderItems.map((item) => {
          console.log('[AdminOrderDetails] raw order item', item);
          const priceAtPurchase = parseFloat(item.priceatpurchase);
          const qty = parseInt(item.quantity, 10);
          let productId = item.product?.id || item.productid || item.product_id || item.productId;
          return {
            productId,
            productName: item.product?.productname || item.productName || 'Product',
            quantity: !isNaN(qty) ? qty : 0,
            price: !isNaN(priceAtPurchase) ? priceAtPurchase : 0,
            selectedSize: item.selectedSize || null,
            priceBeforeGST: item.priceBeforeGST || 0,
            gstAmount: item.gstAmount || 0,
            finalPrice: item.finalPrice || priceAtPurchase,
            gstRate: item.gstRate || 0,
            gstType: item.gstType || 'exclusive',
            // advance per-unit candidates
            advancePerUnit: (
              Number(item.advance_payment_value) ||
              Number(item.advancePerUnit) ||
              Number(item.advance_amount) ||
              Number(item.advanceAmount) ||
              Number(item.advance) ||
              Number(item.deposit) ||
              Number(item.advance_per_unit) ||
              Number(item.advanceUnit) ||
              Number(item.advance_unit) ||
              Number(item.advancePrice) ||
              Number(item.advance_amt) ||
              Number(item.product?.advance_payment_value) ||
              Number(item.product?.advance_amount) ||
              Number(item.product?.advanceAmount) ||
              Number(item.product?.advance) ||
              Number(item.product?.deposit) ||
              Number(item.product?.advance_per_unit) ||
              Number(item.product?.advanceUnit) ||
              Number(item.product?.advance_unit) ||
              Number(item.product?.advancePrice) ||
              Number(item.product?.advance_amt)
            ) || 0,
          };
        }) : [];
        console.log('[AdminOrderDetails] mapped orderItems', orderItems);
        // enrich each item with image
        const itemsWithImages = await Promise.all(orderItems.map(async (it) => {
          if (!it.productId) return { ...it, imageUrl: null };
          try {
            const imageResp = await axios.get(`${BASE_URL}/api/products/${it.productId}/images`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const imageUrl = imageResp.data?.[0]?.url || imageResp.data?.[0]?.imageurl || null;
            return { ...it, imageUrl: normalizeImageUrl(imageUrl) };
          } catch {
            return { ...it, imageUrl: null };
          }
        }));

        const shipping = await getShippingAmountForOrder(raw);
        const subtotal = raw.priceBreakdown?.subtotalBeforeGST || 0;
        const tax = raw.priceBreakdown?.totalGSTAmount || 0;
        const total = (raw.priceBreakdown?.grandTotal || 0) + shipping;

        let mapped = {
          id: String(raw.id),
          orderDate: formatDate(raw.createdAt),
          customerName: raw.fullname || (raw.user ? `${raw.user.firstName || ''} ${raw.user.lastName || ''}`.trim() : 'Unknown'),
          contactNumber: raw.phonenumber || 'Not provided',
          status: raw.status ? (raw.status.charAt(0).toUpperCase() + raw.status.slice(1)) : 'Unknown',
          customerDetails: {
            email: raw.email || (raw.user ? raw.user.email : 'Unknown'),
            registeredSince: raw.user ? formatDate(raw.user.createdAt) : 'Unknown',
            additionalPhone:
              (raw.user && raw.user.profile && (raw.user.profile.additionalPhone || raw.user.profile.additional_phone)) ? (raw.user.profile.additionalPhone || raw.user.profile.additional_phone) :
                (raw.user && raw.user.userprofile && (raw.user.userprofile.additionalPhone || raw.user.userprofile.additional_phone)) ? (raw.user.userprofile.additionalPhone || raw.user.userprofile.additional_phone) :
                  (raw.user && (raw.user.additionalPhone || raw.user.additional_phone)) ? (raw.user.additionalPhone || raw.user.additional_phone) :
                    (raw.additionalPhone || raw.additional_phone || null),
          },
          shippingAddress: {
            street: raw.address || 'N/A',
            city: raw.city || 'N/A',
            state: raw.state || 'N/A',
            PinCode: raw.pincode || 'N/A',
            country: raw.country || 'N/A',
          },
          orderDetails: itemsWithImages,
          priceDetails: { subtotal, tax, shipping, total },
          paymentDetails: {
            method: raw.paymentmode || 'N/A',
            status: raw.payment_status ? (raw.payment_status === 'paid' ? 'Paid' : raw.payment_status === 'partial_paid' ? 'Partially Paid' : raw.payment_status === 'failed' ? 'Failed' : 'Pending') : 'Pending',
            transactionId: raw.payment_transaction_id || raw.phonepe_pg_transaction_id || raw.advance_payment_txn_id || 'N/A',
            phonepe_status: raw.phonepe_status || null,
          },
          // Include advance payment fields for bill generation
          balance_due_amount: Number(raw.balance_due_amount || 0),
          advance_paid_amount: Number(raw.advance_paid_amount || 0),
          advance_required_amount: Number(raw.advance_required_amount || 0),
          payment_status: raw.payment_status || 'unpaid',
          trackingId: raw.trackingid || '',
          courierCompany: raw.couriercompany || '',
          rejectReason: raw.rejectreason || '',
        };
        // enrich advance if missing
        mapped = await enrichItemsWithAdvance(mapped);
        setOrder(mapped);
      } catch (e) {
        console.error('[AdminOrderDetails] Fetch failed', e);
        toast.error('Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    const maybeEnrichFromState = async () => {
      // We navigated from list with order in state but likely without images. Enrich.
      try {
        setLoading(true);
        const withImages = await enrichItemsWithImages(state.order);
        const enriched = await enrichItemsWithAdvance(withImages);
        setOrder(enriched);
      } catch (e) {
        console.warn('[AdminOrderDetails] failed to enrich state order with images', e);
        setOrder(state.order);
      } finally {
        setLoading(false);
      }
    };

    if (!state?.order) {
      fetchById();
    } else if (!(state.order?.orderDetails?.some(it => it?.imageUrl) || state.order?.orderItems?.some(it => it?.imageUrl))) {
      maybeEnrichFromState();
    }
  }, [BASE_URL, id, state, getShippingAmountForOrder, formatDate, enrichItemsWithImages]);

  const getPaymentBadge = (status) => {
    const s = (status || 'Pending').toLowerCase();
    const classes = s === 'paid' ? 'bg-green-100 text-green-800' : s.includes('partial') ? 'bg-yellow-100 text-yellow-800' : s === 'failed' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800';
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${classes}`}>{status || 'Pending'}</span>;
  };

  // convert numbers to words (international system)
  const numberToWords = useCallback((num) => {
    if (num == null || isNaN(num)) return '';
    const n = Math.abs(Math.trunc(num));
    if (n === 0) return 'Zero';
    const belowTwenty = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const toWords = (x) => {
      if (x < 20) return belowTwenty[x];
      if (x < 100) return (tens[Math.floor(x / 10)] + (x % 10 ? ' ' + belowTwenty[x % 10] : '')).trim();
      if (x < 1000) return (belowTwenty[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + toWords(x % 100) : '')).trim();
      if (x < 1_000_000) return (toWords(Math.floor(x / 1000)) + ' Thousand' + (x % 1000 ? ' ' + toWords(x % 1000) : '')).trim();
      if (x < 1_000_000_000) return (toWords(Math.floor(x / 1_000_000)) + ' Million' + (x % 1_000_000 ? ' ' + toWords(x % 1_000_000) : '')).trim();
      return (toWords(Math.floor(x / 1_000_000_000)) + ' Billion' + (x % 1_000_000_000 ? ' ' + toWords(x % 1_000_000_000) : '')).trim();
    };

    return toWords(n);
  }, []);

  const grandTotalValue = useMemo(() => {
    const raw = (order?.priceDetails?.total?.toFixed ? order.priceDetails.total : Number(order?.priceDetails?.total || 0));
    return isNaN(raw) ? 0 : Number(raw);
  }, [order]);

  const grandTotalInWords = useMemo(() => numberToWords(Math.trunc(grandTotalValue)), [grandTotalValue, numberToWords]);



  // display payment status as Paid if order is delivered/delivery
  const effectivePaymentStatus = useMemo(() => {
    const os = order?.status ? String(order.status).toLowerCase() : '';
    if (os === 'delivered' || os === 'delivery' || os.startsWith('deliver')) return 'Paid';
    return order?.paymentDetails?.status || 'Pending';
  }, [order]);

  // ===== Advance/Balance helpers =====
  const parseAmount = useCallback((v) => {
    if (v == null) return NaN;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const cleaned = v.replace(/[^0-9.\-]/g, '');
      const n = Number(cleaned);
      return isNaN(n) ? NaN : n;
    }
    return NaN;
  }, []);

  const computeAdvancePaid = useCallback((ord) => {
    try {
      const items = ord?.orderDetails || ord?.orderItems || [];
      if (Array.isArray(items) && items.length) {
        const sum = items.reduce((acc, it) => acc + ((parseAmount(it.advancePerUnit) || 0) * (Number(it.quantity) || 0)), 0);
        if (!isNaN(sum) && sum > 0) return sum;
      }
    } catch {}
    const cands = [ord?.paymentDetails?.advancePaid, ord?.priceDetails?.advancePaid, ord?.priceBreakdown?.advancePaidAmount, ord?.advancePaidAmount]
      .map(parseAmount).filter((x) => !isNaN(x) && x > 0);
    return cands[0] || 0;
  }, [parseAmount]);

  const computeBalanceCod = useCallback((ord) => {
    const total = Number(ord?.priceDetails?.total) || 0;
    const balC = [ord?.paymentDetails?.balance, ord?.paymentDetails?.balance_cod, ord?.paymentDetails?.balanceCOD, ord?.paymentDetails?.codBalance, ord?.priceDetails?.balance, ord?.priceBreakdown?.balance, ord?.balance]
      .map(parseAmount).filter((n) => !isNaN(n) && n >= 0);
    if (balC.length) return balC[0];
    const paid = computeAdvancePaid(ord);
    return Math.max(0, total - paid);
  }, [parseAmount, computeAdvancePaid]);

  const isAdvancePayment = useCallback((ord) => {
    const method = (ord?.paymentDetails?.method || '').toLowerCase();
    const status = (ord?.paymentDetails?.status || '').toLowerCase();
    return status.includes('partial') || method.includes('advance');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 sm:p-4 mt-12 sm:mt-0">
      <div className="max-w-6xl mx-auto">
        <div className="p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm relative">
          <button
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 text-gray-600"
            onClick={() => navigate(-1)}
            aria-label="Close"
            title="Close"
          >
            <FaTimes className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => navigate(-1)} aria-label="Back">
                <FaArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Order Details</span>
                <span className="ml-3 text-sm text-gray-500">{id}</span>
              </h2>
            </div>
            {order?.courierCompany || order?.trackingId ? (
              <div className="flex items-center bg-blue-50 px-3 py-1.5 rounded-lg">
                <FaTruck className="text-blue-600 mr-2" />
                <div className="text-xs">
                  <div className="font-medium text-gray-800">{order?.courierCompany}</div>
                  <div className="text-gray-600">{order?.trackingId}</div>
                </div>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
              <span className="ml-3 text-sm text-gray-600">Loading order...</span>
            </div>
          ) : !order ? (
            <div className="p-8 text-center text-gray-500">Order not found.</div>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden">
              <table className="min-w-full">
                <tbody>
                  {/* Price Details Section */}
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <td colSpan="2" className="px-6 py-4">
                      <h3 className="text-lg font-semibold text-gray-800">Price Details</h3>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600 w-1/3">Subtotal   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">₹{order.priceDetails?.subtotal?.toFixed ? order.priceDetails.subtotal.toFixed(2) : Number(order.priceDetails?.subtotal || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Tax   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">₹{order.priceDetails?.tax?.toFixed ? order.priceDetails.tax.toFixed(2) : Number(order.priceDetails?.tax || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Shipping   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">₹{order.priceDetails?.shipping?.toFixed ? order.priceDetails.shipping.toFixed(2) : Number(order.priceDetails?.shipping || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 bg-blue-50">
                    <td className="px-6 py-3 text-sm font-bold text-gray-700">Grand Total   :</td>
                    <td className="px-6 py-3 text-sm font-bold text-blue-600">₹{grandTotalValue.toFixed(2)} {grandTotalInWords ? `(${grandTotalInWords} only)` : ''}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Payment Method   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.paymentDetails?.method || 'N/A'}  {getPaymentBadge(effectivePaymentStatus)}</td>
                  </tr>
                  {/* Advance/Balance for Advance or Partial payments */}
                  {isAdvancePayment(order) && (
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-600">Balance COD   :</td>
                      <td className="px-6 py-3 text-sm text-gray-800">₹{computeBalanceCod(order).toFixed(2)} ({numberToWords(Math.trunc(computeBalanceCod(order)))} only)</td>
                    </tr>
                  )}
                  {/* Customer Information Section */}
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <td colSpan="2" className="px-6 py-4">
                      <h3 className="text-lg font-semibold text-gray-800">Customer Information</h3>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Name   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.customerName}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Contact   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.contactNumber}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Additional Contact   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">+91{order.customerDetails?.additionalPhone || 'Not provided'}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Email   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.customerDetails?.email}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Registered Since   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.customerDetails?.registeredSince}</td>
                  </tr>

                  {/* Shipping Address Section */}
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <td colSpan="2" className="px-6 py-4">
                      <h3 className="text-lg font-semibold text-gray-800">Shipping Address</h3>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Street   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.shippingAddress?.street}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">City   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.shippingAddress?.city}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">State   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.shippingAddress?.state}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Pin Code   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.shippingAddress?.PinCode}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Country   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.shippingAddress?.country}</td>
                  </tr>

                  {/* Order Items Section */}
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <td colSpan="2" className="px-6 py-4">
                      <h3 className="text-lg font-semibold text-gray-800">Order Items</h3>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" className="px-6 py-4">
                      {(Array.isArray(order.orderDetails) && order.orderDetails.length > 0) || (Array.isArray(order.orderItems) && order.orderItems.length > 0) ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Advance/Unit</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Advance Total</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {(order.orderDetails || order.orderItems || []).map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="py-3 px-4">
                                    {item.imageUrl ? (
                                      <img src={item.imageUrl} alt={item.productName} className="h-16 w-16 object-cover rounded-md shadow-sm" />
                                    ) : (
                                      <div className="h-16 w-16 bg-gray-200 rounded-md flex items-center justify-center">
                                        <span className="text-xs text-gray-400">No image</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-700">
                                    <div>
                                      {item.productName}
                                      {item.selectedSize && (
                                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1 ml-2">Size: {item.selectedSize}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-700 text-center">{item.quantity}</td>
                                  <td className="py-3 px-4 text-sm text-gray-700 text-right">₹{typeof item.price === 'number' ? item.price.toFixed(2) : 'N/A'}</td>
                                  <td className="py-3 px-4 text-sm text-gray-700 text-right font-medium">₹{typeof item.price === 'number' && typeof item.quantity === 'number' ? (item.price * item.quantity).toFixed(2) : 'N/A'}</td>
                                  <td className="py-3 px-4 text-sm text-gray-700 text-right">₹{(Number(item.advancePerUnit) || 0).toFixed(2)}</td>
                                  <td className="py-3 px-4 text-sm text-gray-700 text-right font-medium">₹{(((Number(item.advancePerUnit) || 0) * (Number(item.quantity) || 0)) || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-4">No items in this order.</div>
                      )}
                    </td>
                  </tr>

                  {/* Order Summary Section */}
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <td colSpan="2" className="px-6 py-4">
                      <h3 className="text-lg font-semibold text-gray-800">Order Summary</h3>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Order ID   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.id}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Order Date   :</td>
                    <td className="px-6 py-3 text-sm text-gray-800">{order.orderDate}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-600">Status   :</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${order.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status.toLowerCase() === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                            order.status.toLowerCase() === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetails;
