export const APIConfig = {
  BASE_URL: process.env.REACT_APP_BASE_URL || "http://localhost:8000",
  TIMEOUT: 600000, // 10 minutes (600,000 ms) - matches backend timeout
  API_AUTH_HEADER: "Authorization",
  AUTH_TYPE: "Bearer",
  DEFAULT_VERSION: null, // OR set it to null if no version mentioned
  CONTENT_TYPE: {
    JSON: "application/json",
    MULTIPART: "multipart/form-data"
  },
  MAX_REFRESH_ATTEMPTS: 2
}
