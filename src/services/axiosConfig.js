import axios from 'axios';

// Get base URL from environment or use default
// Following farmerService.js pattern - baseURL should NOT include /api/v1
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:8000';

// Create axios instance
// baseURL should be just the base URL, paths will include /api/v1
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage or sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        // Clear token and redirect to login
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        window.location.href = '/#/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;


