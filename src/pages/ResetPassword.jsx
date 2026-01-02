import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../util';
import ConfirmationModal from '../admin/ConfirmationModal';
import loginVideo from './login_bv.mp4';

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, otp, verified } = location.state || {};

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpValid, setOtpValid] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Password strength validation
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  useEffect(() => {
    if (!email || !otp || !verified) {
      setError('Invalid access. Please go through the forgot password process.');
      return;
    }

    setOtpValid(true);
  }, [email, otp, verified]);

  useEffect(() => {
    // Check password strength
    const password = formData.newPassword;
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  }, [formData.newPassword]);



  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Both password fields are required');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${BASE_URL}/api/auth/reset-password`, {
        email,
        otp,
        newPassword: formData.newPassword
      });

      // Show success modal
      setConfirmModalState({
        isOpen: true,
        title: 'Password Reset Successful!',
        message: 'Your password has been reset successfully. You can now login with your new password.',
        icon: CheckCircle,
        onConfirm: () => {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
          navigate('/login', { replace: true });
        },
      });

    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError(err.response?.data?.message || 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    const validCount = Object.values(passwordStrength).filter(Boolean).length;
    if (validCount < 2) return 'bg-red-500';
    if (validCount < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    const validCount = Object.values(passwordStrength).filter(Boolean).length;
    if (validCount < 2) return 'Weak';
    if (validCount < 4) return 'Medium';
    return 'Strong';
  };

  if (loading && otpValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset token...</p>
        </div>
      </div>
    );
  }

  if (otpValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Link
              to="/ForgotPassword"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Request New Reset Link
            </Link>
            <Link
              to="/login"
              className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
      
      {/* Main Content */}
      <div className="w-full flex items-center justify-center p-8 relative z-10">
        <div className="curved-bg absolute inset-0"></div>
        <div className="w-full max-w-md relative">
          <div className="flex items-center gap-2 mb-6 animate-float">
            <div className="w-8 h-8 bg-blue-200 rounded-full"></div>
            <span className="text-xl font-semibold">• Bargaati Ecom ₰</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-2">Reset Password</h1>
          <p className="text-gray-500 mb-2">Create a new password for your account</p>
          {email && (
            <p className="text-sm text-blue-600 mb-6">Resetting password for: {email}</p>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* New Password */}
            <div className="relative transform hover:scale-105 transition-transform border-1 border-gray-200 rounded-lg hover:shadow-lg">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                name="newPassword"
                placeholder="New Password"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full pl-12 pr-12 py-3 bg-white/50 rounded-lg"
                autoComplete="new-password"
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

            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                      style={{ width: `${(Object.values(passwordStrength).filter(Boolean).length / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{getPasswordStrengthText()}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className={`flex items-center gap-1 ${passwordStrength.length ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle size={12} />
                    8+ characters
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle size={12} />
                    Uppercase
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle size={12} />
                    Lowercase
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.number ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle size={12} />
                    Number
                  </div>
                </div>
              </div>
            )}
            
            {/* Confirm Password */}
            <div className="relative transform hover:scale-105 transition-transform border-1 border-gray-200 rounded-lg hover:shadow-lg">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm New Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-12 pr-12 py-3 bg-white/50 rounded-lg"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className={`text-sm flex items-center gap-2 ${
                formData.newPassword === formData.confirmPassword ? 'text-green-600' : 'text-red-600'
              }`}>
                <CheckCircle size={16} />
                {formData.newPassword === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </div>
            )}
            
            <button 
              type="submit"
              disabled={loading || formData.newPassword !== formData.confirmPassword}
              className={`w-full bg-black text-white py-3 rounded-full cursor-pointer hover:bg-gray-700 transition-all hover:shadow-lg transform hover:scale-105 ${
                loading || formData.newPassword !== formData.confirmPassword ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
          
          <p className="text-center mt-6 text-gray-600">
            Remember your password?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-600 font-medium">
              Back to Login
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
        confirmText="Go to Login"
        cancelText="Close"
      />
    </div>
  );
}

export default ResetPassword;