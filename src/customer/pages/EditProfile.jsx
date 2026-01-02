import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { BASE_URL } from '../../util';
import { ArrowLeft, Camera, Save, User, Mail, Phone, Calendar, MapPin, Briefcase } from 'lucide-react';

const EditProfile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phoneNumber: '',
    additionalPhone: '',
    dateOfBirth: '',
    gender: '',
    bio: '',
    occupation: '',
    location: '',
    profilePicture: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const { data } = await axios.get(`${BASE_URL}/api/userprofile`, config);
      const profileData = data.profile;
      const formattedDate = profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split('T')[0] : '';
      setFormData({
        firstname: profileData.firstname || '',
        lastname: profileData.lastname || '',
        email: profileData.email || '',
        phoneNumber: profileData.phoneNumber || '',
        additionalPhone: profileData.additionalPhone || '',
        dateOfBirth: formattedDate,
        gender: profileData.gender || '',
        bio: profileData.bio || '',
        occupation: profileData.occupation || '',
        location: profileData.location || '',
        profilePicture: profileData.profilePicture || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG and PNG files are allowed');
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('profilePicture', file);

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      };
      const { data } = await axios.post(`${BASE_URL}/api/userprofile/picture`, uploadFormData, config);
      toast.success('Profile picture updated');
      setFormData(prev => ({ ...prev, profilePicture: data.profilePicture }));
    } catch (error) {
      toast.error('Failed to upload picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const loadingToast = toast.loading('Saving changes...');
      await axios.put(`${BASE_URL}/api/userprofile`, formData, config);
      toast.dismiss(loadingToast);
      toast.success('Profile updated successfully');
      navigate('/customer/profile');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="animate-pulse max-w-4xl mx-auto">
          <div className="bg-black rounded-xl p-8 shadow-lg space-y-6 border border-gray-700">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-12 bg-gray-700 rounded w-full"></div>
            <div className="h-12 bg-gray-700 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white transition-colors duration-200">
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-black rounded-xl shadow-lg overflow-hidden border border-gray-700">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => navigate(-1)} className="flex items-center text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5 mr-2" />Back</button>
              <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">First Name</label>
                  <input type="text" name="firstname" value={formData.firstname} onChange={handleInputChange} className="w-full bg-black border border-gray-600 rounded-md p-3 text-white focus:ring-yellow-500 focus:border-yellow-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Last Name</label>
                  <input type="text" name="lastname" value={formData.lastname} onChange={handleInputChange} className="w-full bg-black border border-gray-600 rounded-md p-3 text-white focus:ring-yellow-500 focus:border-yellow-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-black border border-gray-600 rounded-md p-3 text-white focus:ring-yellow-500 focus:border-yellow-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Phone Number</label>
                  <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full bg-black border border-gray-600 rounded-md p-3 text-white focus:ring-yellow-500 focus:border-yellow-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Additional Phone</label>
                  <input type="tel" name="additionalPhone" value={formData.additionalPhone} onChange={handleInputChange} className="w-full bg-black border border-gray-600 rounded-md p-3 text-white focus:ring-yellow-500 focus:border-yellow-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="w-full bg-black border border-gray-600 rounded-md p-3 text-white focus:ring-yellow-500 focus:border-yellow-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full bg-black border border-gray-600 rounded-md p-3 text-white focus:ring-yellow-500 focus:border-yellow-500">
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full bg-black border border-gray-600 rounded-md p-3 text-white focus:ring-yellow-500 focus:border-yellow-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">Occupation</label>
                  <input type="text" name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full bg-black border border-gray-600 rounded-md p-3 text-white focus:ring-yellow-500 focus:border-yellow-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">Bio</label>
                  <textarea name="bio" rows="4" value={formData.bio} onChange={handleInputChange} className="w-full bg-black border border-gray-600 rounded-md p-3 text-white focus:ring-yellow-500 focus:border-yellow-500"></textarea>
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 text-sm font-medium text-white bg-black border border-gray-600 rounded-lg hover:bg-gray-800">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center px-6 py-2 text-sm font-bold text-black bg-yellow-500 rounded-lg hover:bg-yellow-600 disabled:opacity-50"><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
