import React from 'react';
import { useCart } from '../context/CartContext';

const CartDebugInfo = () => {
  const { cart } = useCart();

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto z-50">
      <h3 className="text-lg font-bold mb-2">Cart Debug Info</h3>
      <div className="text-sm">
        <p><strong>Total Items:</strong> {cart.length}</p>
        {cart.map((item, index) => (
          <div key={item.id || index} className="mt-2 p-2 bg-gray-800 rounded">
            <p><strong>Item {index + 1}:</strong></p>
            <p>• ID: {item.id}</p>
            <p>• Product ID: {item.productId}</p>
            <p>• Name: {item.name}</p>
            <p>• Selected Size: {item.selectedSize || 'No size'}</p>
            <p>• Size: {item.size || 'No size'}</p>
            <p>• Quantity: {item.quantity}</p>
            <p>• Price: ₹{item.finalPrice || item.price}</p>
          </div>
        ))}
      </div>
      <button 
        onClick={() => console.log('Full cart data:', cart)}
        className="mt-2 bg-blue-600 text-white px-2 py-1 rounded text-xs"
      >
        Log to Console
      </button>
    </div>
  );
};

export default CartDebugInfo;