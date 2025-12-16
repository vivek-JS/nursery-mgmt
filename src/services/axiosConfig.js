import axios from 'axios';
import { CookieKeys } from '../constants/cookieKeys';

// Get base URL from environment or use default
// Following farmerService.js pattern - baseURL should NOT include /api/v1
// Normalize: Remove /api/v1 if present in the environment variable
let BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:8000';
// Remove trailing /api/v1 if present
BASE_URL = BASE_URL.replace(/\/api\/v1\/?$/, '');

// Create axios instance
// baseURL should be just the base URL, paths will include /api/v1
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token and ensure /api/v1 prefix
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage using the correct CookieKeys.Auth key
    const token = localStorage.getItem(CookieKeys.Auth);
    
    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ensure URL starts with /api/v1 if it's an API call (not public endpoints)
    // This is idempotent - always produces the same result regardless of input
    if (config.url && !config.url.startsWith('http')) {
      // Check if it's a public endpoint (don't add /api/v1)
      const publicPaths = ['/public-links', '/location', '/state', '/health'];
      const isPublicPath = publicPaths.some(path => config.url.startsWith(path));
      
      if (isPublicPath) {
        // Public endpoint, don't modify
        return config;
      }
      
      // ALWAYS normalize: Remove ALL /api/v1 occurrences first, then add once
      // This ensures idempotency - same input always produces same output
      let cleanUrl = config.url.replace(/\/api\/v1/g, '');
      
      // Remove leading/trailing slashes
      cleanUrl = cleanUrl.replace(/^\/+|\/+$/g, '');
      
      // Handle empty case
      if (!cleanUrl) {
        config.url = '/api/v1';
        return config;
      }
      
      // Reconstruct with exactly one /api/v1 prefix
      config.url = `/api/v1/${cleanUrl}`;
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
        localStorage.removeItem(CookieKeys.Auth);
        localStorage.removeItem(CookieKeys.REFRESH_TOKEN);
        window.location.href = '/#/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;


