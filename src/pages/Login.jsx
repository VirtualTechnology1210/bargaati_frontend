import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../util';
import loginVideo from './login_bv.mp4';
import ConfirmationModal from '../admin/ConfirmationModal';
import { useCart } from '../customer/context/CartContext';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initializeCart } = useCart();
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    icon: null,
    onConfirm: () => {},
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic form validation
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/login`, 
        {
          email: formData.email.trim(),
          password: formData.password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (response.data.token) {
        // Store token and minimal user info in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify({
          id: response.data.user.id,
          role: response.data.user.role,
          email: response.data.user.email
        }));
        
        // Initialize cart after successful login
        initializeCart();
        
        // Show success modal and redirect
        const from = location.state?.from;
        let redirectPath;
        if (from) {
          redirectPath = from;
        } else if (response.data.user.role === 'admin') {
          redirectPath = '/admin/dashboard';
        } else {
          redirectPath = '/customer'; // Default customer landing
        }
        
        setConfirmModalState({
          isOpen: true,
          title: 'Login Successful!',
          message: `Welcome back, ${response.data.user.email}! You will be redirected to your dashboard.`,
          icon: CheckCircle,
          onConfirm: () => {
            setConfirmModalState(prev => ({ ...prev, isOpen: false }));
            navigate(redirectPath, { replace: true });
          },
        });
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.log('Login error:', err.response || err);
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check your connection.');
      } else if (err.response?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err.response?.status === 400) {
        setError(err.response.data.message || 'Please check your input and try again.');
      } else if (err.response?.status === 429) {
        setError('Too many login attempts. Please try again later.');
      } else {
        setError('An error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative bg-[url('/src/assets/pattern.png')] bg-cover bg-center pt-13">
      <div className="particles-container absolute inset-0 pointer-events-none"></div>
      <video
        autoPlay
        loop
        muted
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src={loginVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Left side - Form */}
      <div className="w-full flex items-center justify-center p-8 relative z-10">
        <div className="curved-bg absolute inset-0 "></div>
        <div className="w-full max-w-md relative">
          <div className="flex items-center gap-2 mb-6 animate-float">
            <div className="w-8 h-8 bg-blue-200 rounded-full"></div>
            <span className="text-xl font-semibold">• Bargaati Ecom </span>
          </div>
          
          <h1 className="text-4xl font-bold mb-2 ">Welcome back</h1>
          <p className="text-gray-500 mb-8">Please enter your details »</p>
          
          {location.state?.message && (
            <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-2">
              <CheckCircle size={20} />
              {location.state.message}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="relative transform hover:scale-105 transition-transform border-1 border-gray-200 rounded-lg hover:shadow-lg">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-white/50"
                autoComplete="email"
                required
              />
            </div>
            
            <div className="relative transform hover:scale-105 transition-transform border-1 border-gray-200 rounded-lg hover:shadow-lg ">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-white/50"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <div className="flex items-center justify-between ">
              <label className="flex items-center gap-2 pl-4">
                <span className="text-sm text-gray-800"></span>
              </label>
              <Link to="/ForgotPassword" className="text-gray-700 font-medium">
              Forgot Password? 
            </Link>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className={`w-1/4 bg-black text-white py-2 rounded-full cursor-pointer hover:bg-gray-700 transition-all hover:shadow-lg transform hover:scale-100 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          
          <p className="text-center mt-6 text-gray-600">
            Don't have an account?{' '}
            <Link to="/Signup" className="text-blue-400 hover:text-blue-600 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        icon={confirmModalState.icon}
        iconColor="text-green-500"
        onConfirm={confirmModalState.onConfirm}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        confirmText="Continue"
        cancelText="Close"
      />
    </div>
  );
}

export default Login;