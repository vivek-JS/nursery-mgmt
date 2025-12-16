import React from "react"
import { Typography, Grid, Divider, Box } from "@mui/material"
import { Formik } from "formik"
import { useStyles } from "../commonStyles"
import { LoadingButton } from "@mui/lab"
import LockResetIcon from "@mui/icons-material/LockReset"
import { RPValidator } from "helpers/validators/forgotPassword"
import FormField from "components/FormField"
import { useResetPasswordController } from "./reset-password.controller"

function ResetPassword() {
  const styles = useStyles()

  const {
    resetPassword,
    showLoader,
    togglePasswordVisiblity,
    navigateToLogin,
    showPassword,
    formikRef,
    showConfirmPassword,
    toggleConfirmPasswordVisiblity
  } = useResetPasswordController()

  return (
    <Box
      sx={{
        ...styles.container,
        maxWidth: { xs: "100%", sm: "90%", md: "66%" },
        padding: { xs: "20px", sm: "30px", md: "40px" },
        height: { xs: "auto", sm: "100vh" },
        minHeight: { xs: "100vh", sm: "auto" },
        marginTop: { xs: "20px", sm: "0" },
        marginBottom: { xs: "20px", sm: "0" }
      }}>
      <Typography
        align="left"
        variant="h3"
        sx={{
          fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
          marginBottom: { xs: "20px", sm: "30px" }
        }}>
        Set Your Password
      </Typography>
      <Grid sx={styles.form} container spacing={2}>
        <Divider />
        <Formik
          innerRef={formikRef}
          initialValues={RPValidator.initialValues}
          onSubmit={resetPassword}>
          {(formik) => (
            <React.Fragment>
              <Grid item xs={12}>
                <FormField
                  label={"New Password"}
                  placeholder="Enter Your New Password"
                  formik={formik}
                  name={"password"}
                  required
                  type={showPassword ? "text" : "password"}
                  showPassword={showPassword}
                  togglePasswordVisiblity={togglePasswordVisiblity}
                />
              </Grid>
              <Grid item xs={12}>
                <FormField
                  label={"Confirm New Password"}
                  placeholder="Confirm New Password"
                  formik={formik}
                  name={"confirmPassword"}
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  showPassword={showConfirmPassword}
                  togglePasswordVisiblity={toggleConfirmPasswordVisiblity}
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
                  disabled={showLoader}
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
                  Set Password
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
    </Box>
  )
}

export default ResetPassword
