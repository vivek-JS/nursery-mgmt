import { API, NetworkManager } from "network/core"

export async function cancelSowingRequestById(id, reason = "Cancelled from inventory") {
  const instance = NetworkManager(API.sowing.CANCEL_SOWING_REQUEST)
  const response = await instance.request({ reason }, [id])
  if (!response?.data?.success) {
    throw new Error(response?.data?.message || "Failed to cancel sowing request")
  }
  return response.data
}
