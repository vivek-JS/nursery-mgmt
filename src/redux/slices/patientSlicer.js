import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  checkedInId: null
}

export const patientSlicer = createSlice({
  name: "checkedInPatient",
  initialState,
  reducers: {
    checkInActive: (state, action) => {
      if (typeof action.payload === "object") {
        state.checkedInPatient = action.payload
      }
    }
  }
})

export default patientSlicer
