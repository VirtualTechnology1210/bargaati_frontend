import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './customer/context/CartContext';
import { FavoritesProvider } from './customer/context/FavoritesContext';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import BackToTop from './components/BackToTop';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admindashboard from './admin/pages/dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CustomerLayout from './customer/components/CustomerLayout';
import Home from './customer/pages/Home';
import Favorites from './customer/components/favorites';
import Cproducts from './customer/pages/Cproducts';
import ProductDetail from './customer/pages/ProductDetails';
import CartPage from './customer/pages/CartPage';
import Checkout from './customer/pages/Checkout';
import OrderSuccess from './customer/pages/OrderSuccess';
import OrderFailed from './customer/pages/OrderFailed';
import UserProfile from './customer/pages/userprofile';
import EditProfile from './customer/pages/EditProfile';
import AboutUs from './customer/pages/AboutUs';
import Orders from './customer/pages/Orders';
import OrderDetail from './customer/pages/OrderDetail';
import SearchResults from './customer/pages/SearchResults';
import Products from './admin/pages/products';
import AdminLayout from './admin/components/AdminLayout';
import Category from './admin/pages/Category';
import CategoryView from './admin/pages/CategoryView';
import ProductsList from './admin/pages/ProductList';
import DispatchDetails from './admin/pages/DispatchDetails';
import AdminOrderDetails from './admin/pages/AdminOrderDetails';
import PendingOrders from './admin/pages/PendingOrders';
import RejectOrders from './admin/pages/RejectOrders';
import AddBanner from './admin/pages/AddBanner';
import ViewBanner from './admin/pages/ViewBanner';
import Videos from './admin/pages/videos';
import VideosList from './admin/pages/videoslist';
import DeliveredOrders from './admin/pages/DeliveredOrders';
import PrivacyPolicy from './customer/pages/PrivacyPolicy';
import TermAndConditions from './customer/pages/Termandconditions';
import RefundReturnPolicy from './customer/pages/RefundReturnPolicy';
import Contactus from './customer/pages/contactus';
import ShippingPolicy from './customer/pages/ShippingPolicy';
import AddOfferTitle from './admin/pages/AddOfferTitle';
import ViewOfferTitle from './admin/pages/ViewOfferTitle';
import SetShippingAmount from './admin/pages/SetShippingAmount';
import ViewShippingAmount from './admin/pages/ViewShippingAmount';

// Safe JSON parse wrapper
const safeJSONParse = (data, defaultValue = null) => {
  try {
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Error parsing JSON:', e);
    return defaultValue;
  }
};

// More strict user validation
const isValidUser = (user) => {
  return user && 
         user.id && 
         user.role && 
         (user.role === 'admin' || user.role === 'customer');
};

// Protected Route Component with strict validation
const ProtectedRoute = ({ children, allowedRole }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = safeJSONParse(localStorage.getItem('user'));
  
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

// Public Route Component - ensures only non-authenticated users can access
const PublicRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = safeJSONParse(localStorage.getItem('user'));
  
  if (token && user) {
    const targetPath = user.role === 'admin' ? '/admin/dashboard' : '/customer/home';
    return <Navigate to={targetPath} state={{ from: location }} replace />;
  }

  return children;
};

