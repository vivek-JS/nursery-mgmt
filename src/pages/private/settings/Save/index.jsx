import React from "react"
import Button from "@mui/material/Button"
import { makeStyles } from "tss-react/mui"
import { InputField } from "components"
import { useFormik } from "formik"
import * as Yup from "yup"
// import axios from "axios"
import { FormControl, Grid } from "@mui/material"
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { useNavigate } from "react-router-dom"
import { MenuItem, Select, InputLabel, FormHelperText } from "@mui/material"
import { NetworkManager, API } from "network/core"

import { useSelector } from "react-redux"

const Save = () => {
  // const dispatch = useDispatch()
  const headerData = useSelector((state) => state)

  const data = headerData?.userData?.userData

  const { classes } = useStyles()
  const navigate = useNavigate()
  const formik = useFormik({
    initialValues: {
      doctorName: data?.details?.doctorName || "",
      email: data?.details?.email || "",
      password: "",
      mobileNumber: data?.details?.mobileNumber || "",
      address: data?.details?.address || "",
      medicalDegree: data?.details?.medicalDegree || "",
      registrationNumber: data?.details?.registrationNumber || "",
      hospitalName: data?.details?.hospitalName || "",
      openingTime: null,
      closingTime: null,
      tpp: data?.details?.tpp || "",
      holiday: ""
    },
    validationSchema: Yup.object().shape({
      doctorName: Yup.string()
        .required("Doctor Name is required.")
        .matches(/^[A-Za-z]+$/, "Doctor Name must contain only alphabetic characters"),
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
      openingTime: Yup.string().required("Opening Time is required"),
      closingTime: Yup.string().required("Closing Time is required"),
      tpp: Yup.string().required("Time per patient is required"),
      holiday: Yup.string().required("Holiday is required")
    }),
    onSubmit: async () => {
      const instance = NetworkManager(API.HOSPITAL.UPDATE_HOSPITAL)

      const payload = {
        email: values.email,
        password: values.password,
        mobileNumber: values.mobileNumber,
        doctorName: values.doctorName,
        medicalDegree: values.medicalDegree,
        hospitalName: values.hospitalName,
        registrationNumber: values.registrationNumber,
        address: values.address,
        openingTime: values.openingTime,
        closingTime: values.closingTime,
        holiday: values.holiday,
        tpp: values.tpp
      }

      const response = await instance.request(payload, [])

      if (response.data.response.status == "Success") {
        toast.success("Form submitted successfully")
        setTimeout(() => {
          navigate("/auth/login")
        })
      }
    }
  })

  const { handleChange, handleBlur, values, errors, touched, resetForm, setFieldValue } =
    formik || {}
  return (
    <div className={classes.details}>
      <div className={classes.title}>Doctor Onboarding</div>
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
                  value={values.doctorName}
                  // onChange={handleChange("doctorName")}
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
                  value={values.email}
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
                  value={values.password}
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
                  value={values.medicalDegree}
                  onChange={handleChange("medicalDegree")}
                  onBlur={handleBlur("medicalDegree")}
                  error={touched.medicalDegree && errors.medicalDegree}
                  helperText={touched.medicalDegree && errors.medicalDegree}
                />
              </Grid>
            </Grid>

            {/* <Grid container style={{ marginTop: 16 }}>
                            <Grid container item xs={4}>
                                <InputField
                                    style={{ marginLeft: 8, width: "100%" }}
                                    id="hospitalName"
                                    label="Clinic Name*"
                                    variant="outlined"
                                    value={values.hospitalName}
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
                                    value={values.registrationNumber}
                                    onChange={handleChange("registrationNumber")}
                                    onBlur={handleBlur("registrationNumber")}
                                    error={touched.registrationNumber && errors.registrationNumber}
                                    helperText={touched.registrationNumber && errors.registrationNumber}
                                />
                            </Grid>
                        </Grid> */}

            <Grid container style={{ marginTop: 16 }}>
              <Grid container item xs={4}>
                <InputField
                  label="Mobile Number Number*"
                  style={{ marginLeft: 8, width: "100%" }}
                  id="mobileNumber"
                  variant="outlined"
                  value={values.mobileNumber}
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
                  value={values.address}
                  onChange={handleChange("address")}
                  onBlur={handleBlur("address")}
                  error={touched.address && errors.address}
                  helperText={touched.address && errors.address}
                />
              </Grid>
            </Grid>

            <Grid container style={{ marginTop: 16 }}>
              <Grid container item xs={4}>
                <div style={{ width: "50%", maxWidth: "200px", marginLeft: "10px" }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <TimePicker
                      label="Start Time*"
                      value={values.openingTime}
                      onChange={(value) => setFieldValue("openingTime", value)}
                      onBlur={handleBlur("openingTime")}
                      renderInput={(params) => (
                        <InputField
                          {...params}
                          error={touched.openingTime && errors.openingTime}
                          helperText={touched.openingTime && errors.openingTime}
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
                      value={values.closingTime}
                      onChange={(value) => setFieldValue("closingTime", value)}
                      onBlur={handleBlur("closingTime")}
                      renderInput={(params) => (
                        <InputField
                          className={classes.timePicker}
                          {...params}
                          error={touched.closingTime && errors.closingTime}
                          helperText={touched.closingTime && errors.closingTime}
                        />
                      )}
                    />
                  </LocalizationProvider>
                </div>
              </Grid>

              <Grid container item xs={4}>
                <FormControl
                  variant="outlined"
                  style={{ marginLeft: 8, width: "100%" }}
                  error={touched.holiday && Boolean(errors.holiday)}>
                  <InputLabel>Holiday*</InputLabel>
                  <Select
                    id="holiday"
                    label="holiday"
                    value={values.holiday}
                    onChange={handleChange("holiday")}
                    onBlur={handleBlur("holiday")}>
                    <MenuItem value="Sunday">Sunday</MenuItem>
                    <MenuItem value="Monday">Monday</MenuItem>
                    <MenuItem value="Tuesday">Tuesday</MenuItem>
                    <MenuItem value="Wednesday">Wednesday</MenuItem>
                    <MenuItem value="Thursday">Thursday</MenuItem>
                    <MenuItem value="Friday">Friday</MenuItem>
                    <MenuItem value="Saturday">Saturday</MenuItem>
                  </Select>
                  {touched.holiday && errors.holiday && (
                    <FormHelperText>{errors.holiday}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
            </Grid>
            <Grid container style={{ marginTop: 16 }}>
              {/* <Grid container item xs={4}>
                                <InputField
                                    label="Time Per Patient*"
                                    style={{ marginLeft: 8, width: "100%" }}
                                    id="tpp"
                                    variant="outlined"
                                    value={values.tpp}
                                    onChange={handleChange("tpp")}
                                    onBlur={handleBlur("tpp")}
                                    error={touched.tpp && errors.tpp}
                                    helperText={touched.tpp && errors.tpp}
                                />
                            </Grid> */}
              <Grid container item xs={6}></Grid>
              <Grid container item xs={2}>
                <Button
                  onClick={() => {
                    resetForm()
                  }}
                  className={classes.cancel}>
                  Cancel
                </Button>
                <Button type="submit" onClick={formik.handleSubmit} className={classes.agree}>
                  Saved
                </Button>
              </Grid>
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

export default Save
