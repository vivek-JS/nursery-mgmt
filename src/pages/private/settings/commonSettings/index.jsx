import { Grid } from "@mui/material"
import { Formik, Form } from "formik"
import Button from "@mui/material/Button"

import React from "react"
import { useStyles } from "../commonStyles"
import FormField from "components/FormField"
import "react-phone-number-input/style.css"
// import { UpdatePasswordValidator } from "helpers/validators/updatePassword"
import { useSelector } from "react-redux"
import * as Yup from "yup"

const CommonSettings = () => {
  const styles = useStyles()

  const headerData = useSelector((state) => state)
  const data = headerData?.userData?.userData

  const formik = {
    initialValues: {
      password: "",
      confirmpassword: "",
      newpassword: "",
      timepp: data.details.tpp ? data.details.tpp : "",
      stime: data.details.openingHours ? data.details.openingHours[0]?.startTime : "",
      etime: data.details.openingHours ? data.details.openingHours[0]?.endTime : "",
      casePaperFee: data.details.casePaperFee ? data.details.casePaperFee : "",
      casePaperValidity: data.details.casePaperValidity ? data.details.casePaperValidity : "",
      doctorFee: data.details.doctorFee ? data.details.doctorFee : "",
      followupFee: data.details.followupFee ? data.details.followupFee : ""
    },
    validationSchema: Yup.object().shape({
      password: Yup.string().required("Password is Required").min(8),
      newpassword: Yup.string()
        .required("New Password is required")
        .trim()
        .matches(/^(?=.*[A-Z])/, "One Uppercase required")
        .matches(/^(?=.*[!@#$%^&*])/, "One Special Case Character required")
        .matches(/^(?=.*\d)/, "One Number required")
        .min(8, "Password must be at least 8 characters")
        .max(24, "Password must not exceed 24 characters"),
      confirmpassword: Yup.string()
        .required("Confirm password is required")
        .trim()
        .oneOf([Yup.ref("newpassword")], "Password doesn't match")
    }),
    onSubmit: async (values) => {}
  }
  return (
    <div>
      <Formik
        initialValues={formik.initialValues}
        validationSchema={formik.validationSchema}
        onSubmit={formik.onSubmit}>
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={10} md={7} sx={styles.textbox}>
                <FormField
                  label={"Hospital start time"}
                  placeholder="Hospital start"
                  formik={formik}
                  name={"stime"}
                  required
                />

                <FormField
                  label={"Hospital end time"}
                  placeholder="Hospital end time"
                  formik={formik}
                  name={"etime"}
                  required
                />

                <FormField
                  label={"Time per patient"}
                  placeholder="Time per patient"
                  formik={formik}
                  name={"timepp"}
                  required
                />

                <FormField
                  label={"Case paper fee"}
                  placeholder="Case paper fee"
                  formik={formik}
                  name={"casePaperFee"}
                  required
                />

                <FormField
                  label={"Followup fee"}
                  placeholder="Followup fee"
                  formik={formik}
                  name={"followupFee"}
                  required
                />
                <FormField
                  label={"Case paper validity"}
                  placeholder="Case paper validity"
                  formik={formik}
                  name={"casePaperValidity"}
                  required
                />

                <FormField
                  label={"Doctor fee"}
                  placeholder="Doctor fee"
                  formik={formik}
                  name={"doctorFee"}
                  required
                />

                <Grid container item xs={4}>
                  <Button type="submit" className={styles.submitBtn}>
                    Save
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export default CommonSettings
