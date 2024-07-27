import React from "react"
import { Formik, Form } from "formik"
import * as Yup from "yup"
import { makeStyles } from "tss-react/mui"
import { Button, FormControl, Grid } from "@mui/material"
import { InputField } from "components"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { useSelector } from "react-redux"

import { usePrivateLayoutController } from "../../../../layout/privateLayout/privateLayout.controller"
import { useIsLoggedIn } from "hooks/state"
const UpdateProfile = () => {
  const { classes } = useStyles()

  const headerData = useSelector((state) => state)

  const data = headerData?.userData?.userData

  const isLoggedIn = useIsLoggedIn()

  const { handleLogout } = usePrivateLayoutController(isLoggedIn)

  const initialValues = {
    email: data?.email || "",
    mobileNumber: data?.mobileNumber || "",
    doctorName: data?.details?.doctorName || ""
  }

  const validationSchema = Yup.object({
    email: Yup.string().email("Invalid email format").required("Email is required"),
    mobileNumber: Yup.string()
      .matches(/^[0-9]{10}$/, "Mobile Number must be 10 digits")
      .required("Mobile number is required"),
    doctorName: Yup.string().required("Name is required")
  })

  const onSubmit = async (values, { setSubmitting }) => {
    setSubmitting(true)
    const instance = NetworkManager(API.HOSPITAL.UPDATE_HOSPITAL)
    const response = await instance.request(values)
    if (response.code === 200) {
      Toast.success("Update Profile successfully")
      handleLogout()
    } else {
      Toast.error("Update Profile Failed")
    }
    setSubmitting(false)
  }

  return (
    <div className={classes.details}>
      <div className={classes.title}>Add Admin</div>
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit}>
        {({ errors, touched, handleChange, handleBlur, values }) => (
          <Form className={classes.form}>
            <FormControl variant="outlined">
              <Grid container spacing={2} style={{ maxWidth: "800px", margin: "0 auto" }}>
                <Grid item xs={6}>
                  <InputField
                    label="Name*"
                    name="doctorName"
                    variant="outlined"
                    fullWidth
                    value={values.doctorName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.doctorName && errors.doctorName}
                    helperText={touched.doctorName && errors.doctorName}
                  />
                </Grid>
                <Grid item xs={6}>
                  <InputField
                    label="Email*"
                    name="email"
                    variant="outlined"
                    fullWidth
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && errors.email}
                    helperText={touched.email && errors.email}
                  />
                </Grid>
                <Grid item xs={6}>
                  <InputField
                    label="Mobile Number*"
                    name="mobileNumber"
                    variant="outlined"
                    fullWidth
                    value={values.mobileNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.mobileNumber && errors.mobileNumber}
                    helperText={touched.mobileNumber && errors.mobileNumber}
                  />
                </Grid>
              </Grid>
              <Grid item xs={6} style={{ textAlign: "left" }}>
                <Button
                  type="button"
                  onClick={() => {
                    // Handle cancel action
                  }}
                  className={classes.cancel}>
                  Cancel
                </Button>
                <Button onSubmit={onSubmit} type="submit" className={classes.agree}>
                  submit
                </Button>
              </Grid>
            </FormControl>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export default UpdateProfile
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
