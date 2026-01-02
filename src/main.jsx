import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Global Axios interceptors to attach JWT and handle 401s
axios.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token && (!config.headers || !config.headers.Authorization)) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // no-op
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Clear stale auth and optionally redirect
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch {}
      // Avoid infinite redirects in non-browser or during dev tools requests
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // window.location.assign('/login'); // Uncomment if you want auto-redirect
      }
    }
    return Promise.reject(error);
  }
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
