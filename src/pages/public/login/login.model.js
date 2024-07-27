import { useUserSession } from "hooks/userSession"
import { NetworkManager, API } from "network/core"

export const useLoginModel = () => {
  const userSession = useUserSession()

  const loginByEmail = async (values) => {
    const instance = NetworkManager(API.HOSPITAL.LOGIN_HOSPITAL)
    const response = await instance.request(values)
    if (response.data) {
      userSession.setSession(response.data)
    }
    return response.success
  }

  return {
    loginByEmail
  }
}
