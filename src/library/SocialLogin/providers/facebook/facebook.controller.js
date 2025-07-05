import { Loader } from "redux/dispatcher/Loader"
import { useFacebookModel } from "./facebook.model"
import { useUserSession } from "hooks/userSession"
import { UserState } from "redux/dispatcher/UserState"

export const useFacebookController = () => {
  const model = useFacebookModel()
  const userSession = useUserSession()

  const handleFacebookLogin = async (data) => {
    Loader.show()
    const fbPayload = {
      auth_token: data.accessToken,
      profile_picture: null,
      unique_key: data.userID
    }
    const response = await model.loginByFacebook(fbPayload)

    if (response.success) {
      userSession.setSession(response.data)
      // Dispatch login action to Redux to update the app state
      UserState.login(response.data.user || response.data)
    }
    Loader.hide()
  }

  return {
    handleFacebookLogin
  }
}
