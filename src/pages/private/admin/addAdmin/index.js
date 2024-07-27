import React from "react"
import { Formik, Form, Field } from "formik"
import * as Yup from "yup"
import { makeStyles } from "tss-react/mui"
import {
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  FormHelperText
} from "@mui/material"
import { InputField } from "components"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

const AddAdmin = () => {
  const { classes } = useStyles()

  const initialValues = {
    email: "",
    password: "",
    mobileNumber: "",
    type: ""
  }

  const validationSchema = Yup.object({
    email: Yup.string().email("Invalid email format").required("Email is required"),
    password: Yup.string()
      .required("Password is required")
      .matches(/^(?=.*[A-Z])/, "One Uppercase required")
      .matches(/^(?=.*[!@#$%^&])/, "One Special Character required")
      .matches(/^(?=.*\d)/, "One Number required")
      .min(8, "Password must be at least 8 characters")
      .max(24, "Password must not exceed 24 characters"),
    mobileNumber: Yup.string()
      .matches(/^[0-9]{10}$/, "Mobile Number must be 10 digits")
      .required("Mobile number is required"),
    type: Yup.string().required("Role is required")
  })

  const onSubmit = async (values, { setSubmitting }) => {
    // setSubmitting(true)
    const instance = NetworkManager(API.COMPOUNDER.CREATE_COMPOUNDER)
    const response = await instance.request(values)
    // console.log(response)

    if (response.code === 201) {
      Toast.success("Admin created successfully")
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
                {/* <Grid item xs={6}>
                  <InputField
                    label="Username*"
                    name="username"
                    variant="outlined"
                    fullWidth
                    value={values.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.username && errors.username}
                    helperText={touched.username && errors.username}
                  />
                </Grid> */}
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
                    label="Password*"
                    name="password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && errors.password}
                    helperText={touched.password && errors.password}
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
                <Grid item xs={6}>
                  <FormControl
                    variant="outlined"
                    fullWidth
                    error={touched.type && Boolean(errors.type)}>
                    <InputLabel>Role*</InputLabel>
                    <Field
                      as={Select}
                      name="type"
                      label="Role*"
                      onChange={handleChange}
                      onBlur={handleBlur}>
                      <MenuItem value="doctor">Doctor</MenuItem>
                      <MenuItem value="compounder">Receptionist</MenuItem>
                    </Field>
                    {touched.type && errors.type && <FormHelperText>{errors.type}</FormHelperText>}
                  </FormControl>
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

export default AddAdmin
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
