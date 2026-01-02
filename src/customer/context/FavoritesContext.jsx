import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { BASE_URL } from '../../util';

const FavoritesContext = createContext();

export const useFavorites = () => useContext(FavoritesContext);

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Helper function to get auth token
  const getAuthToken = () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      return token && user ? token : null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  };

  // Helper functions for guest favorites
  const getGuestFavorites = () => {
    try {
      return JSON.parse(localStorage.getItem('guestFavorites') || '[]');
    } catch (error) {
      console.error('Error reading guest favorites:', error);
      return [];
    }
  };

  const saveGuestFavorites = (favs) => {
    try {
      localStorage.setItem('guestFavorites', JSON.stringify(favs));
    } catch (error) {
      console.error('Error saving guest favorites:', error);
    }
  };

  // Fetch favorites on component mount
  useEffect(() => {
    fetchFavorites();
  }, []);

  // Fetch favorites from API or localStorage
  const fetchFavorites = useCallback(async () => {
    const token = getAuthToken();
    
    if (!token) {
      // For guests, load favorites from localStorage
      const guestFavs = getGuestFavorites();
      setFavorites(guestFavs);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/video-favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.favorites) {
        setFavorites(response.data.favorites);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add video to favorites
  const addToFavorites = async (videoId) => {
    const token = getAuthToken();
    
    if (!token) {
      // For guests, save to localStorage
      const guestFavs = getGuestFavorites();
      const exists = guestFavs.find(fav => fav.videoId === videoId);
      
      if (!exists) {
        const newFav = {
          id: `guest-${Date.now()}`,
          videoId: videoId,
          createdAt: new Date().toISOString()
        };
        const updatedFavs = [...guestFavs, newFav];
        setFavorites(updatedFavs);
        saveGuestFavorites(updatedFavs);
        toast.success('Video added to favorites!');
        return true;
      } else {
        toast('Video already in favorites');
        return false;
      }
    }
    
    try {
      const response = await axios.post(`${BASE_URL}/api/video-favorites`, {
        videoId: videoId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchFavorites(); // Refresh favorites list
      toast.success('Video added to favorites!');
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      toast.error('Failed to add video to favorites');
      return false;
    }
  };

  // Remove video from favorites
  const removeFromFavorites = async (videoId) => {
    const token = getAuthToken();
    
    if (!token) {
      // For guests, remove from localStorage
      const guestFavs = getGuestFavorites();
      const updatedFavs = guestFavs.filter(fav => fav.videoId !== videoId);
      setFavorites(updatedFavs);
      saveGuestFavorites(updatedFavs);
      toast.success('Video removed from favorites');
      return true;
    }
    
    try {
      await axios.delete(`${BASE_URL}/api/video-favorites/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchFavorites(); // Refresh favorites list
      toast.success('Video removed from favorites');
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      toast.error('Failed to remove video from favorites');
      return false;
    }
  };

  // Check if video is favorited
  const isVideoFavorited = (videoId) => {
    return favorites.some(fav => 
      (fav.videoId === videoId) || (fav.video && fav.video.id === videoId)
    );
  };

  // Toggle favorite status
  const toggleFavorite = async (videoId) => {
    if (isVideoFavorited(videoId)) {
      return await removeFromFavorites(videoId);
    } else {
      return await addToFavorites(videoId);
    }
  };

  // Get favorite videos with full video data
  const getFavoriteVideos = () => {
    if (!isAuthenticated()) {
      // For guests, we only have videoIds, would need to fetch video details separately
      return favorites;
    }
    return favorites.map(fav => fav.video).filter(Boolean);
  };

  const value = {
    favorites,
    loading,
    addToFavorites,
    removeFromFavorites,
    isVideoFavorited,
    toggleFavorite,
    getFavoriteVideos,
    fetchFavorites,
    isAuthenticated
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};
