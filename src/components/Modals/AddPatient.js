import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Slide from "@mui/material/Slide"
import { makeStyles } from "tss-react/mui"
import {
  InputField,
  PhoneInput,
  NewDateTimePicker,
  NewDatePicker,
  CustomSelect,
  MedicalHistory
} from "components"
import { useFormik } from "formik"
import * as Yup from "yup"
import { FormControl, Grid } from "@mui/material"
import Med from "assets/icons/medHistory.svg"
import { NetworkManager, API } from "network/core"
//import calendarIcon from "assets/icons/calendar.svg"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { LocalizationProvider } from "@mui/x-date-pickers"
import moment from "moment"
import { Toast } from "helpers/toasts/toastHelper"
import AdharInputField from "components/FormField/AdharInputField"
import { useSelector } from "react-redux"
import { GET_API_DATE } from "utils/dateUtils"

import Autocomplete from "@mui/material/Autocomplete"

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />
})
// const ONLY_CHAR_REGEX = /^[a-zA-Z_ ]+$/
const genders = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Others" }
]
export default function AddPatient({ open, handleClose, timeToAdd, date, patientId }) {
  let dateTime

  if (timeToAdd && date) {
    let newTime = timeToAdd.split(" ")
    dateTime = new Date(date)
    dateTime = dateTime.setHours(newTime[0].split(":")[0], newTime[0].split(":")[1])
  } else {
    dateTime = new Date(date)
    dateTime = dateTime.setHours(0, 0)
  }

  const { classes } = useStyles()
  const [patients, setPatients] = useState([])
  const [selectdPatients, setSelectdPatients] = useState({})
  const [typedName, setTypedName] = useState("")
  const [openMedicalHistory, setOpenMedicalHistory] = useState(false)
  const [medicalHistory, setMedicalHistory] = useState({})

  const headerData = useSelector((state) => state?.userData?.userData?.details)
  const holidays = headerData.holiday

  const { tpp } = headerData || {}
  useEffect(() => {
    getPatientList()
  }, [])

  const getPatientList = async () => {
    if (patientId === -1) {
      const instance = NetworkManager(API.PATIENT.GET_PATIENT_DETAILS)

      const patient_list = await instance.request({})

      setPatients(
        patient_list?.data?.data?.map((patient) => {
          return { label: patient?.name, ...patient }
        })
      )
    } else {
      const instance = NetworkManager(API.PATIENT.GET_PATIENT_DETAILS)

      const patient = await instance.request({}, { patientId: patientId })

      setSelectdPatients(patient?.data?.data)
    }
  }

  const setSelectdPatientData = (value) => {
    setSelectdPatients(value)
  }
  const handleOpenMedicalHistory = () => {
    setOpenMedicalHistory(true)
  }
  const handleCloseMedicalHistory = () => {
    setOpenMedicalHistory(false)
  }
  const addPatient = async () => {
    const {
      name,
      referredBy,
      mobileNumber,
      email,
      address,
      zipcode,
      aadharNumber,
      dob,
      gender,
      compliant,
      doa
    } = values

    const payload = {
      date: GET_API_DATE(doa),
      name: name,
      mobileNumber: mobileNumber.replace(/\D/g, ""),
      email: email,
      address: address,
      pinCode: zipcode,
      aadharNumber: aadharNumber,
      dob: GET_API_DATE(dob),
      gender: gender,
      main_complaint: compliant,
      appointmentTime: doa,
      referredBy: referredBy,
      patient_id: patientId,
      hospitalId: headerData?.userData?.userData?._id,
      allergies: medicalHistory?.allergies,
      habits: medicalHistory?.habits,
      currentTreatment: medicalHistory?.currentTreatment,
      previousDisease: medicalHistory?.previousDisease,
      surgery: medicalHistory?.surgery
    }
    if (selectdPatients?._id) {
      createAppointment({
        patientId: selectdPatients?._id,
        date: GET_API_DATE(doa),
        appointmentTime: moment(doa).format("HH:mm")
      })
    } else {
      const instance = NetworkManager(API.PATIENT.ADD_PATIENT_LIST_V2)

      const result = await instance.request(payload)

      if (result?.data) {
        //  Toast.success("Appointment Created Succesfully.")

        createAppointment({
          patientId: result?.data.data?._id,
          date: GET_API_DATE(doa),
          appointmentTime: moment(doa).format("HH:mm")
        })
        //  handleClose()
      }
    }
  }

  const createAppointment = async ({ patientId, date, appointmentTime }) => {
    const payload = {
      date,
      appointmentTime,
      patientId
    }

    const instance = NetworkManager(API.APPOINTMENT.ADD_APPOINTMENT)
    const result = await instance.request(payload)
    if (result?.data?.status) {
      Toast.success("Appointment Created Succesfully.")

      handleClose()
    } else if (result?.error) {
      Toast.error(result?.message)
    }
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      referredBy: selectdPatients?.referredBy || "",
      name: selectdPatients?.name || typedName || "",
      email: selectdPatients?.email || "",
      mobileNumber: selectdPatients?.mobileNumber || "",
      gender: selectdPatients?.gender || "",
      dob: selectdPatients?.dob ? new Date(selectdPatients?.dob) : null,
      address: selectdPatients?.address || "",
      zipcode: selectdPatients?.pinCode || "",
      rate: "",
      aadharNumber: selectdPatients?.aadharNumber || "",
      compliant: selectdPatients?.mainComplaint || "",
      time: "",
      date: null,
      doa: new Date(dateTime)
    },
    validationSchema: Yup.object().shape({
      name: Yup.string().required("Patient Name is required."),
      address: Yup.string().required("Address is required"),
      email: Yup.string().email("Invalid email").required("email is required"),
      mobileNumber: Yup.string().required("Mobile Number is required"),
      gender: Yup.string().required("Gender is required"),
      dob: Yup.date()
        .required("Please enter your date of birth")
        .nullable()
        .typeError("Invalid Date"),
      doa: Yup.date()
        .required("Please enter appointment Date time")
        .nullable()
        .typeError("Invalid Date"),
      zipcode: Yup.string()
        .required("Zipcode is required")
        .test("is_valid_zipcode", "Please enter valid zip code", (val) => {
          if (val !== undefined) {
            var isValidZip = /(^\d{6}$)|(^\d{6}-\d{4}$)/.test(val)
            if (!isValidZip) {
              return false
            } else {
              return true
            }
          } else {
            return true
          }
        })
    }),
    onSubmit: () => {
      addPatient()
    }
  })

  const { handleChange, handleBlur, values, errors, touched, resetForm, setFieldValue } =
    formik || {}

  return (
    <Dialog
      PaperProps={{ sx: { width: "750px", height: "550px" } }}
      maxWidth="md"
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      aria-describedby="alert-dialog-slide-description">
      <DialogTitle className={classes.modalTitle}>
        <div>New Appointment</div>
        <div className={classes.idDiv}>{selectdPatients?.patient_id}</div>
      </DialogTitle>
      <DialogContent>
        <div className={classes.hr}></div>
        <form className={classes.form} onSubmit={formik.handleSubmit}>
          <FormControl variant="outlined" fullWidth={true}>
            <Grid justifyContent="space-between" container>
              <Grid container>
                <Grid container item xs={6}>
                  <Autocomplete
                    disablePortal
                    id="combo-box-demo"
                    options={patients}
                    onChange={(_, option) => {
                      setSelectdPatientData(option, "item")
                    }}
                    value={selectdPatients?.name || typedName || ""} // Set value to an empty string if selectdPatients.item is falsy
                    renderInput={(params) => (
                      <InputField
                        {...params}
                        id="name"
                        type="text"
                        placeholder="Patient Name"
                        fullWidth
                        value={
                          selectdPatients?.name || params.inputValue || "" // Use inputValue if value is falsy, or an empty string
                        }
                        onChange={(e) => {
                          setTypedName(e.target.value)
                        }}
                      />
                    )}
                    style={{ marginLeft: 8, width: "100%" }}
                  />
                </Grid>
                <Grid container item xs={6}>
                  <InputField
                    style={{ marginLeft: 8, width: "100%" }}
                    id="adress"
                    label="Address*"
                    placeholder="Address*"
                    variant="outlined"
                    value={formik.values.address}
                    onChange={handleChange("address")}
                    onBlur={handleBlur("address")}
                    error={touched.address && errors.address}
                    helperText={touched.address && errors.address}
                  />
                </Grid>
              </Grid>

              <Grid container style={{ marginTop: 16 }}>
                {/* //<div style={{ paddingTop: 7, fontSize: 16, fontWeight: 700 }}>email ID*</div> */}
                <Grid container item xs={6}>
                  <PhoneInput
                    label="Mobile Number*"
                    style={{ marginLeft: 8, width: "100%" }}
                    id="mobileNumber"
                    variant="outlined"
                    value={formik.values.mobileNumber}
                    onChange={handleChange("mobileNumber")}
                    onBlur={handleBlur("mobileNumber")}
                    error={touched.mobileNumber && errors.mobileNumber}
                    helperText={touched.mobileNumber && errors.mobileNumber}
                  />
                </Grid>
                <Grid container item xs={6}>
                  <InputField
                    style={{ marginLeft: 8, width: "100%" }}
                    id="email"
                    label="email Id"
                    variant="outlined"
                    value={values.email}
                    onChange={handleChange("email")}
                    onBlur={handleBlur("email")}
                    error={touched.email && errors.email}
                    helperText={touched.email && errors.email}
                  />
                </Grid>
              </Grid>

              <Grid container style={{ marginTop: 16 }}>
                <Grid container item xs={6}>
                  <InputField
                    style={{ marginLeft: 8, width: "100%" }}
                    id="zipcode"
                    label="Pin Code*"
                    variant="outlined"
                    value={values.zipcode}
                    type="number"
                    onChange={handleChange("zipcode")}
                    onBlur={handleBlur("zipcode")}
                    error={touched.zipcode && errors.zipcode}
                    helperText={touched.zipcode && errors.zipcode}
                  />
                </Grid>
                <Grid container item xs={6}>
                  <AdharInputField
                    style={{ marginLeft: 8, width: "100%" }}
                    id="adhar"
                    label="Adhar Number"
                    variant="outlined"
                    value={values.aadharNumber}
                    onChange={handleChange("aadharNumber")}
                    onBlur={handleBlur("aadharNumber")}
                    error={touched.aadharNumber && errors.aadharNumber}
                    helperText={touched.aadharNumber && errors.aadharNumber}
                  />
                </Grid>
              </Grid>
              <Grid container style={{ marginTop: 16 }}>
                <Grid container item xs={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} style={{ marginLeft: 8 }}>
                    <NewDatePicker
                      sx={{ width: "100%", marginLeft: "8px" }}
                      label="Date of Birth*"
                      value={values.dob}
                      onChange={(date) => {
                        setFieldValue("dob", date)
                      }}
                      onBlur={handleBlur("dob")}
                      error={touched.dob && errors.dob}
                      slotProps={{
                        textField: {
                          helperText: touched.dob ? errors.dob : ""
                        }
                      }}
                      maxDate={new Date()}
                      helperText={touched.dob && errors.dob}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid container item xs={6}>
                  <CustomSelect
                    style={{ marginLeft: "8px", width: "100%" }}
                    fullWidth
                    variant="outlined"
                    id="gender"
                    label="Gender*"
                    items={genders}
                    value={values.gender}
                    onChange={(event) => {
                      setFieldValue("gender", event.target.value)
                    }}
                    onBlur={handleBlur("gender")}
                    error={touched.gender && errors.gender}
                    helperText={touched.gender && errors.gender}
                    className={classes.multiSelect}
                  />
                </Grid>
              </Grid>

              <Grid container style={{ marginTop: 16 }}>
                <Grid container item xs={6}>
                  <InputField
                    style={{ marginLeft: 8, width: "100%" }}
                    id="compliant"
                    label="Cheif Complaint*"
                    variant="outlined"
                    value={values.compliant}
                    onChange={handleChange("compliant")}
                    onBlur={handleBlur("compliant")}
                    error={touched.compliant && errors.compliant}
                    helperText={touched.compliant && errors.compliant}
                  />
                </Grid>
                <Grid container item xs={6} className={classes.calenderPicker}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    {/* <NewDateTimePicker
                      style={{ marginLeft: 8, width: "100%" }}
                      label="Appointment Date and time"
                      value={formik.values.doa}
                      onChange={(date) => {
                        setFieldValue("doa", date)
                      }}
                      onBlur={handleBlur("doa")}
                      error={touched.doa && errors.doa}
                      slotProps={{
                        textField: {
                          helperText: errors.doa
                        }
                      }}
                      helperText={touched.doa && errors.doa}
                      timeSteps={{ hours: 1, minutes: 10 }}
                      views={["hours", "minutes"]}
                    /> */}

                    <NewDateTimePicker
                      style={{ marginLeft: 8, width: "100%" }}
                      label="Appointment Date and time"
                      value={formik.values.doa}
                      onChange={(date) => {
                        setFieldValue("doa", date)
                      }}
                      onBlur={handleBlur("doa")}
                      error={touched.doa && Boolean(errors.doa)}
                      slotProps={{
                        textField: {
                          helperText: touched.doa && errors.doa
                        }
                      }}
                      minDate={new Date()}
                      timeSteps={{ minutes: tpp }}
                      shouldDisableDate={(date) => {
                        const day = date.toLocaleString("en-US", { weekday: "long" })
                        return holidays?.includes(day)
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
              </Grid>
              <Grid container style={{ marginTop: 16 }}>
                <Grid container item xs={6}>
                  <InputField
                    label="Reffered By"
                    style={{ marginLeft: 8, width: "100%" }}
                    id="referredBy"
                    variant="outlined"
                    value={values.referredBy}
                    onChange={handleChange("referredBy")}
                    onBlur={handleBlur("referredBy")}
                    error={touched.referredBy && errors.referredBy}
                    helperText={touched.referredBy && errors.referredBy}
                  />
                </Grid>
              </Grid>
            </Grid>
          </FormControl>
        </form>
      </DialogContent>
      <DialogActions className={classes.DialogActions}>
        <img className={classes.medIcon} src={Med} onClick={handleOpenMedicalHistory} />
        <div>
          <Button
            onClick={() => {
              resetForm()
              handleClose()
            }}
            className={classes.cancel}>
            Cancel
          </Button>
          <Button type="submit" className={classes.agree} onClick={formik.handleSubmit}>
            Save
          </Button>
        </div>
      </DialogActions>
      {openMedicalHistory && (
        <MedicalHistory
          handleClose={handleCloseMedicalHistory}
          medicalHistory={selectdPatients?.healthProfile}
          setMedicalHistory={setMedicalHistory}
        />
      )}{" "}
    </Dialog>
  )
}

const useStyles = makeStyles()(() => ({
  DialogActions: {
    boxSizing: "border-box",
    height: 90,
    paddingRight: 60,
    paddingLeft: 60,
    display: "flex",
    justifyContent: "space-between"
  },
  cancel: {
    color: "#3A4BB6",
    fontWeight: 600,
    fontSize: 16,
    marginRight: 16
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  hr: {
    border: "1px solid #3A4BB6"
  },
  form: {
    marginTop: 24
  },
  txt: {
    fontSize: 16,
    fontWeight: 600
  },
  agree: {
    borderRadius: 5,
    background: "#4E43D6",
    color: "#FFFFFF",
    fontWeight: 600,
    fontSize: 16,
    "&:hover": {
      color: "white",
      background: "#3A4BB6"
    }
  },

  idDiv: {
    background: "linear-gradient(90deg, #F23A41 0%, #6E3AA8 100%)",
    border: "1px solid #FFF",
    borderRadius: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 32,
    color: "#FFFFFF"
  },
  multiSelect: {
    backgroundColor: "#EEEEEE",
    borderRadius: 4,
    width: 180,
    marginRight: 10,
    marginLeft: 10,
    height: "45px !important"
  },
  calenderPicker: {
    "& .MuiTextField-root": {
      marginLeft: 10,
      width: "100%"
    }
  },
  medIcon: {
    cursor: "pointer"
  },
  currentDiv: {
    paddingLeft: 8
  },
  addLergies: {}
}))
