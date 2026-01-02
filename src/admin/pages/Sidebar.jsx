// Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Package,
  PlusSquare,
  ShoppingBag,
  Layers,
  MenuIcon // Changed from Menu to MenuIcon
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
 

const Sidebar = ({ navigation, activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [expandedDropdowns, setExpandedDropdowns] = useState({});
  

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showLogoutConfirm) {
          setShowLogoutConfirm(false);
        } else if (isSidebarOpen) {
          toggleSidebar();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showLogoutConfirm, isSidebarOpen, toggleSidebar]);

  

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.getElementById('sidebar');
      const toggleButton = document.getElementById('sidebar-toggle');
      if (isSidebarOpen && sidebar && !sidebar.contains(event.target) && !toggleButton.contains(event.target)) {
        toggleSidebar();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen, toggleSidebar]);

  const toggleDropdown = (itemId) => {
    setExpandedDropdowns(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  

  

  // Mobile toggle button
  const ToggleButton = () => (
    <button
      id="sidebar-toggle"
      onClick={toggleSidebar}
      className="fixed mb-10 left-4 z-100 p-2 rounded-lg bg-white shadow-md border border-gray-200 lg:hidden hover:bg-gray-50 transition-colors"
      aria-label="Toggle Sidebar"
    >
      {isSidebarOpen ? (
        <X className="w-5 h-5 text-gray-600" />
      ) : (
        <MenuIcon className="w-5 h-5 text-gray-600" /> // Changed from Menu to MenuIcon
      )}
    </button>
  );

  return (
    <>
      <ToggleButton />

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm mt-50 z-30 lg:hidden"
          aria-hidden="true"
        />
      )}

      <div
        id="sidebar"
        className={`fixed top-0 left-0 h-screen bg-gradient-to-r from-indigo-50 to-blue-50 shadow-lg 
          flex flex-col z-40 border-r border-gray-100 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-[280px] lg:w-64`}
      >
        <div className="h-20 gap-2 mt-4 flex items-center px-6 border-b border-gray-100">
          <div className="w-full">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-black bg-clip-text text-transparent">
              BARGAATI
            </h1>
          </div>
          {/* <span className="mr-1.3 px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md text-white text-xs font-medium flex items-center">
            <ShieldCheck className="w-4 h-4 mr-1" />
            ADMIN
          </span> */}
        </div>

        <nav className="mt-2 px-3 space-y-1.5 flex-1 overflow-y-auto">
          {navigation.map((item) => (
            <div key={item.id}>
              {item.isDropdown ? (
                <div className="mb-1">
                  <button
                    onClick={() => toggleDropdown(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl ${expandedDropdowns[item.id]
                        ? 'text-black shadow-lg shadow-blue-300/20 bg-blue-50 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center">
                      <span className='text-blue-500'>
                        <item.icon />
                      </span>
                      <span className="ml-3">{item.name}</span>
                    </div>
                    {expandedDropdowns[item.id] ? (
                      <ChevronDown className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {expandedDropdowns[item.id] && item.subItems && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems.map(subItem => (
                        <button
                          key={subItem.id}
                          onClick={() => {
                            setActiveTab(subItem.id);
                            navigate(`/admin/${subItem.id}`);
                          }}
                          className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${activeTab === subItem.id
                              ? 'text-black shadow-lg shadow-blue-300/20 bg-blue-50 border border-blue-200'
                              : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          <span className='text-blue-500'>
                            <subItem.icon />
                          </span>
                          <span className="ml-3">{subItem.name}</span>
                          {activeTab === subItem.id && (
                            <span className="ml-auto h-1 w-1 rounded-full bg-blue-400"></span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    navigate(`/admin/${item.id}`);
                  }}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl ${activeTab === item.id
                      ? 'text-black shadow-lg shadow-blue-300/20 bg-blue-50 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <span className='text-blue-500'>
                    <item.icon />
                  </span>
                  <span className="ml-3">{item.name}</span>
                  {activeTab === item.id && (
                    <span className="ml-auto h-1 w-1 rounded-full bg-blue-400"></span>
                  )}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className='px-3 pb-3 mt-auto'>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl text-red-500 hover:bg-gray-50 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 relative shadow-lg border border-gray-100" role="dialog" aria-modal="true">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Logout</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to logout? You will need to login again to access the admin panel.</p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl shadow-lg"
                autoFocus
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
