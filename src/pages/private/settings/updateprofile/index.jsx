import React from "react"
import { Grid, Button } from "@mui/material"
import { makeStyles } from "tss-react/mui"
import FormField from "components/FormField"
import { useFormik } from "formik"
import { useSelector, useDispatch } from "react-redux"
import { NetworkManager, API } from "network/core"
import { updateUserData } from "../../../../redux/slices/userSlice"
import * as Yup from "yup"
const UpdateProfile = () => {
  const { classes } = useStyles()
  const dispatch = useDispatch()
  const headerData = useSelector((state) => state)

  const data = headerData?.userData?.userData
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      doctor_name: data?.details?.doctorName || "",
      email: data?.email || "",
      mobile_no: data?.mobileNumber || ""
    },
    validationSchema: Yup.object().shape({
      doctor_name: Yup.string()
        .required("Doctor Name is Required")
        .matches(/^[A-Za-z\s]+$/, "Doctor Name must contain only alphabetic characters and spaces"),
      email: Yup.string().required("Degree is required"),
      mobile_no: Yup.string()
        .required("Mobile Number is required")
        .matches(/^[0-9]{10}$/, "Mobile Number must be 10 digits")
    }),
    onSubmit: async (values) => {
      try {
        const instance = NetworkManager(API.HOSPITAL.UPDATE_HOSPITAL)
        const payload = {
          doctorName: values?.doctor_name,
          email: values?.email,
          mobileNumber: values?.mobile_no
        }
        const response = await instance.request(payload, [])

        if (response.data.status === "Success") {

          dispatch(updateUserData(payload))
        }
      } catch (error) {
        console.log(error)
      }
    }
  })
  return (
    <>
      <div className={classes.title}>Update Profile</div>
      <form className={classes.form} onSubmit={formik.handleSubmit}>
        <Grid container xs={12}>
          <Grid xs={4}>
            <FormField
              label={"Name of Doctor"}
              placeholder="Enter Name of Doctor"
              formik={formik}
              name={"doctor_name"}
              value={formik.values.doctor_name}
            />
          </Grid>
        </Grid>
        <Grid container xs={12}>
          <Grid xs={4}>
            <FormField
              type={"number"}
              label={"Mobile Number"}
              placeholder="Enter Mobile Number"
              formik={formik}
              name={"mobile_no"}
              value={formik.values.mobile_no}
            />
          </Grid>
        </Grid>
        <Grid container xs={12}>
          <Grid xs={4}>
            <FormField
              label={"Email"}
              placeholder="Enter Email"
              formik={formik}
              name={"email"}
              value={formik.values.email}
            />
          </Grid>
        </Grid>
        <Grid container spacing={2} className={classes.submitDiv}>
          <Grid item xs={8}>
            <Button type="submit" className={classes.agree}>
              Update
            </Button>
          </Grid>
        </Grid>
      </form>
    </>
  )
}

const useStyles = makeStyles()(() => ({
  form: {
    marginTop: 24,
    marginLeft: 35,
    marginRight: 35
  },
  title: {
    marginTop: 20,
    marginLeft: 35,
    marginRight: 35,
    fontSize: 24,
    fontWeight: 700,
    textDecoration: "underline"
  },
  submitDiv: {
    marginTop: 5
  },
  agree: {
    borderRadius: 5,
    marginTop: 5,
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
  editbtn: {
    borderRadius: 5,
    marginTop: 5,
    background: "#4E43D6",
    color: "#FFFFFF",
    fontWeight: 600,
    fontSize: 16,
    "&:hover": {
      backgroundColor: "#8F88E5 !important",
      borderColor: "#d8dcf3",
      boxShadow: "none"
    },
    float: "right",
    marginRight: 10
  },
  cfile: {
    height: 25,
    padding: 10,
    border: "1px solid lightGray",
    borderRadius: 5
  }
}))

export default UpdateProfile
