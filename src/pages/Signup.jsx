import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../util';
import loginVideo from './login_bv.mp4';
import ConfirmationModal from '../admin/ConfirmationModal';

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    role: 'customer' // Default role
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
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

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/register`, 
        formData,
        {
          withCredentials: true, // Enable cookie handling
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.token) {
        // Show success modal and redirect to login
        setConfirmModalState({
          isOpen: true,
          title: 'Registration Successful!',
          message: 'Your account has been created successfully. Please login to continue.',
          icon: CheckCircle,
          onConfirm: () => {
            setConfirmModalState(prev => ({ ...prev, isOpen: false }));
            navigate('/login');
          },
        });
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative bg-cover bg-center pt-13">
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
      <div className="w-full flex items-center justify-center p-4 md:p-8 relative z-10 md:mr-96">
        <div className="curved-bg absolute inset-0"></div>
        <div className="w-full max-w-md relative px-4 md:px-0">
          <div className="flex items-center gap-2 mb-4 md:mb-6 animate-float">
            <div className="w-6 md:w-8 h-6 md:h-8 bg-blue-100 rounded-full"></div>
            <span className="text-lg md:text-xl font-semibold">Bargaati Ecom ₰</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Create new account</h1>
          <p className="text-gray-500 mb-6 md:mb-8">Please enter your details »</p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm md:text-base">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 transform hover:scale-105 transition-transform backdrop-blur-sm border-1 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 hover:shadow-lg">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  name="firstname"
                  placeholder="First name"
                  value={formData.firstname}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-white/50 text-sm md:text-base"
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="relative flex-1 transform hover:scale-105 transition-transform backdrop-blur-sm border-1 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 hover:shadow-lg">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  name="lastname"
                  placeholder="Last name"
                  value={formData.lastname}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-white/50 text-sm md:text-base"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
            
            <div className="relative transform hover:scale-105 transition-transform backdrop-blur-sm border-1 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 hover:shadow-lg">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-white/50 text-sm md:text-base"
                autoComplete="email"
                required
              />
            </div>
            
            <div className="relative transform hover:scale-105 transition-transform backdrop-blur-sm border-1 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 hover:shadow-lg">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-white/50 text-sm md:text-base"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className={`w-25 md:w-1/4 bg-black text-white py-2 rounded-full cursor-pointer hover:bg-gray-700 transition-all hover:shadow-lg transform hover:scale-100 text-sm md:text-base ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Signing up...' : 'Sign up'}
            </button>
          </form>
          
          <p className="text-center mt-6 text-gray-600 text-sm md:text-base">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-600 font-medium">
              Sign in
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

export default Signup;