import axios from "axios"

// WATI API Configuration - Updated with working token
const WATI_BASE_URL = "https://live-mt-server.wati.io/385403"
const WATI_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwNjY4YWY5Zi1jN2I1LTQ2N2QtOWU0Yi01ZjRjOTJhNThlZjMiLCJ1bmlxdWVfbmFtZSI6InZpdmVrYy5hcGtAZ21haWwuY29tIiwibmFtZWlkIjoidml2ZWtjLmFwa0BnbWFpbC5jb20iLCJlbWFpbCI6InZpdmVrYy5hcGtAZ21haWwuY29tIiwiYXV0aF90aW1lIjoiMDkvMjEvMjAyNSAwNDo1ODozMiIsInRlbmFudF9pZCI6IjM4NTQwMyIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.zAP3ZxQXUO1NWJGLe0e39qVeiXLK_d8U2y0bonMjomw"

// Create axios instance with WATI configuration
const watiClient = axios.create({
  baseURL: WATI_BASE_URL,
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${WATI_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// WATI API Functions

/**
 * Get all message templates
 * @param {Object} params - Query parameters
 * @param {number} params.pageSize - Number of templates per page
 * @param {number} params.pageNumber - Page number
 * @param {string} params.channelPhoneNumber - Channel phone number (optional)
 * @returns {Promise<Object>} Templates response
 */
export const getMessageTemplates = async (params = {}) => {
  try {
    console.log("�� Fetching WATI message templates...", params)
    
    const response = await watiClient.get('/api/v1/getMessageTemplates', {
      params: {
        pageSize: params.pageSize || 10,
        pageNumber: params.pageNumber || 1,
        channelPhoneNumber: params.channelPhoneNumber || ""
      }
    })

    console.log("📱 WATI templates response:", response.data)
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    console.error("❌ Error fetching WATI templates:", error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Send WhatsApp message to SINGLE recipient using template
 * @param {Object} messageData - Message data
 * @param {string} messageData.templateName - Template name
 * @param {string} messageData.whatsappNumber - Recipient's WhatsApp number (E.164 format)
 * @param {string} messageData.languageCode - Language code (e.g., "en", "mr")
 * @param {Array} messageData.parameters - Template parameters as objects with name and value
 * @param {string} messageData.broadcastName - Broadcast name (required for this instance)
 * @param {string} messageData.channelNumber - Channel number for sending
 * @returns {Promise<Object>} Send response
 */
export const sendTemplateMessage = async (messageData) => {
  try {
    console.log("📤 Sending WATI single template message...", messageData)
    
    const payload = {
      template_name: messageData.templateName,
      language: { code: messageData.languageCode || "en" },
      broadcast_name: messageData.broadcastName || `Single_Send_${new Date().toISOString().split('T')[0]}_${Date.now()}`,
      parameters: messageData.parameters || [],
      channel_number: messageData.channelNumber || "917276386452" // Default channel number
    }

    const response = await watiClient.post(`/api/v1/sendTemplateMessage?whatsappNumber=${messageData.whatsappNumber}`, payload)
    
    console.log("📤 WATI single send response:", response.data)
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    console.error("❌ Error sending WATI single message:", error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Send WhatsApp message to MULTIPLE recipients using template (broadcast)
 * @param {Object} messageData - Message data
 * @param {string} messageData.templateName - Template name
 * @param {string} messageData.broadcastName - Broadcast name
 * @param {string} messageData.languageCode - Language code (e.g., "en", "mr")
 * @param {Array} messageData.parameters - Template parameters as objects with name and value
 * @param {Array} messageData.contacts - Array of contact objects with whatsappMsisdn
 * @param {string} messageData.channelNumber - Channel number for sending
 * @returns {Promise<Object>} Send response
 */
export const sendTemplateMessages = async (messageData) => {
  try {
    console.log("📤 Sending WATI bulk template messages...", messageData)
    
    const payload = {
      template_name: messageData.templateName,
      language: { code: messageData.languageCode || "en" },
      broadcast_name: messageData.broadcastName || `Campaign_${Date.now()}`,
      parameters: messageData.parameters || [],
      contacts: messageData.contacts || [],
      channel_number: messageData.channelNumber || "917276386452" // Default channel number
    }

    const response = await watiClient.post('/api/v1/sendTemplateMessages', payload)
    
    console.log("📤 WATI bulk send response:", response.data)
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    console.error("❌ Error sending WATI bulk messages:", error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Send simple text message
 * @param {Object} messageData - Message data
 * @param {string} messageData.message - Message text
 * @param {Array} messageData.contacts - Array of contact objects with whatsappMsisdn
 * @returns {Promise<Object>} Send response
 */
export const sendTextMessage = async (messageData) => {
  try {
    console.log("📤 Sending WATI text message...", messageData)
    
    const payload = {
      message: messageData.message,
      contacts: messageData.contacts || []
    }

    const response = await watiClient.post('/api/v1/sendMessage', payload)
    
    console.log("📤 WATI text send response:", response.data)
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    console.error("❌ Error sending WATI text message:", error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Get contacts from WATI
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Contacts response
 */
export const getContacts = async (params = {}) => {
  try {
    console.log("👥 Fetching WATI contacts...", params)
    
    const response = await watiClient.get('/api/v1/getContacts', {
      params: {
        pageSize: params.pageSize || 100,
        pageNumber: params.pageNumber || 1
      }
    })

    console.log("👥 WATI contacts response:", response.data)
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    console.error("❌ Error fetching WATI contacts:", error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Test WATI API connection
 * @returns {Promise<Object>} Connection test result
 */
export const testWatiConnection = async () => {
  try {
    console.log("🔍 Testing WATI API connection...")
    
    const response = await watiClient.get('/api/v1/getContacts', {
      params: { pageSize: 1, pageNumber: 1 }
    })

    console.log("✅ WATI API connection successful")
    return {
      success: true,
      message: "WATI API connection successful",
      data: response.data
    }
  } catch (error) {
    console.error("❌ WATI API connection failed:", error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

// Legacy function for backward compatibility
export async function sendWatiTemplateAxios() {
  console.log("API Call Start...")
  
  try {
    const response = await getMessageTemplates()
    return response.data
  } catch (error) {
    console.error("API Call Failed. Error Details:", error?.response?.data || error.message)
    throw error
  }
}
