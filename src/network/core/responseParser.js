// default api response parser.

/**
 * @description API Success model
 */
export class APIResponse {
  constructor(data = {}, success, code, message = "") {
    this.success = success
    this.data = data
    this.error = null
    this.message = message
    this.code = code
  }
}

/**
 * @description API Error model
 */
export class APIError {
  constructor(error = "", code, fullError, colError) {
    this.success = false
    this.data = null
    this.error = error
    this.message = error
    this.code = code
    this.colError = colError
    this.fullError = fullError
  }
}

/** True when NetworkManager returned APIError instead of throwing. */
export function isApiErrorResponse(res) {
  return Boolean(res && res.success === false && res.error != null)
}

function normalizeApiStatus(status) {
  if (status === true) return true
  if (status === false) return false
  if (status == null) return false
  const s = String(status).trim().toLowerCase()
  return s === "success" || s === "ok" || s === "true"
}

/** Match backend status shapes: success flag, boolean true, or "Success" string. */
export function isApiSuccessBody(body) {
  if (!body || typeof body !== "object") return false
  if (body.success === true) return true
  return normalizeApiStatus(body.status)
}
