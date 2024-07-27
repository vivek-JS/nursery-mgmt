import patientSlicer from "redux/slices/patientSlicer"
import { store } from "../store"

export const PatientDispatcher = {
  checkInActive: (payload) => {
    store.dispatch(patientSlicer.actions.checkInActive(payload))
  }
}
