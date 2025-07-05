// API endpoint URL
const url = "https://live-mt-server.wati.io/385403"

// Your API access token
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4ZDIzNTVlYi04M2U3LTRkYmQtYmRmMC0wOGFkNjhiODM0N2UiLCJ1bmlxdWVfbmFtZSI6InZpdmVrYy5hcGtAZ21haWwuY29tIiwibmFtZWlkIjoidml2ZWtjLmFwa0BnbWFpbC5jb20iLCJlbWFpbCI6InZpdmVrYy5hcGtAZ21haWwuY29tIiwiYXV0aF90aW1lIjoiMTIvMjUvMjAyNCAxMDozMjo1NCIsInRlbmFudF9pZCI6IjM4NTQwMyIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.5UXp_5jr5LCWKtAaZUiCftGBPKB7ILyY37imbrDVHYA"

// Example using axios
export async function sendWatiTemplateAxios() {
  console.log("API Call Start...")

  try {
    // Make the API call
    const response = {}
    return response.data
  } catch (error) {
    // Log detailed error information
    console.error("API Call Failed. Error Details:", error?.response?.data || error.message)
    throw error
  }
}
