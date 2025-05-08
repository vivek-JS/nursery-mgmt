import axios from "axios"

// API endpoint URL
const url = "https://live-mt-server.wati.io/385403"

// Your API access token
const headers = {
  Authorization:
    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4ZDIzNTVlYi04M2U3LTRkYmQtYmRmMC0wOGFkNjhiODM0N2UiLCJ1bmlxdWVfbmFtZSI6InZpdmVrYy5hcGtAZ21haWwuY29tIiwibmFtZWlkIjoidml2ZWtjLmFwa0BnbWFpbC5jb20iLCJlbWFpbCI6InZpdmVrYy5hcGtAZ21haWwuY29tIiwiYXV0aF90aW1lIjoiMTIvMjUvMjAyNCAxMDozMjo1NCIsInRlbmFudF9pZCI6IjM4NTQwMyIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.5UXp_5jr5LCWKtAaZUiCftGBPKB7ILyY37imbrDVHYA",
  "Content-Type": "application/json",
  Accept: "*/*" // Add this if Postman includes it
}

// Request body

// Example using axios
export async function sendWatiTemplateAxios(requestBody, number) {
  console.log("API Call Start...")

  // Construct query string
  // const queryString = new URLSearchParams({
  //   whatsappNumber: number
  // }).toString()

  // Debug request body

  // Debug headers

  // Debug full URL
  const fullUrl = url + `/api/v2/sendTemplateMessage?${queryString}`

  try {
    // Make the API call
    const response = await axios.post(fullUrl, { ...requestBody?.requestBody }, { headers })

    return response.data
  } catch (error) {
    // Log detailed error information
    console.error("API Call Failed. Error Details:", error?.response?.data || error.message)
    throw error
  }
}
