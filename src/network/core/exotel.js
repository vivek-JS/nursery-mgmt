import { API, NetworkManager } from "network/core"

function fromBackendResponse(res) {
  const d = res?.data
  const success = d?.status === "Success"
  return {
    success,
    data: d?.data,
    error: d?.error || d?.message,
    message: d?.message
  }
}

/**
 * Send SMS via Exotel
 * @param {{ to: string, body: string, from?: string, dltEntityId?: string, dltTemplateId?: string, smsType?: string }} payload
 */
export const sendExotelSms = async (payload) => {
  try {
    const instance = NetworkManager(API.EXOTEL.SEND_SMS)
    const response = await instance.request({
      to: payload.to,
      body: payload.body,
      from: payload.from,
      dltEntityId: payload.dltEntityId,
      dltTemplateId: payload.dltTemplateId,
      smsType: payload.smsType,
      customField: payload.customField,
      priority: payload.priority
    })
    const out = fromBackendResponse(response)
    if (out.success) return out
    return { success: false, error: out.error || out.message }
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message
    return { success: false, error: errMsg }
  }
}

/**
 * Test Exotel configuration (via backend)
 */
export const testExotelConnection = async () => {
  try {
    const instance = NetworkManager(API.EXOTEL.TEST)
    const response = await instance.request({})
    const d = response?.data
    const configured = d?.data?.configured !== false
    const success = d?.status === "Success" && configured
    return {
      success,
      message: d?.message,
      data: d?.data,
      error: success ? undefined : (d?.error || d?.message || "Exotel not configured")
    }
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message
    return { success: false, error: errMsg }
  }
}
