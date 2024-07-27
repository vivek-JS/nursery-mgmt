import React from "react"
import { Grid } from "@mui/material"
import { makeStyles } from "tss-react/mui"
import FormField from "components/FormField"
import "react-phone-number-input/style.css"
import Button from "@mui/material/Button"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useSelector, useDispatch } from "react-redux"
import { NetworkManager, API } from "network/core"
import { updateUserData } from "../../../../redux/slices/userSlice"

function Others() {
  const { classes } = useStyles()
  const dispatch = useDispatch()
  const headerData = useSelector((state) => state)

  const data = headerData.userData.userData

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      doctor_name: data?.details?.doctorName || "",
      reg_no: data?.details.registrationNumber || "",
      medical_degree: data?.details.medicalDegree || "",
      mobile_no: data?.mobileNumber || "",
      clinik_name: data?.details.hospitalName || "",
      address: data?.details.address || ""
    },
    validationSchema: Yup.object().shape({
      doctor_name: Yup.string()
        .required("Doctor Name is Required")
        .matches(/^[A-Za-z\s]+$/, "Doctor Name must contain only alphabetic characters and spaces"),
      reg_no: Yup.string().required("Registration Number is required"),
      medical_degree: Yup.string().required("Degree is required"),
      mobile_no: Yup.string()
        .required("Mobile Number is required")
        .matches(/^[0-9]{10}$/, "Mobile Number must be 10 digits"),
      clinik_name: Yup.string().required("Clinic Name is required"),
      address: Yup.string().required("Address is required")
    }),
    onSubmit: async (values) => {
      try {
        const instance = NetworkManager(API.HOSPITAL.UPDATE_HOSPITAL)
        const payload = {
          doctorName: values.doctor_name,
          medicalDegree: values.medical_degree,
          mobileNumber: values.mobile_no,
          hospitalName: values.clinik_name,
          registrationNumber: values.reg_no,
          address: values.address
        }
        const response = await instance.request(payload, [])

        if (response.data.status === "Success") {

          // Dispatch action to update Redux state
          dispatch(updateUserData(payload))

        }
      } catch (error) {
        console.error("Error patching data:", error)
      }
    }
  })
  return (
    <>
      <div className={classes.title}>Prescription Header</div>

      <form className={classes.form} onSubmit={formik.handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            {" "}
            <FormField
              label={"Name of Doctor"}
              placeholder="Enter Name of Doctor"
              formik={formik}
              name={"doctor_name"}
              value={formik.values.doctor_name}
            />
          </Grid>
          <Grid item xs={4}>
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

        <Grid container spacing={2}>
          <Grid item xs={4}>
            <FormField
              label={"Medical Degree"}
              placeholder="Enter Medical Degree"
              formik={formik}
              name={"medical_degree"}
              value={formik.values.medical_degree}
            />
          </Grid>
          <Grid item xs={4}>
            <FormField
              label={"Name of Clinik"}
              placeholder="Enter Name of Clinik"
              formik={formik}
              name={"clinik_name"}
              value={formik.values.clinik_name}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={4}>
            <FormField
              type={"number"}
              label={"Registration Number"}
              placeholder="Enter Registration Number"
              formik={formik}
              name={"reg_no"}
              value={formik.values.reg_no}
            />
          </Grid>

          <Grid item xs={4}>
            <FormField
              label={"Address of Clinik"}
              placeholder="Enter Address of Clinik"
              formik={formik}
              name={"address"}
              value={formik.values.address}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} className={classes.submitDiv}>
          {/* <Grid item xs={8}>
            <div className={classes.cfile}>
              <input type="file" />
            </div>
          </Grid> */}
        </Grid>
        <Grid container spacing={2} className={classes.submitDiv}>
          <Grid item xs={8}>
            <Button type="submit" className={classes.agree} onClick={formik.handleSubmit}>
              Save
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
    border: " 1px solid lightGray",
    borderRadius: 5
  }
}))
export default Others
