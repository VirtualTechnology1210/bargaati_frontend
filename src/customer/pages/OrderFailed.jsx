import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { XCircle, Home, RefreshCw, ShoppingBag } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../util';

const OrderFailed = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const cancelPending = async () => {
      try {
        const raw = localStorage.getItem('pending_order_id');
        if (!raw) return;
        const pendingOrderId = parseInt(raw, 10);
        if (!Number.isFinite(pendingOrderId)) return;
        const token = localStorage.getItem('token');
        await axios.post(
          `${BASE_URL}/api/payments/cancel-pending`,
          { orderId: pendingOrderId },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
      } catch (e) {
        // non-blocking cleanup
        console.warn('[OrderFailed] cancel-pending error', e?.response?.data || e.message);
      } finally {
        try { localStorage.removeItem('pending_order_id'); } catch {}
      }
    };
    cancelPending();
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-black p-8 rounded-2xl shadow-lg max-w-2xl w-full text-center border border-red-600/40">
        <div className="mb-6 text-red-400">
          <div className="bg-red-900/40 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-16 w-16" />
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-2 text-white">Payment Failed</h2>
        <p className="text-gray-400 mb-6">Your payment could not be completed. You can try again or choose a different payment method.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <Link to="/customer/home" className="flex items-center justify-center gap-2 bg-black text-white border border-gray-600 rounded-lg py-3 hover:border-gray-500">
            <Home size={18} /> Home
          </Link>
          <Link to="/customer/shop" className="flex items-center justify-center gap-2 bg-yellow-500 text-black rounded-lg py-3 hover:bg-yellow-600">
            <ShoppingBag size={18} /> Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderFailed;