const App = () => {
  // Add global error handler to filter out extension errors
  useEffect(() => {
    const handleError = (event) => {
      // Filter out browser extension errors
      if (event.error && event.error.message && 
          (event.error.message.includes('Could not establish connection') ||
           event.error.message.includes('Extension context invalidated') ||
           event.error.message.includes('Receiving end does not exist'))) {
        event.preventDefault();
        console.warn('Browser extension error (filtered):', event.error.message);
        return false;
      }
    };

    const handleUnhandledRejection = (event) => {
      // Filter out extension-related promise rejections
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('Could not establish connection') ||
           event.reason.message.includes('Extension context invalidated') ||
           event.reason.message.includes('Receiving end does not exist'))) {
        event.preventDefault();
        console.warn('Browser extension promise rejection (filtered):', event.reason.message);
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <CartProvider>
        <FavoritesProvider>
          <Toaster 
          position="top-center" 
          reverseOrder={false} 
          limit={1}
          toastOptions={{
            className: '',
            duration: 2000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '15px',
              boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)',
              fontSize: '15px',
              padding: '10px 12px',
            },
            success: {
              duration: 2000,
              theme: {
                primary: 'black',
                secondary: 'black',
              },
              style: {
                background: 'black',
                color: 'white',
              },
              iconTheme: {
                primary: 'white',
                secondary: 'black',
              }
            },
            error: {
              duration: 2000,
              style: {
                background: '#F44336',
                color: 'white',
              },
              iconTheme: {
                primary: 'white',
                secondary: '#F44336',
              }
            },
          }}
        />
        {/* <AuthVerify /> */}{/* Commented out due to import error */}
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div></div>}>
          <Router>
            <ScrollToTop />
            <BackToTop />
            <Routes>
              {/* Changed: Root Route - Redirects to /customer */}
              <Route exact path="/" element={<Navigate to="/customer" replace />} />
              
              {/* Public Routes - Static authentication pages */}
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/forgotpassword" element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } />
              <Route path="/reset-password" element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              } />
              <Route path="/signup" element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              } />
              
              {/* Admin Routes - Protected and require admin role */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Admindashboard />} />
                <Route path="category" element={<Category />} />
                <Route path="category-view" element={<CategoryView />} />
                <Route path="products" element={<Products />} />
                <Route path="products/add" element={<Products />} />
                <Route path="products/edit/:id" element={<Products />} />
                <Route path="products/list" element={<ProductsList />} />
                <Route path="dispatch-details" element={<DispatchDetails />} />
                <Route path="pending-orders" element={<PendingOrders />} />
                <Route path="orders/:id" element={<AdminOrderDetails />} />
                <Route path="reject-orders" element={<RejectOrders />} />
                <Route path="banners/add" element={<AddBanner />} />
                <Route path="banners" element={<ViewBanner />} />
                <Route path="delivered-orders" element={<DeliveredOrders />} />
                <Route path="videos/add"element={<Videos/>}/>
                <Route path="videos/list" element={<VideosList/>}/>
                <Route path="OfferTitle/add" element={<AddOfferTitle />} />
                <Route path="OfferTitle" element={<ViewOfferTitle />} />
                <Route path="shipping/add" element={<SetShippingAmount />} />
                <Route path="shipping/list" element={<ViewShippingAmount />} />
              </Route>
          
              {/* Customer Routes */}
              <Route path="/customer" element={<CustomerLayout />}>
                <Route index element={<Home />} />
                <Route path="home" element={<Home />} />
                <Route path="shop" element={<Cproducts />} />
                <Route path="product/:id" element={<ProductDetail />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="order-success" element={<ProtectedRoute allowedRole="customer"><OrderSuccess /></ProtectedRoute>} />
                <Route path="order-failed" element={<ProtectedRoute allowedRole="customer"><OrderFailed /></ProtectedRoute>} />
                <Route path="userprofile" element={<ProtectedRoute allowedRole="customer"><UserProfile /></ProtectedRoute>} />
                <Route path="edit-profile" element={<ProtectedRoute allowedRole="customer"><EditProfile /></ProtectedRoute>} />
                {/* <Route path="add-address" element={<ProtectedRoute allowedRole="customer"><AddAddress/></ProtectedRoute>} /> */}
                <Route path="orders" element={<ProtectedRoute allowedRole="customer"><Orders /></ProtectedRoute>} />
                <Route path="orders/:orderId" element={<ProtectedRoute allowedRole="customer"><OrderDetail /></ProtectedRoute>} />
                <Route path="search-results" element={<SearchResults />} />
                <Route path="favorites" element={<Favorites />} />                
                <Route path="about-us" element={<AboutUs />} />
                <Route path="PrivacyPolicy" element={<PrivacyPolicy />} />
                <Route path="Termandconditions" element={<TermAndConditions />} />
                <Route path="RefundReturnPolicy"  element={<RefundReturnPolicy />} />
                <Route path="Contactus" element={<Contactus />} />
                <Route path="ShippingPolicy" element={<ShippingPolicy />} />
              </Route>

              {/* Catch all route - Redirects to /customer if not matched, or /login if /customer itself is not found for some reason */}
              <Route path="*" element={<Navigate to="/customer" replace />} />
            </Routes>
          </Router>
        </Suspense>
        </FavoritesProvider>
      </CartProvider>
    </ErrorBoundary>
  );
};

export default App;