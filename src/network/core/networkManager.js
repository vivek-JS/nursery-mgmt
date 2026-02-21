// Higher Order Class to make all network calls
import axios from "axios"
import { APIWithOfflineRouter, HTTP_METHODS } from "./httpHelper"
import { APIConfig } from "../config/serverConfig"
import { APIError, APIResponse } from "./responseParser"
import { refreshAuthToken } from "./tokenRefresher"
import { CookieKeys } from "constants/cookieKeys"
import { APIAborter } from "./abortController"
import offlineManager from "./offlineManager"
import { HTTP_STATUS } from "./statusCode"
import { apiError, offlineNotation } from "./errorParser"
import { UserState } from "redux/dispatcher/UserState"

// ********************
// Create a new Instance of NetworkManager by passing APIRouter argument
// After creating instance, call `request` method to make network request
// Example:
// const payload = {email: "example@gmail.com", password: "123456"}
// const instance = NetworkManager(API.Auth.Login)
// const result = await instance.request(payload)
// --------------------
// You can also pass some id in the url as parameter
// If params are named params then pass an object, the key name must match the param name
// Eg. If the URL is like "https://example.com/login?type=regular", then request would look like below
// const result = await instance.request(payload, {type: "regular"})
// --------------------
// If the params are not named then pass an array of data
// Eg. If the URL is like "https://example.com/user/1/2", then request would look like below
// const result = await instance.request(payload, ["id1", "id2"])
// ********************

