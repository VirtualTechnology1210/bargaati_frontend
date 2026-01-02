import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Edit2, XCircleIcon, Camera, Calendar, Briefcase, Mail, Phone, MapPin } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { BASE_URL, getImageUrl } from '../../util';
// import BackgroundParticles from '../components/BackgroundParticles';

const UserProfile = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const hasCalledApi = useRef(false);

  const fetchUserData = async (forceRefresh = false) => {
    if (hasCalledApi.current && !forceRefresh) {
      console.log('API already called, skipping...');
      return;
    }
    
    try {
      hasCalledApi.current = true;
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view your profile');
        navigate('/login');
        return;
      }

      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.get(`${BASE_URL}/api/userprofile`, config);
      console.log("response",response)
      
      let profileData = null;
      if (response.data) {
        if (response.data.profile) {
          profileData = response.data.profile;
        } else if (response.data.user) {
          profileData = response.data.user;
        }
      }
      if (profileData) {
        const userData = {
          firstname: profileData.firstName || profileData.firstname || '',
          lastname: profileData.lastName || profileData.lastname || '',
          email: profileData.email || '',
          profilePicture: profileData.profilePicture || null,
          phoneNumber: profileData.phoneNumber || '',
          additionalPhone: profileData.additionalPhone || '',
          dateOfBirth: profileData.dateOfBirth || '',
          gender: profileData.gender || '',
          bio: profileData.bio || '',
          occupation: profileData.occupation || '',
          location: profileData.location || '',
          socialLinks: typeof profileData.socialLinks === 'string' 
            ? JSON.parse(profileData.socialLinks || '{}') 
            : (profileData.socialLinks || {})
        };
        
        setUserData(userData);
        setLoading(false);
      } else {
        console.log('No profile data found in response');
        setError('No profile data found');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error.response?.data?.message || 'Failed to fetch profile data');
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('profilePicture', file);

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };

      const response = await axios.post(`${BASE_URL}/api/userprofile/picture`, formData, config);
      
      if (response.data.success) {
        toast.success('Profile picture updated successfully');
        // Refresh user data to get the new profile picture
        fetchUserData(true);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchUserData(true);
  }, []); // Empty dependency array - only run once on mount

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // This will return just the date part: YYYY-MM-DD
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white transition-colors duration-200">
        <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
          <div className="animate-pulse space-y-8">
            <div className="bg-black rounded-xl p-6 shadow-lg flex items-center space-x-4 border border-gray-700">
              <div className="w-16 h-16 bg-gray-700 rounded-full"></div>
              <div className="space-y-3 flex-1">
                <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/3"></div>
              </div>
            </div>
            <div className="bg-black rounded-xl p-6 shadow-lg space-y-4 border border-gray-700">
              <div className="h-4 bg-gray-700 rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-300 transition-colors duration-200">
        <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
          <div className="bg-red-900/50 border border-red-500/30 rounded-xl p-6 text-red-300 shadow-lg flex items-center">
            <XCircleIcon className="w-5 h-5 mr-2" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  const handleImageError = () => {
    console.log('Profile picture load failed');
    console.log('Attempted URL:', getImageUrl(userData?.profilePicture));
    console.log('Profile picture path:', userData?.profilePicture);
    console.log('BASE_URL:', BASE_URL);
    setImageError(true);
  };

  return (
    <div className="min-h-screen bg-black text-white transition-colors duration-200">
      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
        {/* Profile Header */}
        <div className="relative bg-black rounded-xl shadow-lg p-5 sm:p-6 mb-8 border border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden group ring-1 ring-gray-700">
                {userData?.profilePicture && !imageError ? (
                  <img 
                    src={getImageUrl(userData.profilePicture)}
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
                    <User size={32} className="text-white" />
                  </div>
                )}
                
                {/* Upload overlay */}
                <div 
                  className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white"></div>
                  ) : (
                    <Camera size={20} className="text-white" />
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {userData?.firstname && userData?.lastname 
                    ? `${userData.firstname} ${userData.lastname}`
                    : 'User'}
                </h1>
                <p className="text-gray-400 text-sm sm:text-base truncate">{userData?.email}</p>
                {userData?.occupation && (
                  <p className="text-gray-400 text-sm flex items-center mt-1">
                    <Briefcase size={14} className="mr-1" />
                    {userData.occupation}
                  </p>
                )}
              </div>
            </div>
            <div className="sm:self-auto">
              <button
                onClick={() => navigate('/customer/edit-profile')}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-white text-black rounded-lg hover:bg-yellow-600 font-semibold transition-all duration-200"
              >
                <Edit2 size={16} className="mr-2" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="relative bg-black rounded-xl shadow-lg p-5 sm:p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-3">Profile Information</h2>
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-white">Phone Number</p>
                <p className="text-white">{userData?.phoneNumber || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-white">Additional Phone</p>
                <p className="text-white">{userData?.additionalPhone || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-white">Date of Birth</p>
                <p className="text-white">{formatDate(userData?.dateOfBirth)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Briefcase className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-white">Occupation</p>
                <p className="text-white">{userData?.occupation || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-white">Gender</p>
                <p className="text-white">{userData?.gender || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-white">Location</p>
                <p className="text-white">{userData?.location || 'Not provided'}</p>
              </div>
            </div>

            {userData?.bio && (
              <div className="flex items-start space-x-3 col-span-2">
                <p className="text-sm font-medium text-white">Bio</p>
                <p className="text-white mt-1">{userData.bio}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;