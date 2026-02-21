import { NetworkManager, API } from "network/core"

export async function createCampaign(payload) {
  try {
    const instance = NetworkManager(API.WHATSAPP_AUTOMATION.CREATE_CAMPAIGN, true)
    // Always send multipart/form-data to avoid client-side boundary/content-type issues.
    const form = payload instanceof FormData ? payload : new FormData()
    if (!(payload instanceof FormData)) {
      for (const key of Object.keys(payload || {})) {
        const val = payload[key]
        if (val === undefined || val === null) continue
        if (Array.isArray(val)) {
          // backend accepts comma-separated strings for arrays
          form.append(key, val.join(","))
        } else {
          form.append(key, val)
        }
      }
    }
    const response = await instance.request(form)
    return response
    
  } catch (err) {
    return err
  }
}

export async function getCampaigns() {
  try {
    const instance = NetworkManager(API.WHATSAPP_AUTOMATION.GET_CAMPAIGNS)
    // accept optional pagination params
    const response = await instance.request(null, arguments[0] || {})
    // Unwrap APIResponse -> return server body if wrapped
    if (response && response.data !== undefined) return response.data
    return response
  } catch (err) {
    return err
  }
}

export async function getCampaignTargets(campaignId, page = 1, limit = 50) {
  try {
    const instance = NetworkManager(API.CAMPAIGN.TARGETS)
    const response = await instance.request(null, { campaignId, page, limit })
    if (response && response.data !== undefined) return response.data
    return response
  } catch (err) {
    return err
  }
}

