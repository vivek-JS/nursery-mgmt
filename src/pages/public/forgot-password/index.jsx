import React from "react"
import { Typography, Grid, Divider, Box } from "@mui/material"
import { Formik } from "formik"
import { useStyles } from "../commonStyles"
import { LoadingButton } from "@mui/lab"
import LockResetIcon from "@mui/icons-material/LockReset"
import { FPValidator } from "helpers/validators/forgotPassword"
import { useForgotPasswordController } from "./forgot-password.controller"
import FormField from "components/FormField"
import RefreshIcon from "@mui/icons-material/Refresh"

function ForgotPassword() {
  const styles = useStyles()

  const { showLoader, sendEmail, navigateToLogin, isEmailSent, formikRef } =
    useForgotPasswordController()

  const responsiveContainer = {
    ...styles.container,
    maxWidth: { xs: "100%", sm: "90%", md: "66%" },
    padding: { xs: "20px", sm: "30px", md: "40px" },
    height: { xs: "auto", sm: "100vh" },
    minHeight: { xs: "100vh", sm: "auto" },
    marginTop: { xs: "20px", sm: "0" },
    marginBottom: { xs: "20px", sm: "0" }
  }

  return !isEmailSent ? (
    <Box sx={responsiveContainer}>
      <React.Fragment>
        <Typography
          align="left"
          variant="h3"
          sx={{
            fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
            marginBottom: { xs: "15px", sm: "20px" }
          }}>
          Reset Your Password
        </Typography>
        <Typography
          sx={{
            ...styles.topLabel,
            fontSize: { xs: "0.875rem", sm: "1rem" },
            marginBottom: { xs: "15px", sm: "20px" },
            marginTop: { xs: "10px", sm: "20px" }
          }}
          variant="subtitle">
          Enter Your Email to receive reset link
        </Typography>
        <Grid sx={styles.form} container spacing={2}>
          <Divider />
          <Formik
            innerRef={formikRef}
            validateOnMount
            initialValues={FPValidator.initialValues}
            validationSchema={FPValidator.validationSchema}
            onSubmit={sendEmail}>
            {(formik) => (
              <React.Fragment>
                <Grid item xs={12}>
                  <FormField
                    label={" Email ID"}
                    placeholder="Enter Your Email"
                    formik={formik}
                    name={"email"}
                    required
                    type={"email"}
                  />
                </Grid>
                <Grid
                  sx={{
                    ...styles.buttonContainer,
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: "15px", sm: "0" },
                    alignItems: { xs: "stretch", sm: "center" }
                  }}
                  item
                  xs={12}>
                  <LoadingButton
                    type="submit"
                    disabled={!formik.isValid || showLoader}
                    variant="contained"
                    sx={{
                      ...styles.submitBtn,
                      width: { xs: "100%", sm: "auto" },
                      padding: { xs: "14px 30px", sm: "16px 50px" }
                    }}
                    size="large"
                    onClick={formik.handleSubmit}
                    loading={showLoader}
                    loadingPosition="start"
                    startIcon={<LockResetIcon />}>
                    Send Email
                  </LoadingButton>
                  <Typography
                    onClick={navigateToLogin}
                    sx={{
                      ...styles.forgotPassword,
                      textAlign: { xs: "center", sm: "left" },
                      marginTop: { xs: "10px", sm: "0" }
                    }}
                    variant="c3">
                    Back To Login
                  </Typography>
                </Grid>
              </React.Fragment>
            )}
          </Formik>
        </Grid>
      </React.Fragment>
    </Box>
  ) : (
    <Box sx={responsiveContainer}>
      <Typography
        align="left"
        variant="h3"
        sx={{
          fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
          marginBottom: { xs: "15px", sm: "20px" }
        }}>
        Email Sent SuccussFully
      </Typography>
      <Typography
        sx={{
          ...styles.topLabel,
          fontSize: { xs: "0.875rem", sm: "1rem" },
          marginBottom: { xs: "20px", sm: "30px" },
          marginTop: { xs: "10px", sm: "20px" }
        }}
        variant="subtitle">
        Please check your email to reset password, If not received please click below to resent the
        email.
      </Typography>
      <LoadingButton
        type="submit"
        disabled={showLoader}
        variant="contained"
        sx={{
          ...styles.resendBtn,
          width: { xs: "100%", sm: "auto" },
          padding: { xs: "14px 30px", sm: "16px 50px" },
          marginBottom: { xs: "20px", sm: "20px" }
        }}
        size="large"
        onClick={formikRef?.current?.handleSubmit}
        loading={showLoader}
        loadingPosition="start"
        startIcon={<RefreshIcon />}>
        Re-send Email
      </LoadingButton>
      <Typography
        onClick={navigateToLogin}
        sx={{
          ...styles.forgotPassword,
          textAlign: { xs: "center", sm: "left" }
        }}
        variant="c3">
        Back To Login
      </Typography>
    </Box>
  )
}

export default ForgotPassword
