import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ShoppingCart, Heart, Menu, X, User, Search, Home,
  ShoppingBag, Grid, BookHeart, LogIn, LogOut
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import { BASE_URL } from '../../util';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, getTotalItems } = useCart();

  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Logout
  const handleLogout = useCallback(() => {
    setShowProfileMenu(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  }, [navigate]);

  // Fetch favorites count from API
  const updateFavoritesCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setFavoritesCount(0);
      return;
    }
    
    try {
      const response = await axios.get(`${BASE_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavoritesCount(response.data.favorites?.length || 0);
    } catch (error) {
      // Don't log error if it's just an auth error or user not logged in
      if (error?.response?.status !== 401) {
        console.error('Failed to fetch favorites count:', error);
      }
      setFavoritesCount(0);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentUserRole === 'customer') {
      updateFavoritesCount();
      window.addEventListener('favoritesUpdate', updateFavoritesCount);
      return () => window.removeEventListener('favoritesUpdate', updateFavoritesCount);
    } else {
      setFavoritesCount(0);
    }
  }, [isLoggedIn, currentUserRole, updateFavoritesCount]);

  // Detect login
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    if (token && userString) {
      try {
        const user = JSON.parse(userString);
        setIsLoggedIn(true);
        setCurrentUserRole(user.role);
      } catch {
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  }, [location.pathname]);

  // Outside click handler
  const handleClickOutside = useCallback((e) => {
    if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
      setShowProfileMenu(false);
    }
  }, []);
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Search handler
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customer/search-results?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowMobileSearch(false);
      setIsMenuOpen(false);
    }
  }, [navigate, searchQuery]);

  // Bottom nav items
  const bottomNavItems = [
    { name: 'Home', icon: Home, path: '/customer' },
    { name: 'Shop', icon: ShoppingBag, path: '/customer/shop' },
    { name: 'Favorites', icon: BookHeart, path: '/customer/favorites' },
  ];

  return (
    <>
      <nav className={`top-10 left-0 w-full h-25 z-500 transition-all duration-500 ease-in-out 
    ${scrolled ? 'bg-black shadow-sm' : 'bg-black backdrop-blur-lg'}`}>
        <div className="container mx-auto px-4 flex justify-between items-center mt-3 h-20 text-white">
          {/* Left: Logo + Menu */}
          <div className="flex items-center gap-4">
            <button className="sm:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            {/* <Link to="/customer" className="text-xl font-bold tracking-wide text-gray-800">V•ecom</Link> */}
            <Link to="/customer" className="flex items-center group">
              <img
                src="/IMG_1624.PNG"
                alt="Logo"
                className="h-16 sm:h-20 md:h-24 w-48 sm:w-56 md:w-64 object-cover object-center ml-2"
                loading="eager"
                decoding="async"
              />
            </Link>
          </div>

          {/* Center: Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-xl mx-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products"
              className="w-full px-4 py-2 rounded-full bg-black border-white/10 text-white text-sm"
            />
          </form>

          {/* Right: Icons */}
          <div className="flex items-center gap-4">
            <button onClick={() => setShowMobileSearch(!showMobileSearch)} className="md:hidden text-white">
              <Search size={20} />
            </button>

            {/* Favorites */}
            <button
              onClick={() => {
                navigate('/customer/favorites');
              }}
              className="relative z-50 text-white"
            >
              <Heart size={20} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-blue-500 text-white text-xs rounded-full px-1.5">{favoritesCount}</span>
              )}
            </button>

            {/* Cart */}
            <button
              onClick={() => {
              navigate('/customer/cart');
              
              }}
              className="relative z-50 text-white"
            >
              <ShoppingCart size={20} />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-2 bg-blue-500 text-white text-xs rounded-full px-1.5">{getTotalItems()}</span>
              )}
            </button>

            {/* User Dropdown */}
            <div className="relative z-50 text-white" ref={profileMenuRef}>
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="hidden sm:inline-block">
                <User size={20} />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 bg-black text-white rounded shadow-md z-50 w-40 text-black">
                  {isLoggedIn && currentUserRole === 'customer' ? (
                    <>
                      <Link
                        to="/customer/userprofile"
                        className="block text-white px-4 py-2 hover:bg-white hover:text-black"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        to="/customer/orders"
                        className="block px-4 py-2 hover:bg-white hover:text-black"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Orders
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-black"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      className="px-4 py-2 hover:bg-black text-white"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      Login
                    </Link>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Search */}
        {showMobileSearch && (
          <div className="md:hidden p-3 border-t">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products"
                className="w-full px-4 py-2 rounded-full bg-gray-100 text-sm"
              />
            </form>
          </div>
        )}
      </nav>

      {/* Mobile Menu Overlay */}
      {/* <div className={`fixed inset-0 bg-black/20 relative z-100 transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMenuOpen(false)} /> */}
      <div
        className={`
          fixed inset-0 text-white bg-black-600 backdrop-blur-sm z-40 sm:hidden
          transition-opacity duration-300 ease-in-out
          ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`
          fixed top-0 left-0 h-full w-[80%] max-w-sm bg-white z-501 sm:hidden
          transform transition-transform duration-300 ease-in-out 
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-5 border-b">
            <span className="text-lg font-semibold text-gray-800">Menu</span>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-white hover:text-gray-900 transition-colors rounded-md"
            >
              <X size={24} />
            </button>
          </div>

          {/* Mobile Menu Links */}
          <div className="flex-1 overflow-y-auto py-4 text-gray-800">
            {bottomNavItems.map((item) => {
              const isActive = (item.path === '/customer' && location.pathname === '/customer') || (item.path !== '/customer' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-6 py-3.5 mx-2 my-1 rounded-md transition-colors
                    ${isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon size={20} className={`mr-4 ${isActive ? 'text-blue-600' : 'text-gray-500:bg-white-500'}`} />
                  {item.name}
                </Link>
              );
            })}
            {/* Auth links in mobile menu */}
            <div className="px-4 py-3 mt-4 border-t">
              {(isLoggedIn && currentUserRole === 'customer') ? (
                <>
                  <Link
                    to="/customer/userprofile"
                    className={`flex items-center px-4 py-3 mx-2 my-1 rounded-md transition-colors
                      ${location.pathname.startsWith('/customer/userprofile')
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User size={20} className={`mr-4 ${location.pathname.startsWith('/customer/profile') ? 'text-blue-600' : 'text-gray-500'}`} /> Profile
                  </Link>
                  <Link
                    to="/customer/orders"
                    className={`flex items-center px-4 py-3 mx-2 my-1 rounded-md transition-colors
                      ${location.pathname.startsWith('/customer/orders')
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ShoppingBag size={20} className={`mr-4 ${location.pathname.startsWith('/customer/orders') ? 'text-blue-600' : 'text-gray-600'}`} /> Orders
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="w-full flex items-center px-4 py-3 mx-2 my-1 text-red-600 hover:bg-red-50 rounded-md transition-colors mt-2"
                  >
                    <LogOut size={20} className="mr-4 text-red-600" /> Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center px-4 py-3 mx-2 my-1 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LogIn size={20} className="mr-4 text-gray-600" /> Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

    </>
  );
};

export default Navbar;
