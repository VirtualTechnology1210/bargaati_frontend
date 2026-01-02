import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import axios from 'axios';
import { BASE_URL } from '../../util';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [productSizes, setProductSizes] = useState([]);
  const [priceRange, setPriceRange] = useState(null);

  const { isFavorited, toggleFavorite, isLoadingFavorites } = useFavorites(product?.id, product);

  // Fetch product sizes and pricing
  useEffect(() => {
    const fetchProductSizes = async () => {
      if (!product?.id) return;
      
      try {
        const response = await axios.get(`${BASE_URL}/api/products/${product.id}/pricing`);
        if (response.data && response.data.success && response.data.sizes) {
          setProductSizes(response.data.sizes);
          
          // Calculate price range
          const prices = response.data.sizes.map(size => size.calculatedPrice);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          
          setPriceRange({
            min: minPrice,
            max: maxPrice,
            basePrice: response.data.product.basePrice
          });
        }
      } catch (error) {
        console.error('Error fetching product sizes:', error);
        // Fallback to base product price
        setPriceRange({
          min: parseFloat(product.price),
          max: parseFloat(product.price),
          basePrice: parseFloat(product.price)
        });
      }
    };

    fetchProductSizes();
  }, [product?.id, product?.price]);

  const handleNavigate = () => {
    navigate(`/product/${product.id}`);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation(); // Prevent navigation when clicking the heart
    toggleFavorite(product.name);
  };

  return (
    <>
      <div 
        className="group relative border rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer" 
        onClick={handleNavigate}
      >
        <div className="overflow-hidden">
          <img
            src={product?.image}
            alt={product?.name}
            className="w-full h-48 sm:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-3 sm:p-4 bg-white">
          <h3 className="text-sm sm:text-base font-semibold truncate" title={product?.name}>{product?.name}</h3>
          
          {/* Price Display */}
          <div className="mt-1 sm:mt-2">
            {priceRange && productSizes.length > 0 ? (
              <div>
                {priceRange.min === priceRange.max ? (
                  <p className="text-gray-800 font-bold">₹{priceRange.min}</p>
                ) : (
                  <p className="text-gray-800 font-bold">₹{priceRange.min} - ₹{priceRange.max}</p>
                )}
                
                {/* Size indicators */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {productSizes.slice(0, 3).map((size, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                    >
                      {size.size_value}: ₹{size.calculatedPrice}
                    </span>
                  ))}
                  {productSizes.length > 3 && (
                    <span className="text-xs text-gray-500">+{productSizes.length - 3} more</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-800 font-bold">₹{product?.price}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleFavoriteClick}
          disabled={isLoadingFavorites}
          className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-white/80 backdrop-blur-sm rounded-full p-1.5 sm:p-2 text-red-500 hover:bg-white transition-colors disabled:opacity-50"
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} className={`${isFavorited ? 'fill-current' : ''}`} />
        </button>
      </div>
    </>
  );
};

export default ProductCard;
