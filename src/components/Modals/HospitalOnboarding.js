import React, { useState } from "react"
import Button from "@mui/material/Button"
import { makeStyles } from "tss-react/mui"
import { InputField } from "components"
import { useFormik } from "formik"
import * as Yup from "yup"
import { MenuItem, Select, InputLabel, FormHelperText, Checkbox, ListItemText } from "@mui/material"
// import axios from "axios"
import { FormControl, Grid } from "@mui/material"
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { Toast } from "helpers/toasts/toastHelper"
import "react-toastify/dist/ReactToastify.css"
import { useNavigate } from "react-router-dom"
import { NetworkManager, API } from "network/core"
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline"
import DeleteIcon from "@mui/icons-material/Delete"
const HospitalOnboarding = () => {
  const { classes } = useStyles()
  const [totalTimeSlots, setTotalTimeSlots] = useState(1)
  //const [timeSlots, setTimeSlots] = useState()
  const navigate = useNavigate()

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      doctorName: "",
      email: "",
      password: "",
      mobileNumber: "",
      address: "",
      medicalDegree: "",
      registrationNumber: "",
      hospitalName: "",
      openingHours: [{ startTime: null, endTime: null }],
      tpp: "",
      holidays: [],
      casePaperFee: "",
      followupFee: "",
      doctorFee: "",
      casePaperValidity: ""
    },
    validationSchema: Yup.object().shape({
      doctorName: Yup.string()
        .required("Doctor Name is required.")
        .matches(/^[A-Za-z\s]+$/, "Doctor Name must contain only alphabetic characters and spaces"),

      email: Yup.string().required("Email is required.").email("Invalid Email id").trim(),
      password: Yup.string()
        .required("Password is required.")
        .trim()
        .matches(/^(?=.*[A-Z])/, "One Uppercase required")
        .matches(/^(?=.*[!@#$%^&])/, "One Special Character required")
        .matches(/^(?=.*\d)/, "One Number required")
        .min(8, "Password must be at least 8 characters")
        .max(24, "Password must not exceed 24 characters"),

      address: Yup.string().required("Address is required"),
      mobileNumber: Yup.string()
        .required("Mobile Number is required")
        .matches(/^[0-9]{10}$/, "Mobile Number must be 10 digits"),
      medicalDegree: Yup.string().required("Degree is required"),
      registrationNumber: Yup.string().required("Registration Number is required"),
      hospitalName: Yup.string().required("Clinic Name is required"),
      // openingHours: Yup.array().of(
      //   Yup.object().shape({
      //     startTime: Yup.date().nullable().required("Opening Time is required"),
      //     endTime: Yup.date().nullable().required("Closing Time is required")
      //   })
      // ).min(1, "At least one time slot is required"),
      tpp: Yup.string().required("Time per patient is required"),
      // holiday: Yup.string().required("Holiday is required"),
      casePaperFee: Yup.string().required("Case paper fee is required"),
      followupFee: Yup.string().required("Followup fee is required"),
      doctorFee: Yup.string().required("Doctor fee required is required"),
      casePaperValidity: Yup.string().required("Case paper  fee is required")
    }),
    onSubmit: async (values) => {
      const instance = NetworkManager(API.HOSPITAL.CREATE_HOSPITAL)
      const payload = {
        email: values?.email,
        mobileNumber: values?.mobileNumber,
        password: values?.password,
        details: {
          doctorName: values?.doctorName,
          medicalDegree: values?.medicalDegree,
          hospitalName: values?.hospitalName,
          registrationNumber: values?.registrationNumber,
          address: values?.address,
          openingHours: values.openingHours.map((slot) => ({
            startTime: slot.startTime?.toTimeString().slice(0, 5),
            endTime: slot.endTime?.toTimeString().slice(0, 5)
          })),
          holiday: values?.holidays,
          tpp: values?.tpp,
          casePaperFee: values?.casePaperFee,
          followupFee: values?.followupFee,
          doctorFee: values?.doctorFee,
          casePaperValidity: values?.casePaperValidity
        },
        type: "hospital"
      }

      const response = await instance.request(payload, [])
      if (response?.code === 201) {
        Toast.success("Form submitted successfully")
        setTimeout(() => {
          navigate("/auth/login")
        })
      } else {
        Toast.error("Error in creating hospital")
      }
    }
  })

  const { handleChange, handleBlur, values, errors, touched, resetForm, setFieldValue } =
    formik || {}
  return (
    <div className={classes.details}>
      <div className={classes.title}>Hospital Onboarding</div>

      <form className={classes.form} onSubmit={formik.handleSubmit}>
        <FormControl variant="outlined" fullWidth={true}>
          <Grid justifyContent="space-between" container>
            <Grid container>
              <Grid container item xs={4}>
                <InputField
                  style={{ marginLeft: 8, width: "100%" }}
                  label="Doctor Name*"
                  id="firstName"
                  variant="outlined"
                  value={values?.doctorName}
                  onChange={handleChange("doctorName")}
                  onBlur={handleBlur("doctorName")}
                  error={touched.doctorName && errors.doctorName}
                  helperText={touched.doctorName && errors.doctorName}
                />
              </Grid>
              <Grid container item xs={4}>
                <InputField
                  style={{ marginLeft: 8, width: "100%" }}
                  id="email"
                  label="Email*"
                  variant="outlined"
                  value={values?.email}
                  onChange={handleChange("email")}
                  onBlur={handleBlur("email")}
                  error={touched.email && errors.email}
                  helperText={touched.email && errors.email}
                />
              </Grid>
            </Grid>

            <Grid container style={{ marginTop: 16 }}>
              <Grid container item xs={4}>
                <InputField
                  style={{ marginLeft: 8, width: "100%" }}
                  id="password"
                  label="Password*"
                  variant="outlined"
                  value={values?.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  error={touched.password && errors.password}
                  helperText={touched.password && errors.password}
                />
              </Grid>
              <Grid container item xs={4}>
                <InputField
                  style={{ marginLeft: 8, width: "100%" }}
                  id="medicalDegree"
                  label="Medical Degree*"
                  variant="outlined"
                  value={values?.medicalDegree}
                  onChange={handleChange("medicalDegree")}
                  onBlur={handleBlur("medicalDegree")}
                  error={touched.medicalDegree && errors.medicalDegree}
                  helperText={touched.medicalDegree && errors.medicalDegree}
                />
              </Grid>
            </Grid>

            <Grid container style={{ marginTop: 16 }}>
              <Grid container item xs={4}>
                <InputField
                  style={{ marginLeft: 8, width: "100%" }}
                  id="hospitalName"
                  label="Clinic Name*"
                  variant="outlined"
                  value={values?.hospitalName}
                  onChange={handleChange("hospitalName")}
                  onBlur={handleBlur("hospitalName")}
                  error={touched.hospitalName && errors.hospitalName}
                  helperText={touched.hospitalName && errors.hospitalName}
                />
              </Grid>
              <Grid container item xs={4}>
                <InputField
                  style={{ marginLeft: 8, width: "100%" }}
                  id="registrationNumber"
                  label="Registration Number*"
                  variant="outlined"
                  value={values?.registrationNumber}
                  onChange={handleChange("registrationNumber")}
                  onBlur={handleBlur("registrationNumber")}
                  error={touched.registrationNumber && errors.registrationNumber}
                  helperText={touched.registrationNumber && errors.registrationNumber}
                />
              </Grid>
            </Grid>

            <Grid container style={{ marginTop: 16 }}>
              <Grid container item xs={4}>
                <InputField
                  label="Mobile Number Number*"
                  style={{ marginLeft: 8, width: "100%" }}
                  id="mobileNumber"
                  variant="outlined"
                  value={values?.mobileNumber}
                  onChange={handleChange("mobileNumber")}
                  onBlur={handleBlur("mobileNumber")}
                  error={touched.mobileNumber && errors.mobileNumber}
                  helperText={touched.mobileNumber && errors.mobileNumber}
                />
              </Grid>

              <Grid container item xs={4}>
                <InputField
                  style={{ marginLeft: 8, width: "100%" }}
                  id="adress"
                  label="Address*"
                  variant="outlined"
                  value={values?.address}
                  onChange={handleChange("address")}
                  onBlur={handleBlur("address")}
                  error={touched.address && errors.address}
                  helperText={touched.address && errors.address}
                />
              </Grid>
            </Grid>

            {[...Array(totalTimeSlots)].map((_, index) => (
              <Grid item xs={12} container key={index}>
                <Grid container style={{ marginTop: 16 }}>
                  <Grid container item xs={3}>
                    <div style={{ width: "50%", maxWidth: "200px", marginLeft: "10px" }}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <TimePicker
                          label="Start Time*"
                          value={values.openingHours[index]?.startTime}
                          onChange={(value) => {
                            const newOpeningHours = [...values.openingHours]
                            newOpeningHours[index] = {
                              ...newOpeningHours[index],
                              startTime: value
                            }
                            setFieldValue("openingHours", newOpeningHours)
                          }}
                          renderInput={(params) => (
                            <InputField
                              {...params}
                              error={
                                touched.openingHours?.[index]?.startTime &&
                                errors.openingHours?.[index]?.startTime
                              }
                              helperText={
                                touched.openingHours?.[index]?.startTime &&
                                errors.openingHours?.[index]?.startTime
                              }
                              className={classes.timePicker}
                            />
                          )}
                        />
                      </LocalizationProvider>
                    </div>
                    <div style={{ width: "50%", maxWidth: "200px", marginLeft: "10px" }}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <TimePicker
                          label="End Time*"
                          value={values.openingHours[index]?.endTime}
                          onChange={(value) => {
                            const newOpeningHours = [...values.openingHours]
                            newOpeningHours[index] = {
                              ...newOpeningHours[index],
                              endTime: value
                            }
                            setFieldValue("openingHours", newOpeningHours)
                          }}
                          renderInput={(params) => (
                            <InputField
                              {...params}
                              error={
                                touched.openingHours?.[index]?.endTime &&
                                errors.openingHours?.[index]?.endTime
                              }
                              helperText={
                                touched.openingHours?.[index]?.endTime &&
                                errors.openingHours?.[index]?.endTime
                              }
                              className={classes.timePicker}
                            />
                          )}
                        />
                      </LocalizationProvider>
                    </div>
                  </Grid>
                  {totalTimeSlots > 1 && (
                    <DeleteIcon
                      style={{ cursor: "pointer", marginTop: "15px" }}
                      onClick={() => {
                        if (totalTimeSlots > 1) {
                          setTotalTimeSlots(totalTimeSlots - 1)
                          const newOpeningHours = [...values.openingHours]
                          newOpeningHours.splice(index, 1)
                          setFieldValue("openingHours", newOpeningHours)
                        }
                      }}
                    />
                  )}
                </Grid>
                {index === totalTimeSlots - 1 && (
                  <AddCircleOutlineIcon
                    style={{ cursor: "pointer", marginTop: "15px" }}
                    onClick={() => {
                      setTotalTimeSlots(totalTimeSlots + 1)
                      setFieldValue("openingHours", [
                        ...values.openingHours,
                        { startTime: null, endTime: null }
                      ])
                    }}
                  />
                )}
              </Grid>
            ))}

            <Grid container item xs={16}>
              <Grid container item xs={4}>
                <FormControl
                  variant="outlined"
                  style={{ marginLeft: 8, width: "100%" }}
                  error={touched.holidays && Boolean(errors.holidays)}>
                  <InputLabel>Holidays*</InputLabel>
                  <Select
                    multiple
                    id="holidays"
                    label="Holidays"
                    value={values?.holidays}
                    onChange={handleChange("holidays")}
                    onBlur={handleBlur("holidays")}
                    renderValue={(selected) => selected.join(", ")}>
                    {[
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday"
                    ].map((day) => (
                      <MenuItem key={day} value={day}>
                        <Checkbox checked={values.holidays.indexOf(day) > -1} />
                        <ListItemText primary={day} />
                      </MenuItem>
                    ))}
                  </Select>
                  {touched.holidays && errors.holidays && (
                    <FormHelperText>{errors.holidays}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid container item xs={4}>
                <InputField
                  label="Doctor Fee*"
                  style={{ marginLeft: 8, width: "100%" }}
                  id="doctorFee"
                  variant="outlined"
                  value={values?.doctorFee}
                  onChange={handleChange("doctorFee")}
                  onBlur={handleBlur("doctorFee")}
                  error={touched.doctorFee && errors.doctorFee}
                  helperText={touched.doctorFee && errors.doctorFee}
                />
              </Grid>
            </Grid>

            <Grid container style={{ marginTop: 16 }}>
              <Grid container item xs={4}>
                <InputField
                  label="Case Paper fee*"
                  style={{ marginLeft: 8, width: "100%" }}
                  id="casePaperFee"
                  variant="outlined"
                  value={values?.casePaperFee}
                  onChange={handleChange("casePaperFee")}
                  onBlur={handleBlur("casePaperFee")}
                  error={touched.casePaperFee && errors.casePaperFee}
                  helperText={touched.casePaperFee && errors.casePaperFee}
                />
              </Grid>
              <Grid container item xs={4}>
                <InputField
                  label="Followup fee*"
                  style={{ marginLeft: 8, width: "100%" }}
                  id="followupFee"
                  variant="outlined"
                  value={values?.followupFee}
                  onChange={handleChange("followupFee")}
                  onBlur={handleBlur("followupFee")}
                  error={touched.followupFee && errors.followupFee}
                  helperText={touched.followupFee && errors.followupFee}
                />
              </Grid>
            </Grid>

            <Grid container style={{ marginTop: 16 }}>
              <Grid container item xs={4}>
                <InputField
                  label="Time Per Patient*"
                  style={{ marginLeft: 8, width: "100%" }}
                  id="tpp"
                  variant="outlined"
                  value={values?.tpp}
                  onChange={handleChange("tpp")}
                  onBlur={handleBlur("tpp")}
                  error={touched.tpp && errors.tpp}
                  helperText={touched.tpp && errors.tpp}
                />
              </Grid>
              <Grid container item xs={4}>
                <InputField
                  label="Case paper validity(Days)*"
                  style={{ marginLeft: 8, width: "100%" }}
                  id="casePaperValidity"
                  variant="outlined"
                  value={values?.casePaperValidity}
                  onChange={handleChange("casePaperValidity")}
                  onBlur={handleBlur("casePaperValidity")}
                  error={touched.casePaperValidity && errors.casePaperValidity}
                  helperText={touched.casePaperValidity && errors.casePaperValidity}
                />
              </Grid>
            </Grid>
            <Grid container style={{ marginTop: 30 }} item xs={6}>
              <Button
                onClick={() => {
                  resetForm()
                }}
                className={classes.cancel}>
                Cancel
              </Button>
              <Button type="submit" className={classes.agree}>
                Save
              </Button>
            </Grid>
          </Grid>
        </FormControl>
      </form>
    </div>
  )
}

const useStyles = makeStyles()(() => ({
  details: {
    height: 650,
    margin: 10
  },
  title: {
    marginTop: 20,
    marginLeft: 35,
    marginRight: 35,
    fontSize: 24,
    fontWeight: 700
  },
  form: {
    marginTop: 24,
    marginLeft: 35,
    marginRight: 35
  },
  agree: {
    borderRadius: 5,
    background: "#4E43D6",
    color: "#FFFFFF",
    fontWeight: 600,
    fontSize: 16,
    "&:hover": {
      backgroundColor: "#8F88E5 !important",
      borderColor: "#d8dcf3",
      boxShadow: "none"
    },
    float: "right"
  },
  cancel: {
    color: "#3A4BB6",
    fontWeight: 600,
    fontSize: 16,
    marginRight: 16,
    float: "right"
  }
}))

export default HospitalOnboarding
