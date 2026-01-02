import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Laptop, Smartphone, Gift, Home, Watch, Dumbbell,
  Camera, ShoppingBag, Shirt, Car, Utensils, Baby,
  Music, Book, Headphones, Heart,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import ErrorBoundary from '../../components/ErrorBoundary';
import { BASE_URL } from '../../util';

// Icon Component with gradient and responsiveness
const CategoryIcon = ({ icon: Icon, label, link, screenWidth }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getRandomPastelGradient = () => {
    const colors = [
      ['from-blue-50 to-purple-50', 'text-blue-600', 'bg-blue-100/50'],
      ['from-green-50 to-teal-50', 'text-green-600', 'bg-green-100/50'],
      ['from-purple-50 to-pink-50', 'text-purple-600', 'bg-purple-100/50'],
      ['from-yellow-50 to-orange-50', 'text-yellow-600', 'bg-yellow-100/50'],
      ['from-pink-50 to-rose-50', 'text-pink-600', 'bg-pink-100/50'],
      ['from-indigo-50 to-blue-50', 'text-indigo-600', 'bg-indigo-100/50'],
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const [gradientClass, iconClass] = getRandomPastelGradient();

  return (
    <Link
      to={link}
      className="flex flex-col items-center justify-center p-1.5
        transition-all duration-300 transform active:scale-95 hover:scale-105"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative flex items-center justify-center 
        w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16
        bg-gradient-to-br ${gradientClass}
        rounded-full
        shadow-sm active:shadow-inner hover:shadow-md
        transition-all duration-300 group
        overflow-hidden `}
      >
        <Icon
          size={screenWidth < 640 ? 18 : screenWidth < 768 ? 22 : 24}
          className={`${iconClass} transform transition-all duration-300 
            group-hover:scale-110 relative z-10`}
          strokeWidth={1.5}
        />
      </div>

      <div className="mt-0 text-center w-full">
        <span className={`text-[11px] sm:text-xs md:text-sm
          font-medium text-white
          transition-colors duration-300
          line-clamp-1
          ${isHovered ? iconClass : ''}`}>
          {label}
        </span>
      </div>
    </Link>
  );
};

// Icon map
const iconMap = {
  electronics: Laptop,
  phones: Smartphone,
  watches: Watch,
  home: Home,
  gifts: Gift,
  fitness: Dumbbell,
  cameras: Camera,
  fashion: Shirt,
  beauty: Heart,
  automotive: Car,
  kitchen: Utensils,
  baby: Baby,
  music: Music,
  books: Book,
  audio: Headphones,
  default: ShoppingBag
};

const CategoryIcons = () => {
  // This list will contain both main categories and subcategories in the
  // order we want to render (main followed by its subcategories).
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetch and display ONLY main categories
        const response = await fetch(`${BASE_URL}/api/categories`);
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.statusText}`);
        }
        const data = await response.json();

        // Normalize to an array of mains regardless of backend shape
        let mains = [];
        if (Array.isArray(data?.mainCategories)) {
          mains = data.mainCategories;
        } else if (Array.isArray(data?.categories)) {
          mains = data.categories;
        } else if (Array.isArray(data)) {
          mains = data;
        } else {
          throw new Error('Invalid data format received from API');
        }

        // Keep only mains
        setCategories(mains.map(m => ({ ...m, __type: 'main' })));
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkForScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!loading && container) {
      checkForScroll();
      container.addEventListener('scroll', checkForScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkForScroll);
      }
    };
  }, [loading, checkForScroll]);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const getIconForCategory = (name) => {
    const lower = name.toLowerCase();
    return iconMap[lower] || Object.entries(iconMap).find(([key]) => lower.includes(key))?.[1] || iconMap.default;
  };

  if (loading) {
    return (
      <div className="w-full py-10  px-4 gap-40 z-50">
        <div className="containe mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-8"></div>
            <div className="flex justify-center gap-6">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-2xl mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-8 px-4 z-50">
        <div className="containe mx-auto text-center">
          <p className="text-red-600 font-medium">Failed to load categories. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-2 px-2 z-40">
      <div className="containe mx-auto relative">
        {canScrollLeft && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-black/80 backdrop-blur-sm rounded-full p-1 shadow-md hover:bg-white transition-all duration-300 hidden md:flex items-center justify-center"
            aria-label="Scroll left"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
        )}

        <div 
          ref={scrollContainerRef} 
          className="flex items-center overflow-x-auto flex-nowrap gap-3 sm:gap-4 md:gap-6 no-scrollbar scroll-smooth py-4 pl-2 pr-14 md:pr-24 -mx-2 md:ml-30 md:mr-20"
        >
          {/* Start spacer so first icon doesn't sit under left arrow */}
          <div className="flex-none w-4 sm:w-6 md:w-10" aria-hidden="true" />

          {categories.map((category, index) => {
            const link = `/customer/shop?category=${category.id || (category.name || '').toLowerCase()}`;
            return (
              <div key={index} className="flex-none">
                <CategoryIcon
                  icon={getIconForCategory(category.name)}
                  label={category.name}
                  link={link}
                  screenWidth={screenWidth}
                />
              </div>
            );
          })}

          {/* End spacer so last icon isn't hidden under right arrow */}
          <div className="flex-none w-6 sm:w-8 md:w-12" aria-hidden="true" />
        </div>

        {canScrollRight && (
           <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-md hover:bg-white transition-all duration-300 hidden md:flex items-center justify-center"
            aria-label="Scroll right"
          >
            <ChevronRight size={24} className="text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
};

export default function CategoryIconsWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <CategoryIcons />
    </ErrorBoundary>
  );
}
