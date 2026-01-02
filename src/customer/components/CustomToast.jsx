import React from 'react';
import { ShoppingCart, CheckCircle, Info } from 'lucide-react';

export const AlreadyInCartToast = ({ productName, newQuantity, onViewCart, onDismiss }) => (
  <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg max-w-md">
    <div className="flex-shrink-0">
      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
        <Info className="w-5 h-5 text-blue-600" />
      </div>
    </div>
    <div className="ml-3 flex-1">
      <p className="text-sm font-semibold text-blue-900">
        {productName} is already in your cart!
      </p>
      <p className="text-xs text-blue-700 mt-1">
        Quantity updated to {newQuantity}
      </p>
    </div>
    <div className="ml-4 flex-shrink-0 flex gap-2">
      <button
        onClick={onViewCart}
        className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-full transition-colors"
      >
        View Cart
      </button>
      <button
        onClick={onDismiss}
        className="text-xs text-blue-500 hover:text-blue-700"
      >
        ✕
      </button>
    </div>
  </div>
);

export const AddedToCartToast = ({ productName, onDismiss }) => (
  <div className="flex items-center bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md">
    <div className="flex-shrink-0">
      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="w-5 h-5 text-green-600" />
      </div>
    </div>
    <div className="ml-3 flex-1">
      <p className="text-sm font-semibold text-green-900">
        Added: {productName}
      </p>
      <p className="text-xs text-green-700 mt-1">
        Item added to your cart
      </p>
    </div>
    <div className="ml-4 flex-shrink-0">
      <button
        onClick={onDismiss}
        className="text-xs text-green-500 hover:text-green-700"
      >
        ✕
      </button>
    </div>
  </div>
);