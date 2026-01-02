import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../util';
import toast from 'react-hot-toast';

const ViewShippingAmount = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ pincode: '', amount: '', is_active: true });

  const tokenHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/shipping/pincodes`);
      setRows(data || []);
    } catch (err) {
      toast.error('Failed to load shipping pincodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditValues({ pincode: row.pincode, amount: String(row.amount), is_active: row.is_active });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ pincode: '', amount: '', is_active: true });
  };

  const saveEdit = async (id) => {
    // validations
    if (!/^\d{6}$/.test(String(editValues.pincode).trim())) {
      toast.error('Pincode must be exactly 6 digits');
      return;
    }
    if (editValues.amount === '' || isNaN(Number(editValues.amount)) || Number(editValues.amount) < 0) {
      toast.error('Amount must be a non-negative number');
      return;
    }
    try {
      await axios.put(
        `${BASE_URL}/api/shipping/${id}`,
        { pincode: String(editValues.pincode).trim(), amount: Number(editValues.amount), is_active: !!editValues.is_active },
        tokenHeader()
      );
      toast.success('Updated');
      cancelEdit();
      fetchRows();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Update failed';
      toast.error(msg);
    }
  };

  const removeRow = async (id) => {
    if (!window.confirm('Delete this pincode entry?')) return;
    try {
      await axios.delete(`${BASE_URL}/api/shipping/${id}`, tokenHeader());
      toast.success('Deleted');
      fetchRows();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Shipping Amounts by Pincode</h1>
        <button
          onClick={fetchRows}
          className="px-3 py-2 bg-gray-100 rounded-md border hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left border">Pincode</th>
                <th className="px-4 py-2 text-left border">Amount (₹)</th>
                <th className="px-4 py-2 text-left border">Active</th>
                <th className="px-4 py-2 text-left border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="px-4 py-2 border">
                    {editingId === row.id ? (
                      <input
                        value={editValues.pincode}
                        onChange={(e) => setEditValues(v => ({ ...v, pincode: e.target.value.replace(/\D/g, '') }))}
                        maxLength={6}
                        className="border rounded px-2 py-1"
                      />
                    ) : (
                      row.pincode
                    )}
                  </td>
                  <td className="px-4 py-2 border">
                    {editingId === row.id ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editValues.amount}
                        onChange={(e) => setEditValues(v => ({ ...v, amount: e.target.value }))}
                        className="border rounded px-2 py-1"
                      />
                    ) : (
                      row.amount
                    )}
                  </td>
                  <td className="px-4 py-2 border">
                    {editingId === row.id ? (
                      <input
                        type="checkbox"
                        checked={!!editValues.is_active}
                        onChange={(e) => setEditValues(v => ({ ...v, is_active: e.target.checked }))}
                      />
                    ) : (
                      row.is_active ? 'Yes' : 'No'
                    )}
                  </td>
                  <td className="px-4 py-2 border space-x-2">
                    {editingId === row.id ? (
                      <>
                        <button onClick={() => saveEdit(row.id)} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                        <button onClick={cancelEdit} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(row)} className="px-3 py-1 bg-yellow-500 text-white rounded">Edit</button>
                        <button onClick={() => removeRow(row.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>No entries found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ViewShippingAmount;
