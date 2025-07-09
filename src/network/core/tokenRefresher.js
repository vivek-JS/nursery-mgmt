/**
 * @description This is an independent call to reduce cycle dependency
 * @description This call will refresh the expired token and will generate a new one
 */

import { API } from "../config/endpoints"
import { APIConfig } from "../config/serverConfig"

// Helper function to build URL
function urlBuilder(router, params) {
  let uri = ""
  if (typeof router.version === "string") {
    uri = `/${router.version}`
  }
  uri = uri.concat(router.endpoint)
  // all params in form of uri/id1/id2/id3
  if (Array.isArray(params)) {
    for (let key of params) {
      uri = uri.concat("/", key)
    }
  }
  return uri
}

export async function refreshAuthToken(refreshToken) {
  try {
    const { method } = API.AUTH.REFRESH_TOKEN
    const url = urlBuilder(API.AUTH.REFRESH_TOKEN, {})

    const fullUrl = `${APIConfig.BASE_URL}/${url}`

    const response = await fetch(fullUrl, {
      method,
      headers: { "Content-Type": APIConfig.CONTENT_TYPE.JSON },
      body: JSON.stringify({ refreshToken: refreshToken })
    }).then((res) => res.json())

    if (response.success && response.data) {
      // Store new tokens from the backend response in localStorage
      localStorage.setItem("accessToken", response.data.accessToken)
      localStorage.setItem("refreshToken", response.data.refreshToken)
    }
    return response.success
  } catch (err) {
    console.error("Token refresh failed:", err)
    return false
  }
}