export default function networkManager(router, withFile = false) {
  const { TIMEOUT, API_AUTH_HEADER, AUTH_TYPE, CONTENT_TYPE } = APIConfig
  
  axios.defaults.baseURL = router.baseURL
  axios.defaults.timeout = TIMEOUT
  // Don't set default Content-Type - let each request determine it based on body type
  // FormData will be auto-detected and axios will set Content-Type with boundary automatically
  axios.defaults.headers.common["Accept-Language"] = "en"

  // Use localStorage instead of cookies for authentication
  const authToken = localStorage.getItem(CookieKeys.Auth)

  if (authToken && authToken !== "undefined" && authToken !== "null") {
    axios.defaults.headers.common[API_AUTH_HEADER] = `${AUTH_TYPE} ${authToken}`
  } else {
    // Remove Authorization header if no token
    delete axios.defaults.headers.common[API_AUTH_HEADER]
  }

  const AppEnvIsDev = process.env.REACT_APP_APP_ENV === "dev"
  let refreshCount = 0

  // Public endpoints (must NEVER trigger auth refresh / require tokens)
  const isCompletelyPublicEndpoint =
    typeof router?.endpoint === "string" &&
    (router.endpoint.startsWith("/public-links") ||
      router.endpoint.startsWith("/location") ||
      router.endpoint.startsWith("/state"))

  async function request(body = {}, params = {} || []) {
    const url = urlBuilder(router, params)
    const getHttpMethod = router.method !== HTTP_METHODS.GET
    // Query params: exclude pathParams from axios params
    const queryParams = params && typeof params === "object" && !Array.isArray(params) && params.pathParams
      ? Object.fromEntries(Object.entries(params).filter(([k]) => k !== "pathParams"))
      : params
    const getArrayParams = !Array.isArray(queryParams) && typeof queryParams === "object" && Object.keys(queryParams).length > 0
    
    // Auto-detect FormData - if body is FormData instance, treat as file upload
    const isFormData = body instanceof FormData
    const actualWithFile = withFile || isFormData
    const httpBody = httpBodyBuilder(body, actualWithFile)

    // Get fresh token for each request to ensure it's up to date
    const currentAuthToken = localStorage.getItem(CookieKeys.Auth)
    const requestHeaders = {}
    
    // ⛔ For completely public endpoints, NEVER send Authorization header
    // This ensures public links work even with expired/invalid tokens in localStorage
    if (!isCompletelyPublicEndpoint && currentAuthToken && currentAuthToken !== "undefined" && currentAuthToken !== "null") {
      requestHeaders[API_AUTH_HEADER] = `${AUTH_TYPE} ${currentAuthToken}`
    }
    
    // Handle Content-Type for FormData vs JSON
    // Check if httpBody is FormData after httpBodyBuilder
    const isFormDataBody = httpBody instanceof FormData
    
    // For FormData, don't set Content-Type - axios will automatically detect and set it with boundary
    // Axios automatically detects FormData and sets Content-Type: multipart/form-data; boundary=...
    // Only set Content-Type for non-FormData requests
    if (!isFormDataBody && !actualWithFile && !isFormData) {
      requestHeaders["Content-Type"] = CONTENT_TYPE.JSON
    }

    try {
      const result = await axios.request({
        signal: APIAborter.initiate().signal,
        url: url,
        method: router.method,
        headers: requestHeaders,
        ...(getHttpMethod && { data: httpBody }),
        ...(getArrayParams && { params: queryParams })
      })
      // If token expired, get it refreshed
      const response = result.data

      // Handle both response formats: response.success (boolean) and response.status === "success"
      const isSuccess = response.success === true || response.status?.toLowerCase() === "success"

      return new APIResponse(response, isSuccess, result.status, response.data?.message)
    } catch (err) {
      console.log(err?.response?.data?.message)
      const fullError = err?.response?.data?.rowErrors
      const colError = err?.response?.data?.errors
      
      // Extract error message from response (backend may use message or error)
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || fullError?.message || "Unknown error"
      
      // Show toast notification for the error
      apiError(errorMessage)

      const isNetworkError = err.code === HTTP_STATUS.NETWORK_ERR

      if (router instanceof APIWithOfflineRouter && AppEnvIsDev && isNetworkError) {
        offlineNotation()
        return offlineManager(router.offlineJson)
      }

      // ⛔ For completely public endpoints, NEVER attempt auth refresh
      if (err.response?.status === 401 && !isCompletelyPublicEndpoint) {
        if (refreshCount < APIConfig.MAX_REFRESH_ATTEMPTS) {
          const refreshToken = localStorage.getItem(CookieKeys.REFRESH_TOKEN)
          await refreshAuthToken(refreshToken)
          refreshCount++
          return await request(body, params)
        } else {
          UserState.observeLogout()
        }
      } else if (isNetworkError) {
        apiError("Internal server error!")
      }
      console.log(fullError)
      console.log(colError)

      // ✅ Return full data here
      return new APIError(
        fullError?.message || err?.response?.data?.message || err?.response?.data?.error || "Request failed",
        err.code,
        fullError,
        colError
      )
    }
  }
  return {
    request
  }
}

// Prepare endpoint url with params
function urlBuilder(router, params) {
  let uri = ""
  if (typeof router.version === "string") {
    uri = `/${router.version}`
  }
  uri = uri.concat(router.endpoint)

  const pathParams = Array.isArray(params) ? params : params?.pathParams
  if (pathParams && pathParams.length > 0) {
    for (let i = 0; i < pathParams.length; i++) {
      const param = pathParams[i]
      const paramMatch = uri.match(/:[^/]+/)
      if (paramMatch) {
        uri = uri.replace(paramMatch[0], param)
      } else {
        uri = uri.concat("/", param)
      }
    }
  }

  return uri
}

// Prepare endpoint body for no GET requests
function httpBodyBuilder(body, withFile) {
  // If body is already FormData, return it as-is
  if (body instanceof FormData) {
    return body
  }
  
  if (withFile) {
    const formData = new FormData()
    for (let key in body) {
      if (body[key] instanceof FileList) {
        for (let file of body[key]) {
          formData.append(key, file)
        }
      } else if (body[key] instanceof File || body[key] instanceof Blob) {
        formData.append(key, body[key])
      } else {
        formData.append(key, body[key])
      }
    }
    return formData
  } else {
    return body
  }
}
