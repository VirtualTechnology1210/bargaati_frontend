 // Persist ordered items for post-payment cart cleanup (for online payments)
 const persistOrderedItemsForCleanup = (items) => {
  try {
    const slim = (items || []).map(it => ({
      id: it.id,
      productId: it.productId || it.id,
      selectedSize: it.selectedSize || it.size || null,
    }));
    localStorage.setItem('orderedItemsForCleanup', JSON.stringify(slim));
  } catch (e) {
    console.error('Failed to persist ordered items for cleanup', e);
  }
 };

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CheckCircle, ArrowLeft, CreditCard, Truck, MapPin, ShoppingBag, Tag, Info, ShieldCheck, Clock, X, ArrowRight, Plus, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { BASE_URL } from '../../util';
import PageLayout from '../components/PageLayout';
// import BackgroundParticles from '../components/BackgroundParticles';

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, getTotalPrice, clearCart, removeSelectedItemsFromCart, removeSpecificItemsFromCart } = useCart();

  // Get selected items from navigation state, fallback to all cart items
  const selectedItems = location.state?.selectedItems || cart;

  // Calculate totals using pre-calculated GST values from backend
  const calculateSelectedItemsTotals = () => {
    if (!selectedItems || selectedItems.length === 0) {
      return { subtotal: 0, totalGst: 0, total: 0 };
    }

    return selectedItems.reduce((totals, item) => {
      const quantity = parseInt(item.quantity) || 0;
      // Use pre-calculated values from backend
      const priceBeforeGST = parseFloat(item.priceBeforeGST) || parseFloat(item.price) || 0;
      const gstAmount = parseFloat(item.gstAmount) || 0;
      const finalPrice = parseFloat(item.finalPrice) || parseFloat(item.price) || 0;

      return {
        subtotal: totals.subtotal + (priceBeforeGST * quantity),
        totalGst: totals.totalGst + (gstAmount * quantity),
        total: totals.total + (finalPrice * quantity)
      };
    }, { subtotal: 0, totalGst: 0, total: 0 });
  };

  // Helper: initiate PhonePe payment and redirect user
  const initiatePhonePe = async ({ orderId, amount, paymentMode }) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = `${BASE_URL}/api/payments/phonepe/initiate`;
      const { data } = await axios.post(
        endpoint,
        { orderId, amount, paymentMode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.redirectUrl) {
        if (data.merchantTransactionId) {
          try { localStorage.setItem('phonepe_mtid', data.merchantTransactionId); } catch { }
        }
        window.location.href = data.redirectUrl;
        return true;
      }
      toast.error('Failed to start payment');
      return false;
    } catch (err) {
      console.error('[initiatePhonePe] Error:', err);
      console.error('[initiatePhonePe] Error response:', JSON.stringify(err?.response?.data, null, 2));
      const msg = err?.response?.data?.message || err?.message || 'Payment initiation failed';
      const code = err?.response?.data?.code;
      if (code) {
        toast.error(`${msg} (${code})`);
      } else {
        toast.error(msg);
      }
      return false;
    }
  };

  // Get calculated totals
  const { subtotal: subtotalAmount, totalGst: taxAmount, total: totalAmount } = calculateSelectedItemsTotals();


  // Helper function to format currency
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };



  // Redirect to cart if no items are selected
  useEffect(() => {
    if (selectedItems.length === 0) {
      navigate('/customer/cart');
      toast.error('Please select items to checkout');
    }
  }, [selectedItems, navigate]);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState({ cod: true, creditCard: true, upi: true, advanceEnabled: false, advanceAmount: 0 });
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    additionalPhone: '',
    address: '',
    city: '',
    state: '',
    PinCode: '',
    country: '',
    paymentMethod: 'cod',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  });
  const [profileAdditionalPhone, setProfileAdditionalPhone] = useState('');
  // Advance payment interstitial state
  const [showAdvanceUI, setShowAdvanceUI] = useState(false);
  const [advancePaid, setAdvancePaid] = useState(false);
  const [advanceProcessing, setAdvanceProcessing] = useState(false);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [shippingChecked, setShippingChecked] = useState(false);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [isEmailEditable, setIsEmailEditable] = useState(true);

  // Map productId -> resolved image URL for Checkout previews
  const [imageMap, setImageMap] = useState({});
  // Intersection of allowed payment methods across selected products
  const [productPaymentCaps, setProductPaymentCaps] = useState({ cod: false, creditCard: false, upi: false, advance: false, advanceAny: false });

  // Helper: build full image URL from backend
  const buildFullUrl = (u) => {
    if (!u) return null;
    if (u.startsWith('http')) return u;
    if (u.startsWith('/')) return `${BASE_URL}${u}`;
    return `${BASE_URL}/uploads/${u}`;
  };

  // Resolve image to display for a checkout item
  const getItemImage = (item) => {
    const direct = item?.image || item?.imageUrl;
    if (direct) return buildFullUrl(direct);
    const byMap = imageMap[item?.productId || item?.id];
    if (byMap) return byMap;
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMxMDEwMTAiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzkzOTM5MyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
  };

  // Fetch primary product image for any items missing an explicit image
  useEffect(() => {
    const missing = (selectedItems || []).filter(it => !it?.image && !it?.imageUrl && !imageMap[(it?.productId || it?.id)]);
    if (missing.length === 0) return;

    let isCancelled = false;
    (async () => {
      const entries = await Promise.all(missing.map(async (it) => {
        try {
          const pid = it?.productId || it?.id;
          if (!pid) return null;
          const { data } = await axios.get(`${BASE_URL}/api/products/${pid}/images`);
          const imgUrl = (data?.[0]?.imageUrl || data?.[0]?.url);
          const resolved = buildFullUrl(imgUrl);
          return { pid, url: resolved };
        } catch {
          return null;
        }
      }));
      if (isCancelled) return;
      const next = { ...imageMap };
      for (const e of entries) {
        if (e && e.pid && e.url) next[e.pid] = e.url;
      }
      setImageMap(next);
    })();

    return () => { isCancelled = true; };
  }, [selectedItems, imageMap]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchSavedAddresses();
      
      // Check if user just logged in and should be redirected back to checkout
      const checkoutRedirect = localStorage.getItem('checkout_redirect');
      if (checkoutRedirect === 'true') {
        try {
          const checkoutData = localStorage.getItem('checkout_data');
          if (checkoutData) {
            const parsed = JSON.parse(checkoutData);
            
            // Clear the redirect flags first
            localStorage.removeItem('checkout_redirect');
            localStorage.removeItem('checkout_email');
            localStorage.removeItem('checkout_data');
            
            // Redirect to checkout with the selected items
            navigate('/customer/checkout', {
              state: {
                selectedItems: parsed.selectedItems || []
              },
              replace: true
            });
            
            // Restore form data if available
            if (parsed.formData) {
              setFormData(prev => ({
                ...prev,
                ...parsed.formData
              }));
            }
            
            toast.success('Welcome back! You can now complete your order.', {
              duration: 3000
            });
          }
        } catch (e) {
          console.error('Failed to restore checkout state:', e);
        }
      }
    } else {
      // Guest: show new address form by default and make email editable
      setShowNewAddressForm(true);
      setIsEmailEditable(true);
    }
  }, []);

  // Load user's profile to prefill additionalPhone (single source of truth)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${BASE_URL}/api/userprofile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const ap = res?.data?.profile?.additionalPhone || '';
        setProfileAdditionalPhone(ap);
        // If form has no value yet, seed it once
        setFormData(prev => ({ ...prev, additionalPhone: prev.additionalPhone || ap }));
      } catch (err) {
        console.error('Failed to load profile for additionalPhone', err);
      }
    };
    fetchProfile();
  }, []);

  // Compute per-product payment method intersection caps from backend
  // NEW LOGIC: If any product requires UPI, force UPI for entire checkout
  useEffect(() => {
    const fetchCaps = async () => {
      try {
        const ids = [...new Set((selectedItems || []).map(it => it.productId || it.id))].filter(Boolean);
        if (ids.length === 0) {
          setProductPaymentCaps({ cod: false, creditCard: false, upi: false, advance: false, advanceAny: false });
          // No items -> also clear advance config
          setPaymentConfig(prev => ({ ...prev, advanceEnabled: false, advanceAmount: 0 }));
          return;
        }
        const { data } = await axios.post(`${BASE_URL}/api/products/stock/bulk`, { ids }, { timeout: 8000 });
        
        // Start with all methods available, then check for UPI requirement
        let caps = { cod: true, creditCard: true, upi: true, advance: true, advanceAny: false };
        let advanceTotal = 0;
        let hasUPIRequirement = false; // NEW: Flag to track if any product requires UPI
        
        const itemById = {};
        for (const it of (selectedItems || [])) {
          const pid = it.productId || it.id;
          if (pid) itemById[pid] = it;
        }
        
        if (data?.success && Array.isArray(data.stocks) && data.stocks.length > 0) {
          for (const p of data.stocks) {
            const allow_cod = p.allow_cod !== undefined ? !!p.allow_cod : true;
            const allow_card = p.allow_card !== undefined ? !!p.allow_card : true;
            const allow_upi = p.allow_upi !== undefined ? !!p.allow_upi : true;
            const allow_advance = p.allow_advance !== undefined ? !!p.allow_advance : true;
            
            // NEW: Check if this product ONLY allows UPI (requires UPI)
            const productRequiresUPI = !allow_cod && !allow_card && !allow_advance && allow_upi;
            if (productRequiresUPI) {
              hasUPIRequirement = true;
            }
            
            caps = {
              cod: caps.cod && allow_cod,
              creditCard: caps.creditCard && allow_card,
              upi: caps.upi && allow_upi,
              advance: caps.advance && allow_advance,
              advanceAny: caps.advanceAny || allow_advance,
            };

            // Compute per-product advance now based on saved type/value
            if (allow_advance) {
              const it = itemById[p.id];
              const qty = parseInt(it?.quantity, 10) || 0;
              const unitFinal = Number(it?.finalPrice ?? it?.price) || 0;
              const t = (p.advance_payment_type || '').toString().toLowerCase();
              const v = Number(p.advance_payment_value);
              if (qty > 0 && unitFinal > 0 && !Number.isNaN(v) && v > 0) {
                if (t === 'percentage') {
                  advanceTotal += (unitFinal * (v / 100)) * qty;
                } else if (t === 'amount') {
                  advanceTotal += v * qty;
                }
              }
            }
          }
        } else {
          // Fallback: intersect flags from selectedItems if present
          for (const it of (selectedItems || [])) {
            const allow_cod = it.allow_cod ?? it.allowCOD ?? true;
            const allow_card = it.allow_card ?? it.allowCard ?? true;
            const allow_upi = it.allow_upi ?? it.allowUPI ?? true;
            const allow_advance = it.allow_advance ?? it.allowAdvance ?? true;
            
            // NEW: Check if this product ONLY allows UPI (requires UPI)
            const productRequiresUPI = !allow_cod && !allow_card && !allow_advance && allow_upi;
            if (productRequiresUPI) {
              hasUPIRequirement = true;
            }
            
            caps = {
              cod: caps.cod && !!allow_cod,
              creditCard: caps.creditCard && !!allow_card,
              upi: caps.upi && !!allow_upi,
              advance: caps.advance && !!allow_advance,
              advanceAny: caps.advanceAny || !!allow_advance,
            };

            // Optional fallback compute if item carries advance fields
            const qty = parseInt(it?.quantity, 10) || 0;
            const unitFinal = Number(it?.finalPrice ?? it?.price) || 0;
            const t = (it?.advance_payment_type || '').toString().toLowerCase();
            const v = Number(it?.advance_payment_value);
            if (allow_advance && qty > 0 && unitFinal > 0 && !Number.isNaN(v) && v > 0) {
              if (t === 'percentage') {
                advanceTotal += (unitFinal * (v / 100)) * qty;
              } else if (t === 'amount') {
                advanceTotal += v * qty;
              }
            }
          }
        }
        
        // NEW LOGIC: If any product requires UPI, force UPI-only payment
        if (hasUPIRequirement) {
          console.log('[Payment Logic] UPI requirement detected - forcing UPI-only payment for entire checkout');
          caps = {
            cod: false,
            creditCard: false,
            upi: true,
            advance: false,
            advanceAny: false
          };
          // Also disable advance payment when UPI is forced
          advanceTotal = 0;
        }
        
        setProductPaymentCaps(caps);
        // Override advance availability and amount from product-specific configuration
        setPaymentConfig(prev => ({
          ...prev,
          advanceEnabled: (caps.advanceAny || caps.advance) && advanceTotal > 0,
          advanceAmount: Number(advanceTotal.toFixed(2))
        }));
      } catch (e) {
        // On error, do not expose any methods
        setProductPaymentCaps({ cod: false, creditCard: false, upi: false, advance: false, advanceAny: false });
        setPaymentConfig(prev => ({ ...prev, advanceEnabled: false, advanceAmount: 0 }));
      }
    };
    fetchCaps();
  }, [selectedItems]);

  // Keep selected payment method valid based on admin config and product caps
  useEffect(() => {
    const cfg = paymentConfig;
    const caps = productPaymentCaps;
    const candidates = [];
    if (cfg.cod && caps.cod) candidates.push('cod');
    if (cfg.advanceEnabled && Number(cfg.advanceAmount) > 0 && (caps.advanceAny)) candidates.push('advance');
    if (cfg.creditCard && caps.creditCard) candidates.push('credit-card');
    if (cfg.upi && caps.upi) candidates.push('upi');
    if (candidates.length === 0) return; // nothing available
    if (!candidates.includes(formData.paymentMethod)) {
      setFormData(prev => ({ ...prev, paymentMethod: candidates[0] }));
    }
  }, [paymentConfig, productPaymentCaps]);

  // Load admin payment method config (backend first, fallback to localStorage) and listen for changes
  useEffect(() => {
    const loadConfig = async () => {
      let normalized;
      try {
        const { data } = await axios.get(`${BASE_URL}/api/payment-settings`);
        normalized = {
          cod: data?.cod !== undefined ? data.cod : true,
          creditCard: data?.creditCard !== undefined ? data.creditCard : true,
          upi: data?.upi !== undefined ? data.upi : true,
          // Do not pull advance flags here; they are derived from product caps
        };
        localStorage.setItem('paymentMethodsConfig', JSON.stringify(normalized));
      } catch (err) {
        try {
          const raw = localStorage.getItem('paymentMethodsConfig');
          const parsed = raw ? JSON.parse(raw) : { cod: true, creditCard: true, upi: true };
          normalized = {
            cod: parsed.cod !== undefined ? parsed.cod : true,
            creditCard: parsed.creditCard !== undefined ? parsed.creditCard : true,
            upi: parsed.upi !== undefined ? parsed.upi : true,
          };
        } catch {
          normalized = { cod: true, creditCard: true, upi: true };
        }
      }

      // Merge only non-advance settings; keep advance from caps
      setPaymentConfig(prev => ({ ...prev, ...normalized }));
      // ensure selected method is enabled (admin config only; product caps handled in a separate effect)
      const isEnabled = (m) => (m === 'cod' && (normalized.cod ?? true)) || (m === 'credit-card' && (normalized.creditCard ?? true)) || (m === 'upi' && (normalized.upi ?? true)) || (m === 'advance' && (prev => prev));
      if (!isEnabled(formData.paymentMethod)) {
        const next = normalized.cod
          ? 'cod'
          : (/* keep current advance selection if caps enable it; fallback to next enabled */ false)
            ? 'advance'
            : (normalized.creditCard ? 'credit-card' : (normalized.upi ? 'upi' : 'cod'));
        setFormData(prev => ({ ...prev, paymentMethod: next }));
      }
    };

    loadConfig();
    const onUpdate = () => loadConfig();
    window.addEventListener('paymentConfigUpdated', onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('paymentConfigUpdated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSavedAddresses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/addresses/get`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const addresses = Array.isArray(response.data.addresses) ? response.data.addresses : [];
      setSavedAddresses(addresses);
      // If there's a default address, select it
      const defaultAddress = addresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        setFormData(prev => ({
          ...prev,
          fullName: defaultAddress.fullname,
          email: defaultAddress.email,
          phone: defaultAddress.phone,
          additionalPhone: profileAdditionalPhone || '',
          address: defaultAddress.address,
          city: defaultAddress.city,
          state: defaultAddress.state,
          PinCode: defaultAddress.pincode,
          country: defaultAddress.country
        }));
        // Make email non-editable when using saved address
        setIsEmailEditable(false);
        // Attempt shipping lookup for default pincode
        if (/^\d{6}$/.test(String(defaultAddress.pincode || ''))) {
          fetchShippingAmount(String(defaultAddress.pincode));
        }
      }
    } catch (error) {
      console.error('Error fetching saved addresses:', error);
      toast.error('Failed to load saved addresses');
    }
  };

  const handleAddressSelect = (address) => {
    setSelectedAddressId(address.id);
    setFormData(prev => ({
      ...prev,
      fullName: address.fullname,
      email: address.email,
      phone: address.phone,
      additionalPhone: profileAdditionalPhone || '',
      address: address.address,
      city: address.city,
      state: address.state,
      PinCode: address.pincode,
      country: address.country
    }));
    setShowNewAddressForm(false);
    // Make email non-editable when using saved address
    setIsEmailEditable(false);
    if (/^\d{6}$/.test(String(address.pincode || ''))) {
      fetchShippingAmount(String(address.pincode));
    }
  };

  const handleNewAddressClick = () => {
    if (savedAddresses.length >= 2) return;
    setShowNewAddressForm(true);
    setSelectedAddressId(null);
    // Make email editable when creating new address
    setIsEmailEditable(true);
    setFormData(prev => ({
      ...prev,
      fullName: '',
      email: '',
      phone: '',
      additionalPhone: profileAdditionalPhone || '',
      address: '',
      city: '',
      state: '',
      PinCode: '',
      country: ''
    }));

    // Scroll to top to show the new address form
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  };

  // Save address if it's new
  const saveNewAddress = async () => {
    if (!showNewAddressForm || savedAddresses.length >= 2) return;

    try {
      // Ensure authenticated before hitting protected address endpoint
      let token = localStorage.getItem('token');
      if (!token) {
        const ok = await ensureAuthenticatedForGuest();
        if (!ok) {
          // Do not show error or navigate. Allow user to adjust email based on gentle info toast from auth helper.
          return;
        }
        token = localStorage.getItem('token');
      }
      // First, update user's profile email
      await axios.put(
        `${BASE_URL}/api/auth/update-profile`,
        {
          email: formData.email,
          additionalPhone: formData.additionalPhone || null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setProfileAdditionalPhone(formData.additionalPhone || '');
      // Keep local profile cache in sync so UI shows the just-saved value
      setProfileAdditionalPhone(formData.additionalPhone || '');

      // Then create the address
      const response = await axios.post(
        `${BASE_URL}/api/addresses/create`,
        {
          fullname: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pincode: formData.PinCode,
          isDefault: savedAddresses.length === 0 // Make default if it's the first address
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update localStorage user data with new email
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      currentUser.email = formData.email;
      localStorage.setItem('user', JSON.stringify(currentUser));

      await fetchSavedAddresses(); // Refresh the address list
      setShowNewAddressForm(false);
      setSelectedAddressId(response.data.address.id);
      toast.success('Address and profile email saved successfully!');
    } catch (error) {
      console.error('Error saving address:', error);
      toast('Failed to save address. Please try again.');
    }
  };

  const handleEditClick = (address, e) => {
    e.stopPropagation();
    setEditingAddressId(address.id);
    setFormData({
      ...formData,
      fullName: address.fullname,
      email: address.email,
      phone: address.phone,
      additionalPhone: profileAdditionalPhone || '',
      address: address.address,
      city: address.city,
      state: address.state,
      PinCode: address.pincode,
      country: address.country
    });
    setShowNewAddressForm(true);
    setIsEditing(true);
    // Make email editable when editing address
    setIsEmailEditable(true);

    // Scroll to top to show the edit form
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  };

  const handleDeleteAddress = async (addressId, e) => {
    e.stopPropagation();
    const addressToDelete = savedAddresses.find(addr => addr.id === addressId);
    const confirmMessage = `Are you sure you want to delete this address?\n\n${addressToDelete?.fullname}\n${addressToDelete?.address}\n${addressToDelete?.city}, ${addressToDelete?.state}`;

    if (window.confirm(confirmMessage)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${BASE_URL}/api/addresses/${addressId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        toast.success('Address deleted successfully');

        // If the deleted address was selected, clear the selection
        if (selectedAddressId === addressId) {
          setSelectedAddressId(null);
          setFormData(prev => ({
            ...prev,
            fullName: '',
            email: '',
            phone: '',
            additionalPhone: profileAdditionalPhone || '',
            address: '',
            city: '',
            state: '',
            PinCode: '',
            country: ''
          }));
        }

        // Refresh the address list
        await fetchSavedAddresses();

      } catch (error) {
        console.error('Error deleting address:', error);
        if (error.response?.status === 400) {
          toast.error(error.response.data.message || 'Cannot delete this address');
        } else {
          toast.error('Failed to delete address');
        }
      }
    }
  };

  const handleUpdateAddress = async () => {
    try {
      const token = localStorage.getItem('token');

      // First, update user's profile email
      await axios.put(
        `${BASE_URL}/api/auth/update-profile`,
        {
          email: formData.email,
          additionalPhone: formData.additionalPhone || null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Then update the address
      await axios.put(
        `${BASE_URL}/api/addresses/${editingAddressId}`,
        {
          fullname: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pincode: formData.PinCode
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update localStorage user data with new email
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      currentUser.email = formData.email;
      localStorage.setItem('user', JSON.stringify(currentUser));

      toast.success('Address and profile email updated successfully');
      setShowNewAddressForm(false);
      setIsEditing(false);
      setEditingAddressId(null);
      await fetchSavedAddresses();
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Failed to update address');
    }
  };

  const handleCancelAddressForm = () => {
    setShowNewAddressForm(false);
    setIsEditing(false);
    setEditingAddressId(null);

    // Reset form data to selected address or clear it
    if (selectedAddressId) {
      const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId);
      if (selectedAddress) {
        setFormData(prev => ({
          ...prev,
          fullName: selectedAddress.fullname,
          email: selectedAddress.email,
          phone: selectedAddress.phone,
          additionalPhone: profileAdditionalPhone || '',
          address: selectedAddress.address,
          city: selectedAddress.city,
          state: selectedAddress.state,
          PinCode: selectedAddress.pincode,
          country: selectedAddress.country
        }));
        // Make email non-editable when returning to saved address
        setIsEmailEditable(false);
      }
    } else {
      // Clear form data if no address is selected
      setFormData(prev => ({
        ...prev,
        fullName: '',
        email: '',
        phone: '',
        additionalPhone: profileAdditionalPhone || '',
        address: '',
        city: '',
        state: '',
        PinCode: '',
        country: ''
      }));
      // Make email editable when no address is selected
      setIsEmailEditable(true);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let next = value;
    if (name === 'PinCode') {
      next = value.replace(/\D/g, '').slice(0, 6);
      setShippingChecked(false);
      setShippingAmount(0);
      setShippingError('');
      if (/^\d{6}$/.test(next)) {
        fetchShippingAmount(next);
      }
    }

    if (name === 'phone') {
      next = value.replace(/\D/g, '').slice(0, 10);
    }

    // Intercept payment method selection for Advance flow
    if (name === 'paymentMethod') {
      // Combined availability: admin config AND product caps
      const available = (m) => (
        (m === 'cod' && paymentConfig.cod && productPaymentCaps.cod) ||
        (m === 'credit-card' && paymentConfig.creditCard && productPaymentCaps.creditCard) ||
        (m === 'upi' && paymentConfig.upi && productPaymentCaps.upi) ||
        (m === 'advance' && paymentConfig.advanceEnabled && Number(paymentConfig.advanceAmount) > 0 && productPaymentCaps.advanceAny)
      );
      if (!available(next)) {
        toast('This payment method is not available for the selected products.', {
          icon: 'ℹ️',
          style: { background: '#000', color: '#fff' }
        });
        return;
      }
      if (next === 'advance') {
        const enabled = paymentConfig.advanceEnabled && Number(paymentConfig.advanceAmount) > 0 && productPaymentCaps.advanceAny;
        if (!enabled) {
          // Prevent switching to disabled method and inform user with neutral (black) toast
          toast('Advance payment is currently unavailable. Please choose another method.', {
            icon: 'ℹ️',
            style: { background: '#000', color: '#fff' }
          });
          return; // do not update formData.paymentMethod
        }
        setAdvancePaid(false);
        setShowAdvanceUI(true);
      } else {
        // Switching away from advance clears the paid flag
        setAdvancePaid(false);
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: next
    }));
  };

  const fetchShippingAmount = async (pin) => {
    setShippingLoading(true);
    setShippingError('');
    try {
      const { data } = await axios.get(`${BASE_URL}/api/shipping/amount`, { params: { pincode: pin } });
      // If admin configured an amount, use it; if not present/null, treat as free (0)
      const raw = data?.amount;
      const amt = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      setShippingAmount(amt);
      setShippingChecked(true);
      setShippingError('');
    } catch (err) {
      if (err?.response?.status === 404) {
        // No matching pincode configured in backend => treat as free delivery and do NOT show error
        setShippingAmount(0);
        setShippingChecked(true);
        setShippingError('');
      } else {
        setShippingAmount(0);
        setShippingChecked(false);
        setShippingError('Failed to fetch shipping amount');
        toast.error('Failed to fetch shipping amount');
      }
    } finally {
      setShippingLoading(false);
    }
  };

  // Ensure we have an authenticated customer before hitting protected endpoints
  // Guest users can place multiple orders with the same email without password
  const ensureAuthenticatedForGuest = async () => {
    const existingToken = localStorage.getItem('token');
    const existingUser = localStorage.getItem('user');
    if (existingToken && existingUser) return true;

    try {
      // Use new guest authentication endpoint that handles both registration and login
      const guestAuthRes = await axios.post(`${BASE_URL}/api/auth/guest-auth`, {
        email: formData.email,
        firstname: formData.fullName?.split(' ').slice(0, -1).join(' ') || formData.fullName || 'Guest',
        lastname: formData.fullName?.split(' ').slice(-1).join(' ') || ''
      });

      if (guestAuthRes.data?.token && guestAuthRes.data?.user) {
        localStorage.setItem('token', guestAuthRes.data.token);
        localStorage.setItem('user', JSON.stringify({
          id: guestAuthRes.data.user.id,
          email: guestAuthRes.data.user.email,
          role: guestAuthRes.data.user.role || 'customer',
          firstname: guestAuthRes.data.user.firstname || 'Guest',
          lastname: guestAuthRes.data.user.lastname || '',
          is_guest: guestAuthRes.data.user.is_guest || false
        }));
        return true;
      }
    } catch (err) {
      console.error('Guest authentication error:', err);
      
      // Check if this email belongs to a registered (non-guest) user
      if (err.response?.status === 409 && err.response?.data?.isRegisteredUser) {
        toast('An account with this email already exists. Please sign in to continue or use the Forgot Password? option if you need help accessing your account.', {
          icon: 'ℹ️',
          duration: 4000
        });
        
        // Save checkout state to localStorage for redirect after login
        try {
          localStorage.setItem('checkout_redirect', 'true');
          localStorage.setItem('checkout_email', formData.email);
          localStorage.setItem('checkout_data', JSON.stringify({
            selectedItems: selectedItems,
            formData: formData
          }));
        } catch (e) {
          console.error('Failed to save checkout state:', e);
        }
        
        // Navigate to login page after a short delay
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              from: '/customer/checkout',
              email: formData.email,
              message: 'Please login to complete your order'
            } 
          });
        }, 1500);
        
        return false;
      }
      
      // Other errors
      toast.error(err.response?.data?.message || 'Unable to authenticate. Please try again.');
      return false;
    }
    return false;
  };

  const createOrder = async () => {
    try {
      setIsLoading(true);

      // If unauthenticated, create or login a customer using the provided email
      const hasAuth = await ensureAuthenticatedForGuest();
      if (!hasAuth) {
        setIsLoading(false);
        return;
      }

      // If showing new address form, save it first with tax calculations
      // Note: Backend currently calculates totals from order items
      // Tax information is sent for potential future use
      if (showNewAddressForm) {
        await saveNewAddress();
      }

      // Format order items to match API structure
      const items = selectedItems.map(item => ({
        productId: item.productId || item.id, // Use productId first, fallback to id for backward compatibility
        quantity: item.quantity,
        priceAtPurchase: item.price,
        gst: item.gst || 0,
        selectedSize: item.selectedSize || null // Include selected size
      }));

      console.log('Selected items for checkout:', selectedItems);
      console.log('Formatted items for API:', items);

      // Just-in-time fetch live stock for all selected products
      let liveStockMap = {};
      try {
        const ids = [...new Set(selectedItems.map(it => it.productId || it.id))].filter(Boolean);
        if (ids.length > 0) {
          const { data } = await axios.post(`${BASE_URL}/api/products/stock/bulk`, { ids }, { timeout: 8000 });
          if (data?.success && Array.isArray(data.stocks)) {
            for (const s of data.stocks) liveStockMap[s.id] = s;
          }
        }
      } catch (e) { /* proceed with existing values but validations may be stale */ }

      // Validate order quantities before submission (prefer live values when available)
      for (let index = 0; index < selectedItems.length; index++) {
        const item = selectedItems[index];
        const quantity = parseInt(item.quantity, 10);
        const pid = item.productId || item.id;
        const live = liveStockMap[pid] || {};

        // Check minimum order quantity
        const minOrderQuantity = (live.minOrderQuantity !== undefined ? live.minOrderQuantity : (item.minOrderQuantity || item.min_order_quantity || 1));
        if (quantity < minOrderQuantity) {
          toast.error(`Minimum order quantity for "${item.name || item.productName}" is ${minOrderQuantity}. Current quantity: ${quantity}`);
          setIsLoading(false);
          return;
        }

        // Check maximum order quantity
        const maxOrderQuantity = (live.maxOrderQuantity !== undefined ? live.maxOrderQuantity : (item.maxOrderQuantity || item.max_order_quantity));
        if (maxOrderQuantity && quantity > maxOrderQuantity) {
          toast.error(`Maximum order quantity for "${item.name || item.productName}" is ${maxOrderQuantity}. Current quantity: ${quantity}`);
          setIsLoading(false);
          return;
        }

        // Check stock availability
        const stockQuantity = (live.stockQuantity !== undefined ? live.stockQuantity : (item.stockQuantity || item.stock_quantity || 0));
        const isActive = (live.isActive !== undefined ? live.isActive : (item.isActive !== undefined ? item.isActive : (item.is_active !== undefined ? item.is_active : true)));

        if (!isActive || stockQuantity === 0) {
          toast.error(`"${item.name || item.productName}" is currently out of stock`);
          setIsLoading(false);
          return;
        }

        if (quantity > stockQuantity) {
          toast(`Only ${stockQuantity} units of "${item.name || item.productName}" are available in stock. Current quantity: ${quantity}`, {
            icon: 'ℹ️',
            style: { background: '#000', color: '#fff' }, // black background, white text
            duration: 4000, // optional
            position: 'top-right' // optional
          });
          setIsLoading(false);
          return;
        }

        console.log(`Checkout validation passed for ${item.name || item.productName}: quantity=${quantity}, min=${minOrderQuantity}, max=${maxOrderQuantity || 'unlimited'}, stock=${stockQuantity}`);
      }

      // Debug: Check for any items with invalid product IDs
      items.forEach((item, index) => {
        const originalItem = selectedItems[index];
        console.log(`Item ${index}: productId=${item.productId}, selectedSize=${item.selectedSize}, quantity=${item.quantity}`);
        console.log(`  Original item - id: ${originalItem.id}, productId: ${originalItem.productId}, cartItemId: ${originalItem.cartItemId}`);

        if (!item.productId || item.productId === null || item.productId === undefined) {
          console.error(`Invalid productId for item ${index}:`, originalItem);
        }

        // Validate that we're using the correct product ID (not cart item ID)
        if (item.productId === originalItem.id && originalItem.productId && originalItem.productId !== originalItem.id) {
          console.warn(`Warning: Using cart item ID (${originalItem.id}) instead of product ID (${originalItem.productId}) for item ${index}`);
        }
      });

      // Prepare payload for API with pre-calculated GST totals
      const grandTotalWithShipping = totalAmount + shippingAmount;
      const configuredAdvance = Number(paymentConfig.advanceAmount || 0);
      const isAdvance = formData.paymentMethod === 'advance' && paymentConfig.advanceEnabled && configuredAdvance > 0;
      const effectiveAdvance = isAdvance ? Math.min(configuredAdvance, grandTotalWithShipping) : 0;
      const balanceDueAtCOD = isAdvance ? Math.max(0, grandTotalWithShipping - effectiveAdvance) : 0;

      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        addressStreet: formData.address,
        city: formData.city,
        state: formData.state,
        PinCode: formData.PinCode,
        country: formData.country,
        paymentMode: formData.paymentMethod === 'credit-card' ? 'CARD' :
          formData.paymentMethod === 'upi' ? 'UPI' :
            formData.paymentMethod === 'advance' ? 'ADVANCE_UPI_BALANCE_COD' : 'COD',
        items,
        // Pre-calculated GST totals from backend
        subtotal: subtotalAmount,
        taxAmount: taxAmount,
        totalAmount: totalAmount, // This includes product price + GST
        shippingAmount: shippingAmount,
        grandTotal: grandTotalWithShipping,
        // Advance payment fields (for advance flow)
        ...(isAdvance ? {
          advanceRequiredAmount: effectiveAdvance,
          advancePaidAmount: effectiveAdvance,
          balanceDueAmount: balanceDueAtCOD,
        } : {})
      };

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BASE_URL}/api/orders/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        const createdOrderId = response.data.orderId;
        const grandTotalWithShipping = totalAmount + shippingAmount;
        const configuredAdvance = Number(paymentConfig.advanceAmount || 0);
        const isAdvance = formData.paymentMethod === 'advance' && paymentConfig.advanceEnabled && configuredAdvance > 0;
        const effectiveAdvance = isAdvance ? Math.min(configuredAdvance, grandTotalWithShipping) : 0;

        // Route based on selected payment method
        if (formData.paymentMethod === 'credit-card') {
          // Use PhonePe Pay Page; card option is available on checkout
          // Persist exactly which items were ordered so OrderSuccess can remove only those
          persistOrderedItemsForCleanup(selectedItems);
          try { localStorage.setItem('pending_order_id', String(createdOrderId)); } catch { }
          await initiatePhonePe({ orderId: createdOrderId, amount: grandTotalWithShipping, paymentMode: 'CARD' });
          return; // Browser redirected
        }
        if (formData.paymentMethod === 'upi') {
          persistOrderedItemsForCleanup(selectedItems);
          try { localStorage.setItem('pending_order_id', String(createdOrderId)); } catch { }
          await initiatePhonePe({ orderId: createdOrderId, amount: grandTotalWithShipping, paymentMode: 'UPI' });
          return;
        }
        if (formData.paymentMethod === 'advance') {
          // Initiate advance flow using backend-configured amount
          persistOrderedItemsForCleanup(selectedItems);
          try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post(
              `${BASE_URL}/api/payments/phonepe/initiate-advance`,
              { orderId: createdOrderId },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data?.redirectUrl) {
              try { localStorage.setItem('pending_order_id', String(createdOrderId)); } catch { }
              if (data.merchantTransactionId) {
                try { localStorage.setItem('phonepe_mtid', data.merchantTransactionId); } catch { }
              }
              window.location.href = data.redirectUrl;
              return; // Browser redirected
            }
            toast.error('Failed to start advance payment');
          } catch (err) {
            console.error('[initiateAdvance] Error:', err);
            const msg = err?.response?.data?.message || err?.message || 'Advance payment initiation failed';
            const code = err?.response?.data?.code;
            if (code) {
              toast.error(`${msg} (${code})`);
            } else {
              toast.error(msg);
            }
          }
          return;
        }

        // COD or any other non-redirect flow
        toast.success('Order placed successfully!');
        try {
          await removeSpecificItemsFromCart(selectedItems);
        } catch (error) {
          console.error('Failed to remove ordered items from cart:', error);
        }
        navigate('/customer/order-success', { state: { orderId: createdOrderId } });
      }
    } catch (error) {
      console.error('Order creation error:', error);
      console.error('Order creation error status:', error.response?.status);
      console.error('Order creation error data:', error.response?.data);

      // Check if the error is due to missing products
      if (error.response?.status === 404 && error.response?.data?.message?.includes('no longer available')) {
        toast.error('Some products in your cart are no longer available. Refreshing your cart...');

        // Refresh the page to reload the cart without invalid items
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(error.response?.data?.message || 'Failed to place order. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validateAddressForm = () => {
    const requiredFields = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'PinCode', 'country'];
    const missingFields = requiredFields.filter(field => !formData[field]?.trim());

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Phone validation (basic)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Handle address operations in step 1
    if (step === 1) {
      if (isEditing) {
        // Validate form before updating
        if (!validateAddressForm()) return;
        // Update existing address
        await handleUpdateAddress();
        return; // Don't proceed to next step, stay on address form
      } else if (showNewAddressForm) {
        // Validate form before saving
        if (!validateAddressForm()) return;
        // Save new address
        await saveNewAddress();
        return; // Don't proceed to next step, stay on address form
      } else {
        // Proceed to next step if address is selected
        if (!selectedAddressId && !showNewAddressForm) {
          toast.error('Please select an address or add a new one');
          return;
        }
        // Validate pincode + shipping before moving to payment
        const pin = String(formData.PinCode || '').trim();
        if (!/^\d{6}$/.test(pin)) {
          toast.error('Please enter a valid 6-digit pincode');
          return;
        }
        if (!shippingChecked) {
          toast.error('Please verify shipping for your pincode');
          return;
        }
        if (shippingError) {
          toast.error('Shipping not available for this pincode');
          return;
        }
        setStep(step + 1);
      }
    } else if (step === 2) {
      // Intercept to complete Advance (UPI) before proceeding
      if (
        formData.paymentMethod === 'advance' &&
        paymentConfig.advanceEnabled &&
        Number(paymentConfig.advanceAmount) > 0 &&
        !advancePaid
      ) {
        setShowAdvanceUI(true);
        return;
      }
      setStep(3);
    } else {
      await createOrder();
    }
  };

  const goBack = (e) => {
    e.preventDefault();
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/customer/cart');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Checkout Header */}
            <div className="mb-8 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                Checkout
              </h1>
              <div className="w-32 h-1.5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full mb-6 mx-auto md:mx-0 relative right-28"></div>
              <p className="text-white max-w-2xl mx-auto md:mx-0">Complete your purchase securely</p>
            </div>

            {/* Steps */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center relative w-full">
                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${step >= 1 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
                    <MapPin size={20} />
                  </div>
                  <span className="text-sm mt-2 font-medium text-gray-400">Shipping</span>
                </div>
                <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-500 ${step > 1 ? 'bg-yellow-500' : 'bg-gray-700'}`}></div>

                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${step >= 2 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
                    <CreditCard size={20} />
                  </div>
                  <span className="text-sm mt-2 font-medium text-gray-400">Payment</span>
                </div>
                <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-500 ${step > 2 ? 'bg-yellow-500' : 'bg-gray-700'}`}></div>

                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${step >= 3 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
                    <CheckCircle size={20} />
                  </div>
                  <span className="text-sm mt-2 font-medium text-gray-400">Review</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-black rounded-2xl shadow-lg border border-gray-700 p-6">
                <form onSubmit={handleSubmit}>
                  {step === 1 && (
                    <div className="space-y-5">
                      <h2 className="text-xl font-semibold mb-6 flex items-center">
                        <MapPin className="mr-2 h-5 w-5 text-yellow-500" />
                        <span>Shipping Information</span>
                      </h2>

                      <div className="bg-black rounded-xl p-6 border border-gray-800">
                        <h3 className="text-lg font-semibold mb-4 text-white">Your Addresses</h3>
                        <div className="space-y-3">
                          {savedAddresses.map((address) => (
                            <div
                              key={address.id}
                              className={`relative flex items-start p-4 rounded-lg border transition-all duration-200 ${editingAddressId === address.id
                                ? 'border-orange-400 bg-orange-50'
                                : selectedAddressId === address.id
                                  ? 'border-yellow-500 bg-yellow-900/50'
                                  : 'border-gray-700 bg-black hover:border-yellow-500'
                                } cursor-pointer`}
                              onClick={() => !isEditing && handleAddressSelect(address)}
                            >
                              <div className="flex items-center h-5 mt-1">
                                <input
                                  type="radio"
                                  checked={selectedAddressId === address.id}
                                  onChange={() => handleAddressSelect(address)}
                                  className="h-4 w-4 text-yellow-500 border-gray-600 focus:ring-yellow-600 bg-gray-700"
                                />
                              </div>
                              <div className="ml-3 flex-grow">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="block text-sm font-medium text-white">
                                      {address.fullname}
                                    </span>
                                    {address.isDefault && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300 ml-2">
                                        Default
                                      </span>
                                    )}
                                    {editingAddressId === address.id && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ml-2">
                                        Editing
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      type="button"
                                      onClick={(e) => handleEditClick(address, e)}
                                      className="text-gray-500 hover:text-yellow-500 focus:outline-none"
                                      title="Edit address"
                                    >
                                      <span className="sr-only">Edit</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteAddress(address.id, e)}
                                      className="text-gray-400 hover:text-red-500 focus:outline-none"
                                      title="Delete address"
                                    >
                                      <span className="sr-only">Delete</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-400 mt-1">{address.address}</p>
                                <p className="text-sm text-gray-400">{address.city}, {address.state} {address.pincode}</p>
                                <p className="text-sm text-gray-400">{address.country}</p>
                                <p className="text-sm text-gray-400 mt-1">Phone: {address.phone}</p>
                              </div>
                            </div>
                          ))}

                          {/* Add New Address Button */}
                          <button
                            type="button"
                            onClick={handleNewAddressClick}
                            className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-600 rounded-lg text-sm font-medium text-yellow-500 hover:border-yellow-500 hover:bg-gray-700 transition-all duration-200"
                            disabled={savedAddresses.length >= 2}
                          >
                            <Plus className="w-5 h-5 mr-2" />
                            Add New Address
                          </button>
                          {savedAddresses.length >= 2 && (
                            <p className="text-red-500 text-xs mt-2 text-center">You can only add up to 2 addresses.</p>
                          )}
                        </div>
                      </div>

                      {formData.paymentMethod === 'advance' && (
                        <div className="mt-4 bg-black rounded-lg border border-gray-700 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium">Advance to Pay Now (via UPI)</p>
                            <p className="text-yellow-400 font-bold">{formatCurrency(Number(paymentConfig.advanceAmount || 0))}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2 text-sm">
                            <p className="text-gray-300">Balance on Delivery (COD)</p>
                            <p className="text-gray-200 font-medium">{formatCurrency(Math.max(0, (totalAmount + (shippingChecked ? shippingAmount : 0)) - Math.min(Number(paymentConfig.advanceAmount || 0), totalAmount + (shippingChecked ? shippingAmount : 0))))}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            Pay the advance now via UPI. The remaining balance will be collected as Cash on Delivery.
                          </p>
                        </div>
                      )}

                      {/* New Address Form */}
                      {showNewAddressForm && (
                        <div className="mt-6 bg-gray-900 rounded-xl p-6 border border-gray-700">
                          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Address' : 'Add New Address'}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                              <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                                placeholder="John Doe"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Profile-Email
                                {!isEmailEditable && (
                                  <span className="ml-2 text-xs text-yellow-400">(From saved address)</span>
                                )}
                              </label>
                              {isEmailEditable ? (
                                <input
                                  type="email"
                                  name="email"
                                  value={formData.email}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                                  placeholder="john@example.com"
                                  required
                                />
                              ) : (
                                <div className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white opacity-75 pointer-events-none select-none">
                                  {formData.email || 'john@example.com'}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                              inputMode="numeric"
                              maxLength={10}
                              placeholder="+91 98765 43210"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Additional Phone (Optional)</label>
                            <input
                              type="tel"
                              name="additionalPhone"
                              value={formData.additionalPhone}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                              placeholder="Alternate contact number"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Address</label>
                            <input
                              type="text"
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                              placeholder="123 Main St, Apt 4B"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">City</label>
                              <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">State</label>
                              <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">Country</label>
                              <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">Pin Code</label>
                              <input
                                type="text"
                                name="PinCode"
                                value={formData.PinCode}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                                required
                              />
                              <div className="mt-1 text-xs">
                                {shippingLoading && (
                                  <span className="text-gray-400">Checking shipping for this pincode...</span>
                                )}
                                {!shippingLoading && shippingError && (
                                  <span className="text-red-400">{shippingError}</span>
                                )}
                                {!shippingLoading && !shippingError && shippingChecked && (
                                  <span className="text-green-400">Shipping: ₹{shippingAmount.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <h2 className="text-xl font-semibold mb-6 flex items-center">
                        <CreditCard className="mr-2 h-5 w-5 text-yellow-500" />
                        <span>Payment Method</span>
                      </h2>

                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Payment Method</label>
                        
                        {/* NEW: Show message when UPI is forced due to product requirements */}
                        {paymentConfig.upi && productPaymentCaps.upi && 
                         !paymentConfig.cod && !productPaymentCaps.cod && 
                         !paymentConfig.creditCard && !productPaymentCaps.creditCard && 
                         !(paymentConfig.advanceEnabled && Number(paymentConfig.advanceAmount) > 0 && productPaymentCaps.advanceAny) && (
                          <div className="mb-4 p-3 bg-blue-900 border border-blue-700 rounded-lg">
                            <div className="flex items-start">
                              <Info className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                              <div className="text-sm">
                                <p className="text-blue-200 font-medium">UPI Only Payment Required</p>
                                <p className="text-blue-300 mt-1">One or more products in your cart only support UPI payment. Therefore, UPI is the only available payment method for this entire order.</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-col space-y-3">
                          {paymentConfig.cod && productPaymentCaps.cod && (
                            <label className="inline-flex items-center p-4 border border-gray-600 rounded-lg cursor-pointer hover:border-yellow-500 hover:bg-gray-700 transition-all duration-200 group">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="cod"
                                checked={formData.paymentMethod === 'cod'}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-yellow-500 bg-gray-700 border-gray-600 focus:ring-yellow-600"
                              />
                              <span className="ml-4 text-white font-medium">Cash on Delivery (COD)</span>
                            </label>
                          )}
                          {paymentConfig.creditCard && productPaymentCaps.creditCard && (
                            <label className="flex items-center p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors duration-200">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="credit-card"
                                checked={formData.paymentMethod === 'credit-card'}
                                onChange={handleInputChange}
                                className="form-radio h-5 w-5 text-yellow-500 bg-gray-900 border-gray-600 focus:ring-yellow-500"
                              />
                              <span className="ml-4 text-white font-medium">Credit/Debit Card</span>
                            </label>
                          )}
                          {paymentConfig.upi && productPaymentCaps.upi && (
                            <label className="flex items-center p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors duration-200">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="upi"
                                checked={formData.paymentMethod === 'upi'}
                                onChange={handleInputChange}
                                className="form-radio h-5 w-5 text-yellow-500 bg-gray-900 border-gray-600 focus:ring-yellow-500"
                              />
                              <span className="ml-4 text-white font-medium">UPI (Pay Online)</span>
                            </label>
                          )}
                          {(paymentConfig.advanceEnabled && Number(paymentConfig.advanceAmount) > 0 && productPaymentCaps.advanceAny) && (
                            <label className="flex items-center p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors duration-200">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="advance"
                                checked={formData.paymentMethod === 'advance'}
                                onChange={handleInputChange}
                                className="form-radio h-5 w-5 text-yellow-500 bg-gray-900 border-gray-600 focus:ring-yellow-500"
                              />
                              <span className="ml-4 text-white font-medium">Advance(UPI) + Balance COD</span>
                            </label>
                          )}
                        </div>
                      </div>

                      {formData.paymentMethod === 'credit-card' && (
                        <div className="mt-5 space-y-4 bg-black p-5 rounded-lg border border-gray-800">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Card Number</label>
                            <input
                              type="text"
                              name="cardNumber"
                              value={formData.cardNumber}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                              placeholder="**** **** **** ****"
                              maxLength="16"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Name on Card</label>
                            <input
                              type="text"
                              name="cardName"
                              value={formData.cardName}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                              placeholder="John Doe"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-5">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">Expiry Date</label>
                              <input
                                type="text"
                                name="expiryDate"
                                value={formData.expiryDate}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                                placeholder="MM/YY"
                                maxLength="5"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">CVV</label>
                              <input
                                type="password"
                                name="cvv"
                                value={formData.cvv}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-white"
                                placeholder="***"
                                maxLength="3"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-6 flex items-center">
                        <CheckCircle className="mr-2 h-5 w-5 text-yellow-500" />
                        <span>Review and Confirm</span>
                      </h2>

                      <div className="space-y-5">
                        <div className="bg-black-900 p-5 rounded-lg shadow-sm border border-gray-700">
                          <h3 className="font-medium mb-3 text-yellow-500 flex items-center">
                            <MapPin size={16} className="mr-1.5" />
                            Shipping Information
                          </h3>
                          <p className="text-gray-300">{formData.fullName}</p>
                          <p className="text-gray-300">{formData.email}</p>
                          <p className="text-gray-300">{formData.phone}</p>
                          {formData.additionalPhone && (
                            <p className="text-gray-300">{formData.additionalPhone}</p>
                          )}
                          <p className="text-gray-300">{formData.address}, {formData.city}, {formData.state} {formData.PinCode}</p>
                          <p className="text-gray-300">{formData.country}</p>
                        </div>

                        <div className="bg-black-900 p-5 rounded-lg shadow-sm border border-gray-700">
                          <h3 className="font-medium mb-3 text-yellow-500 flex items-center">
                            <CreditCard size={16} className="mr-1.5" />
                            Payment Method
                          </h3>
                          <p className="text-gray-300">
                            {formData.paymentMethod === 'cod' && 'Cash on Delivery'}
                            {formData.paymentMethod === 'credit-card' && 'Credit Card'}
                            {formData.paymentMethod === 'upi' && 'UPI/Net Banking'}
                            {formData.paymentMethod === 'advance' && `Advance ${formatCurrency(Number(paymentConfig.advanceAmount || 0))} (UPI) + Balance COD`}
                          </p>

                          {formData.paymentMethod === 'credit-card' && (
                            <p className="text-gray-300 mt-1">
                              {formData.cardNumber.replace(/\d{4}(?=.)/g, '****')} | {formData.cardName} | {formData.expiryDate}
                            </p>
                          )}
                        </div>

                        <div className="bg-black-900 p-5 rounded-lg shadow-sm border border-gray-700">
                          <h3 className="font-medium mb-3 text-yellow-500 flex items-center">
                            <ShoppingBag size={16} className="mr-1.5" />
                            Order Items
                          </h3>
                          <div className="space-y-3">
                            {selectedItems.map((item, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0"
                              >
                                <div className="flex items-center">
                                  <div
                                    className="w-12 h-12 rounded-md bg-cover bg-center mr-3"
                                    style={{ backgroundImage: `url(${getItemImage(item)})` }}
                                  ></div>
                                  <div>
                                    <p className="font-medium text-white">{item.name}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                                      <span className="bg-gray-700/50 px-1.5 py-0.5 rounded">Qty: {item.quantity}</span>
                                      {item.selectedSize && (
                                        <span className="bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded-full">
                                          {item.selectedSize}
                                        </span>
                                      )}
                                      {item.gst > 0 && (
                                        <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full" title={`GST ${item.gst}% ${item.gst_type === 'inclusive' ? 'Incl.' : 'Excl.'}`}>
                                          GST: {item.gst}%
                                        </span>
                                      )}
                                      {item.priceBeforeGST > 0 && (
                                        <span className="text-green-400" title="Price before GST">
                                          ₹{(item.priceBeforeGST * item.quantity).toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {(parseFloat(item.mrp) > parseFloat(item.price)) && (
                                    <p className="text-sm text-gray-500 line-through">
                                      ₹{((parseFloat(item.mrp) || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}
                                    </p>
                                  )}
                                  <p className="font-medium text-yellow-500">
                                    ₹{((parseFloat(item.price) || 0) * (1 + (parseFloat(item.gst) || 0) / 100) * (parseInt(item.quantity) || 1)).toFixed(2)}
                                  </p>
                                  {(parseFloat(item.mrp) > parseFloat(item.price)) && (
                                    <p className="text-xs text-green-600 font-medium">
                                      You save ₹{(((parseFloat(item.mrp) || 0) * (1 + (parseFloat(item.gst) || 0) / 100) - (parseFloat(item.price) || 0) * (1 + (parseFloat(item.gst) || 0) / 100)) * (parseInt(item.quantity) || 1)).toFixed(2)}
                                    </p>
                                  )}
                                </div>
                                {/* <p className="text-lg font-bold text-yellow-500">
                          {formatCurrency(totalAmount)}
                        </p> */}
                              </div>
                            ))}
                            <div className="text-right text-sm text-gray-300">
                              <div>Products Total: {formatCurrency(totalAmount)}</div>
                              <div>Shipping: {shippingChecked ? formatCurrency(shippingAmount) : '—'}</div>
                              {paymentConfig.advanceEnabled && formData.paymentMethod === 'advance' && Number(paymentConfig.advanceAmount) > 0 && (
                                <>
                                  <div>Advance Paid: {formatCurrency(Math.min(Number(paymentConfig.advanceAmount || 0), totalAmount + (shippingChecked ? shippingAmount : 0)))}</div>
                                  <div>Balance COD: {formatCurrency(Math.max(0, (totalAmount + (shippingChecked ? shippingAmount : 0)) - Math.min(Number(paymentConfig.advanceAmount || 0), totalAmount + (shippingChecked ? shippingAmount : 0))))}</div>
                                </>
                              )}
                              <div className="text-lg font-bold text-white mt-1">Grand Total: {formatCurrency(totalAmount + (shippingChecked ? shippingAmount : 0))}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="inline-flex items-center bg-black p-3 rounded-lg w-full border border-gray-800">
                          <input type="checkbox" className="h-4 w-4 text-yellow-500 bg-black border-gray-600 rounded" required />
                          <span className="ml-2 text-white text-sm">I agree to the terms and conditions</span>

                        </label>

                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-6">
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center px-4 py-2 border border-gray-600 shadow-sm text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </button>

                    <div className="flex space-x-3">
                      {(isEditing || showNewAddressForm) && (
                        <button
                          type="button"
                          onClick={handleCancelAddressForm}
                          className="inline-flex items-center px-4 py-2 border border-gray-600 shadow-sm text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-black bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            {isEditing ? 'Update Address' : showNewAddressForm ? 'Save Address' : 'Continue to Payment'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Advance Payment Modal */}
                {showAdvanceUI && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    <div className="bg-gray-900 border border-yellow-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="h-6 w-6 text-yellow-400" />
                        <h3 className="text-xl font-semibold text-white">
                          Advance (UPI) + Balance COD
                        </h3>
                      </div>

                      {/* Info */}
                      <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                        Pay a small advance now via UPI to confirm your order.
                        The remaining balance will be collected as <span className="text-yellow-400 font-medium">Cash on Delivery</span>.
                      </p>

                      {/* Advance amount box */}
                      <div className="bg-gray-800 border border-gray-600 rounded-xl p-5 mb-6">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Advance Amount</span>
                          <span className="text-2xl font-bold text-yellow-400">
                            {(() => {
                              const grand = totalAmount + (shippingChecked ? shippingAmount : 0);
                              const adv = Math.min(Number(paymentConfig.advanceAmount || 0), grand);
                              return formatCurrency(adv);
                            })()}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Remaining balance will be calculated automatically.
                        </p>
                      </div>

                      {/* Instructions */}
                      <div className="bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-300 rounded-lg p-3 mb-6">
                        Pay via your preferred UPI app using the store’s instructions,
                        then press <span className="font-semibold">“I have paid”</span>.
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition"
                          onClick={() => setShowAdvanceUI(false)}
                          disabled={advanceProcessing}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-5 py-2 rounded-lg bg-yellow-500 text-black font-semibold shadow hover:bg-yellow-400 transition disabled:opacity-60"
                          onClick={async () => {
                            setAdvanceProcessing(true);
                            setTimeout(() => {
                              setAdvancePaid(true);
                              setShowAdvanceUI(false);
                              setAdvanceProcessing(false);
                              setStep(3);
                              toast.success('Advance payment recorded');
                            }, 400);
                          }}
                          disabled={advanceProcessing}
                        >
                          {advanceProcessing ? 'Processing…' : 'I have paid'}
                        </button>
                      </div>
                    </div>
                  </div>

                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-black-800 rounded-2xl border border-white shadow-lg p-6 sticky top-4 mb-2">
                <div className="border-b border-white p-5">
                  <h2 className="text-lg font-bold text-white flex items-center justify-between">
                    <div className="flex items-center">
                      <Tag className="h-5 w-5 mr-2 text-yellow-500" />
                      Order Summary
                    </div>
                    <span className="text-sm font-medium text-yellow-300 bg-yellow-900/50 px-2 py-1 rounded-full">
                      {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
                    </span>
                  </h2>
                </div>
                <div className="p-5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-gray-300">Subtotal ({selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''})</p>
                        <p className="font-medium">
                          ₹{selectedItems.reduce((sum, item) => sum + (item.priceBeforeGST || 0) * (item.quantity || 1), 0).toFixed(2)}
                        </p>
                      </div>

                      {/* GST Breakdown */}
                      {selectedItems.some(item => item.gst > 0) && (
                        <div className="pl-4 border-l-2 border-yellow-500/20">
                          <div className="text-xs text-gray-500 mb-1">GST Breakdown:</div>
                          {Array.from(new Set(selectedItems.map(item => item.gst).filter(gst => gst > 0))).map(gstRate => {
                            const gstItems = selectedItems.filter(item => item.gst === gstRate);
                            const gstAmount = gstItems.reduce((sum, item) => {
                              const itemTotal = (item.priceBeforeGST || 0) * (item.quantity || 1);
                              return sum + (itemTotal * gstRate / 100);
                            }, 0);

                            return (
                              <div key={`gst-${gstRate}`} className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>GST @ {gstRate}% on {gstItems.reduce((sum, item) => sum + (item.quantity || 1), 0)} item(s)</span>
                                <span>₹{gstAmount.toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {selectedItems.some(item => item.discount > 0) && (
                        <div className="flex justify-between text-sm text-green-500">
                          <span>Discount</span>
                          <span>-₹{selectedItems.reduce((sum, item) => sum + (item.discount || 0) * (item.quantity || 1), 0).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="pt-4 border-t border-gray-700 space-y-2">
                        <div className="flex justify-between text-sm">
                          <p className="text-gray-300">Products Total</p>
                          <p className="text-gray-300">₹{totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="flex justify-between text-sm">
                          <p className="text-gray-300">Shipping</p>
                          <p className="text-gray-300">{shippingChecked ? `₹${shippingAmount.toFixed(2)}` : '—'}</p>
                        </div>
                        {paymentConfig.advanceEnabled && formData.paymentMethod === 'advance' && Number(paymentConfig.advanceAmount) > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <p className="text-gray-300">Advance Paid</p>
                              <p className="text-gray-300">₹{(Math.min(Number(paymentConfig.advanceAmount || 0), totalAmount + (shippingChecked ? shippingAmount : 0))).toFixed(2)}</p>
                            </div>
                            <div className="flex justify-between text-sm">
                              <p className="text-gray-300">Balance COD</p>
                              <p className="text-gray-300">₹{(Math.max(0, (totalAmount + (shippingChecked ? shippingAmount : 0)) - Math.min(Number(paymentConfig.advanceAmount || 0), totalAmount + (shippingChecked ? shippingAmount : 0)))).toFixed(2)}</p>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <p className="text-lg font-bold text-white">Grand Total</p>
                          <p className="text-lg font-bold text-white">₹{(totalAmount + (shippingChecked ? shippingAmount : 0)).toFixed(2)}</p>
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          (Inclusive of all taxes)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
