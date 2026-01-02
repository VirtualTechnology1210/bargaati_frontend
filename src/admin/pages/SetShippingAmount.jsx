import React, { useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../util';
import toast from 'react-hot-toast';

const SetShippingAmount = () => {
  const [pincode, setPincode] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!/^\d{6}$/.test(pincode.trim())) {
      toast.error('Pincode must be exactly 6 digits');
      return false;
    }
    if (amount === '' || isNaN(Number(amount)) || Number(amount) < 0) {
      toast.error('Amount must be a non-negative number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/shipping`, { pincode: pincode.trim(), amount: Number(amount) },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      toast.success('Shipping amount added');
      setPincode('');
      setAmount('');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to add shipping amount';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Add Shipping Amount by Pincode</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Pincode</label>
          <input
            type="text"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
            className="w-full border rounded-md px-3 py-2"
            placeholder="e.g. 560001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="e.g. 49"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
};

export default SetShippingAmount;
