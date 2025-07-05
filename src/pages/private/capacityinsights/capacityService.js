import axios from "axios"
import { API, NetworkManager } from "network/core"

/**
 * Service for handling capacity-related API calls
 */
const capacityService = {
  /**
   * Fetch capacity statistics for a date range
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} Promise resolving to capacity data
   */
  getCapacityStats: async (startDate, endDate) => {
    try {
      const instance = NetworkManager(API.slots.GET_STATS_SLOSTS)

      const response = await instance.request({}, { startDate, endDate })

      if (response.data?.success) {
        return response.data
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("Error fetching capacity data:", error)
      throw error
    }
  },

  /**
   * Export capacity data as JSON file download
   *
   * @param {Object} capacityData - Capacity data to export
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  exportCapacityData: (capacityData, startDate, endDate) => {
    const dataStr = JSON.stringify(capacityData, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
    const exportFileDefaultName = `capacity-insights-${startDate}-to-${endDate}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }
}

export default capacityService
