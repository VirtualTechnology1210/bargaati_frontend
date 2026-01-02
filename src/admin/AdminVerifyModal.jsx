import React, { useState } from 'react';

/**
 * AdminVerifyModal
 * Props:
 * - show: Boolean (show/hide modal)
 * - onCancel: Function
 * - onVerify: Function (called with password on successful verification)
 * - verifying: Boolean (loading state)
 * - error: String (error message)
 */
const AdminVerifyModal = ({ show, onCancel, onVerify, verifying, error }) => {
  const [password, setPassword] = useState("");

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    onVerify(password);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md border border-gray-100">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Admin Verification Required</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="adminPassword">
              Password
            </label>
            <input
              id="adminPassword"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="shadow-sm appearance-none border border-gray-200 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              autoFocus
            />
          </div>
          {error && <div className="mb-4 text-red-600 text-sm font-medium">{error}</div>}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-150"
              onClick={onCancel}
              disabled={verifying}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150 ${!password.trim() || verifying ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
              disabled={!password.trim() || verifying}
            >
              {verifying ? 'Verifying.' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminVerifyModal;