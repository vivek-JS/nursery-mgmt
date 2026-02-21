import { API, NetworkManager } from "network/core"

// All WATI operations go through backend proxy (token in env). No secrets in frontend.

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
 * Get all message templates
 */
export const getMessageTemplates = async (params = {}) => {
  try {
    const instance = NetworkManager(API.WATI.GET_TEMPLATES)
    const response = await instance.request({}, {
      pageSize: params.pageSize || 10,
      pageNumber: params.pageNumber || 1,
      channelPhoneNumber: params.channelPhoneNumber || ""
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
 * Send WhatsApp message to SINGLE recipient using template
 */
export const sendTemplateMessage = async (messageData) => {
  try {
    const instance = NetworkManager(API.WATI.SEND_TEMPLATE)
    const response = await instance.request({
      templateName: messageData.templateName,
      whatsappNumber: messageData.whatsappNumber,
      languageCode: messageData.languageCode || "en",
      parameters: messageData.parameters || [],
      broadcastName: messageData.broadcastName || `Single_Send_${Date.now()}`,
      channelNumber: messageData.channelNumber || "917276386452"
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
 * Send WhatsApp message to MULTIPLE recipients using template (broadcast)
 */
export const sendTemplateMessages = async (messageData) => {
  try {
    const instance = NetworkManager(API.WATI.SEND_TEMPLATE_MESSAGES)
    const response = await instance.request({
      templateName: messageData.templateName,
      broadcastName: messageData.broadcastName || `Campaign_${Date.now()}`,
      languageCode: messageData.languageCode || "en",
      parameters: messageData.parameters || [],
      contacts: messageData.contacts || [],
      channelNumber: messageData.channelNumber || "917276386452"
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
 * Send simple text message
 */
export const sendTextMessage = async (messageData) => {
  try {
    const instance = NetworkManager(API.WATI.SEND_MESSAGE)
    const response = await instance.request({
      message: messageData.message,
      contacts: messageData.contacts || []
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
 * Get contacts from WATI
 */
export const getContacts = async (params = {}) => {
  try {
    const instance = NetworkManager(API.WATI.GET_CONTACTS)
    const response = await instance.request({}, {
      pageSize: params.pageSize || 100,
      pageNumber: params.pageNumber || 1
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
 * Test WATI API connection (via backend proxy)
 */
export const testWatiConnection = async () => {
  try {
    const instance = NetworkManager(API.WATI.TEST)
    const response = await instance.request({})
    const d = response?.data
    const configured = d?.data?.configured !== false
    const success = d?.status === "Success" && configured
    return {
      success,
      message: d?.message,
      data: d?.data,
      error: success ? undefined : (d?.error || d?.message || "WATI not configured or connection failed")
    }
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message
    return { success: false, error: errMsg }
  }
}

/**
 * Legacy: fetch templates (for backward compatibility)
 */
export async function sendWatiTemplateAxios() {
  const response = await getMessageTemplates()
  if (response.success) return response.data
  throw new Error(response.error)
}
