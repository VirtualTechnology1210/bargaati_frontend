import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../../util';

const OfferBanner = () => {
  const [activeBanners, setActiveBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  // Fetch banners
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/banner/getbanner`);
        const all = Array.isArray(response.data?.data) ? response.data.data : [];
        const actives = all
          .filter(b => {
            const val = b?.isactive;
            const isActive = val === true || val === 1 || val === '1' || (typeof val === 'string' && val.toLowerCase() === 'true');
            return isActive && b.bannerimageurl;
          })
          .slice(0, 5); // Allow up to 5 active banners
        setActiveBanners(actives);
        setCurrentIndex(0);
      } catch (error) {
        console.error('Error fetching banners:', error);
      }
    };
    fetchBanners();

    // Set up polling to refresh banners every minute
    const pollInterval = setInterval(fetchBanners, 60000);
    return () => clearInterval(pollInterval);
  }, []);

  // Function to start auto-scroll
  const startAutoScroll = () => {
    stopAutoScroll(); // clear any old interval
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeBanners.length);
    }, 6000); // change every 6s to match Title component
  };

  // Function to stop auto-scroll
  const stopAutoScroll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Start auto-scroll when banners are loaded
  useEffect(() => {
    if (activeBanners.length > 1) {
      startAutoScroll();
    }
    return stopAutoScroll; // cleanup
  }, [activeBanners.length]);

  // Manual controls (reset auto-scroll on click)
  const nextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % activeBanners.length);
    startAutoScroll(); // Reset timer on manual navigation
  };
  const prevSlide = () => {
    setCurrentIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length);
    startAutoScroll(); // Reset timer on manual navigation
  };

  if (activeBanners.length === 0) return null;

  const imgPath = activeBanners[currentIndex]?.bannerimageurl || '';
  const imgUrl = imgPath.startsWith('http')
    ? imgPath
    : `${BASE_URL}/uploads/${imgPath.startsWith('/') ? imgPath.substring(1) : imgPath}`;

  return (
    <div className="relative text-gray-800 rounded-2xl overflow-hidden p-0">
      {activeBanners.length > 1 && (
        <>
          {/* Prev Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              prevSlide();
            }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-3 text-gray-800 transition-all duration-200 shadow-xl "
            aria-label="Previous banner"
          >
            <span className="text-2xl font-bold select-none group-hover:scale-110 inline-block transition-transform">&#10094;</span>
          </button>

          {/* Banner Image */}
          {/* <div className="w-full h-[22.8vh] lg:h-[90vh] relative">
            <Link to="/customer/shop" className="block h-full">
              <img
                src={imgUrl}
                alt={activeBanners[currentIndex]?.bannertitle || 'Banner'}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
              />
            </Link>
          </div> */}
          
          <div className="w-full min-h-[200px] md:min-h-[400px] lg:min-h-[550px] relative">
            <Link to="/customer/shop" className="block h-full">
              <img
                src={imgUrl}
                alt={activeBanners[currentIndex]?.bannertitle || 'Banner'}
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </Link>
          </div>




          {/* Next Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              nextSlide();
            }}
            // className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-3 bg-white/80 hover:bg-white text-gray-800 rounded-full transition-all duration-200 shadow-xl cursor-pointer border-2 border-gray-100 backdrop-blur-sm group"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-3 text-gray-800 transition-all duration-200 shadow-xl"
            aria-label="Next banner"
          >
            <span className="text-2xl font-bold select-none group-hover:scale-110 inline-block transition-transform">&#10095;</span>
          </button>

          {/* Dots Navigation */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 sm:space-x-3 z-50">
            {activeBanners.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentIndex(index);
                  startAutoScroll();
                }}
                className={`w-2.2 h-2.2 sm:w-2.2 sm:h-2.2 rounded-full transition-all duration-300 cursor-pointer border-2 ${index === currentIndex
                    ? 'bg-white border-gray-800 scale-40 shadow-md'
                    : 'bg-white/70 hover:bg-white border-gray-300 hover:border-gray-600'
                  }`}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default OfferBanner;

