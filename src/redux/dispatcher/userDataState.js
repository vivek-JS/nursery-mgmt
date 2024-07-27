import userSlice from "redux/slices/userSlice"
import { store } from "../store"

export const UserDataDispatcher = {
  saveData: (payload) => {
    store.dispatch(userSlice.actions.saveUserData(payload))
  }
}
