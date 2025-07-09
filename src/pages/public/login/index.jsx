import React from "react"
import { Typography, Grid, Divider, Box, Button } from "@mui/material"
import { Formik } from "formik"
import { useStyles } from "../commonStyles"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import { LoginValidator } from "helpers/validators/login"
import { useLoginController } from "./login.controller"
import FormField from "components/FormField"
//import { GoogleLogin, FacebookLogin } from "library/SocialLogin"
import peLogo from "assets/icons/ramLogo.png"
import SideBanner from "assets/icons/ramInner.png"

const Login = () => {
  const styles = useStyles()

  const {
    showPassword,
    togglePasswordVisiblity,
    handleLogin,
    navigateToForgotPassword,
    errorMessage
    //navigateToSignUp
  } = useLoginController()

  return (
    <Grid container>
      <Grid item xs={5}>
        <Box sx={styles.container}>
          <Grid container alignItems={"center"}>
            <img src={peLogo} style={styles.imgLogo}></img>
            <Typography style={styles.drawerHeaderTxt}>Nursery Management Reimagined</Typography>
          </Grid>
          <Grid sx={styles.form} container spacing={2}>
            <Divider />
            <Formik
              validateOnMount
              initialValues={LoginValidator.initialValues}
              validationSchema={LoginValidator.validationSchema}
              onSubmit={(values) => {
                console.log("🔐 Form submitted")
                return handleLogin(values)
              }}>
              {(formik) => (
                <React.Fragment>
                  <Grid item xs={12}>
                    <FormField
                      label={"Phone Number"}
                      placeholder="Enter Your Mobile Number"
                      formik={formik}
                      name={"phoneNumber"}
                      required
                      type={"phoneNumber"}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormField
                      label={"Password"}
                      placeholder="Enter Your Password"
                      formik={formik}
                      name={"password"}
                      required
                      type={showPassword ? "text" : "password"}
                      showPassword={showPassword}
                      togglePasswordVisiblity={togglePasswordVisiblity}
                    />
                  </Grid>

                  {errorMessage && (
                    <Grid item xs={12}>
                      <Typography
                        sx={{
                          color: "error.main",
                          textAlign: "center",
                          fontSize: "14px",
                          marginBottom: "10px"
                        }}
                        variant="body2">
                        {errorMessage}
                      </Typography>
                    </Grid>
                  )}
                  <Grid sx={styles.buttonContainer} item xs={12}>
                    <Button
                      type="submit"
                      disabled={!formik.isValid}
                      variant="contained"
                      sx={styles.submitBtn}
                      size="large"
                      onClick={formik.handleSubmit}
                      startIcon={<LockOpenIcon />}>
                      Sign In
                    </Button>
                    <Typography
                      onClick={navigateToForgotPassword}
                      sx={styles.forgotPassword}
                      variant="c3">
                      Forgot Password?
                    </Typography>
                    <Typography
                      onClick={() => {
                        console.log("🔍 Debug: Current auth state")
                        console.log("🔍 Debug: Local Storage", localStorage)
                        console.log("🔍 Debug: Local Storage", localStorage)
                        console.log("🔍 Debug: Session Storage", sessionStorage)
                        console.log(
                          "🔍 Debug: Redux State",
                          window.__REDUX_DEVTOOLS_EXTENSION__?.connect().init()
                        )
                      }}
                      sx={{
                        ...styles.forgotPassword,
                        cursor: "pointer",
                        fontSize: "12px",
                        marginTop: "10px"
                      }}
                      variant="c3">
                      Debug Info
                    </Typography>
                    <Typography
                      onClick={() => {
                        console.log("🚪 Force logout")
                        // Clear all storage
                        localStorage.clear()
                        sessionStorage.clear()
                        // Clear localStorage
                        localStorage.clear()
                        // Force reload
                        window.location.reload()
                      }}
                      sx={{
                        ...styles.forgotPassword,
                        cursor: "pointer",
                        fontSize: "12px",
                        marginTop: "5px",
                        color: "error.main"
                      }}
                      variant="c3">
                      Force Logout
                    </Typography>
                  </Grid>
                  {/* <Grid item xs={12}>
                <Typography onClick={navigateToSignUp} sx={styles.forgotPassword} variant="c3">
                  Create a new account!
                </Typography>
              </Grid> */}
                </React.Fragment>
              )}
            </Formik>
          </Grid>
          {/* <Grid container>
        <Grid container alignItems="center" justifyContent="center">
          <Typography sx={styles.topLabel} variant="subtitle" textAlign="center" color="main">
            OR
          </Typography>
        </Grid>
        <Grid item md={6}>
          <GoogleLogin />
        </Grid>
        <Grid item md={6}>
          <FacebookLogin />
        </Grid>
      </Grid> */}
        </Box>
      </Grid>
      <Grid item xs={7} container justifyContent={"center"} alignItems={"center"}>
        <img
          src={SideBanner}
          style={{ width: "80%", height: "100vh", objectFit: "cover", borderRadius: "30px" }}></img>
      </Grid>
    </Grid>
  )
}

export default Login
