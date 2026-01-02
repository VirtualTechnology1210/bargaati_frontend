import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, Key } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../util';
import loginVideo from './login_bv.mp4';


function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Email input, 2: OTP input
  const navigate = useNavigate();


  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/forgot-password`,
        { email },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      setSuccess(response.data.message || 'Password reset OTP has been sent to your email');
      setStep(2); // Move to OTP input step
      
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError(err.response?.data?.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/verify-otp`,
        { email, otp },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      setSuccess('OTP verified successfully! Redirecting to reset password...');
      
      // Redirect to reset password page with email and OTP
      setTimeout(() => {
        navigate('/reset-password', { 
          state: { email, otp, verified: true } 
        });
      }, 1500);
      
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError(err.response?.data?.message || 'Invalid OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/forgot-password`,
        { email },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      setSuccess('New OTP has been sent to your email');
      
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative bg-[url('/src/assets/colorful.jpg')] bg-cover bg-center pt-13">
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

      <div className="w-full flex items-center justify-center p-8 relative z-10 mr-96">
        <div className="curved-bg absolute inset-0"></div>
        <div className="w-full max-w-md relative">
          <div className="flex items-center gap-2 mb-6 animate-float">
            <div className="w-8 h-8 bg-blue-100 rounded-full"></div>
            <span className="text-xl font-semibold">Bargaati Ecom ₰</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-2">Reset Password</h1>
          <p className="text-gray-500 mb-8">
            {step === 1 
              ? "Enter your email to receive a password reset OTP »" 
              : "Enter the 6-digit OTP sent to your email »"
            }
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-600 rounded-lg flex items-center gap-2">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          {step === 1 ? (
            // Email Input Form
            <form className="space-y-4" onSubmit={handleEmailSubmit}>
              <div className="relative transform hover:scale-105 transition-transform border-1 border-gray-200 rounded-lg hover:shadow-lg">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-3 bg-white/50"
                  required
                />
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className={`ml-42 w-1/4 bg-black text-white py-2 rounded-full cursor-pointer hover:bg-gray-700 transition-all hover:shadow-lg transform hover:scale-100 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            // OTP Input Form
            <form className="space-y-4" onSubmit={handleOTPSubmit}>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  OTP sent to: <strong>{email}</strong>
                </p>
              </div>
              
              <div className="relative transform hover:scale-105 transition-transform border-1 border-gray-200 rounded-lg hover:shadow-lg">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full pl-12 pr-4 py-3 bg-white/50 text-center text-lg tracking-widest"
                  maxLength="6"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className={`flex-1 bg-black text-white py-2 rounded-full cursor-pointer hover:bg-gray-700 transition-all hover:shadow-lg transform hover:scale-100 ${
                    loading || otp.length !== 6 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                
                <button 
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className={`px-4 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-all ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Resend
                </button>
              </div>
              
              <button 
                type="button"
                onClick={() => {setStep(1); setOtp(''); setError(''); setSuccess('');}}
                className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Change Email
              </button>
            </form>
          )}
          
          <div className="text-center mt-6 space-y-2">
            <p className="text-gray-600">
              Remember your password?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-600 font-medium">
                Back to Login
              </Link>
            </p>
            {success && step === 1 && (
              <p className="text-sm text-gray-500">
                Check your email for the OTP. It may take a few minutes to arrive.
              </p>
            )}
            {step === 2 && (
              <p className="text-sm text-gray-500">
                Didn't receive the OTP? Check your spam folder or click Resend.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;