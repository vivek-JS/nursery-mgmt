import { createSlice } from "@reduxjs/toolkit"
const initialState = {
  userData: null
}

export const userSlice = createSlice({
  name: "userData",
  initialState,
  reducers: {
    saveUserData: (state, action) => {
      if (typeof action.payload === "object") {
        state.userData = action.payload
      }
    },

    updateUserData: (state, action) => {
      if (state.userData) {
        return {
          ...state,
          userData: {
            ...state.userData,
            details: {
              ...state.userData.details,
              ...action.payload.details,
            },
          },
        };
      }
    },
  }
})
export const { updateUserData } = userSlice.actions
export default userSlice
