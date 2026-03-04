import React, { useEffect } from "react"
import { Typography, Grid, Divider, Box, Button } from "@mui/material"
import { Formik } from "formik"
import { useStyles } from "../commonStyles"
import { LoadingButton } from "@mui/lab"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import { LoginValidator } from "helpers/validators/login"
import { useLoginController } from "./login.controller"
import FormField from "components/FormField"
import PasswordChangeModal from "components/Modals/PasswordChangeModal"
import MotivationalQuoteModal from "components/Modals/MotivationalQuoteModal"
//import { GoogleLogin, FacebookLogin } from "library/SocialLogin"
import peLogo from "assets/icons/ramLogo.png"
import SideBanner from "assets/icons/ramInner.png"
import { useDispatch } from "react-redux"
import { loaderSlice } from "redux/slices/loaderSlice"

const Login = () => {
  const styles = useStyles()
  const dispatch = useDispatch()

  const {
    showLoader,
    showPassword,
    showPasswordChangeModal,
    setShowPasswordChangeModal,
    showQuoteModal,
    quote,
    togglePasswordVisiblity,
    handleLogin,
    handlePasswordChangeSuccess,
    handleModalClose,
    handleQuoteModalClose,
    navigateToForgotPassword,
    openPasswordResetModal,
    loginResponse
    //navigateToSignUp
  } = useLoginController()

  // Ensure global loader is hidden when login component mounts
  useEffect(() => {
    dispatch(loaderSlice.actions.hide())
  }, [dispatch])

  return (
    <>
      <Grid container>
        <Grid item xs={12} md={5}>
          <Box
            sx={{
              ...styles.container,
              maxWidth: { xs: "100%", sm: "90%", md: "66%" },
              padding: { xs: "20px", sm: "30px", md: "40px" },
              height: { xs: "auto", sm: "auto", md: "100vh" },
              minHeight: { xs: "100vh", sm: "100vh", md: "auto" },
              marginTop: { xs: "0", sm: "0", md: "0" },
              marginBottom: { xs: "20px", sm: "0", md: "0" },
              justifyContent: { xs: "flex-start", md: "center" },
              paddingTop: { xs: "40px", sm: "60px", md: "0" }
            }}>
            <Grid
              container
              alignItems={"center"}
              sx={{
                marginBottom: { xs: "30px", sm: "40px", md: "40px" },
                flexWrap: { xs: "wrap", sm: "nowrap" },
                justifyContent: { xs: "center", sm: "flex-start" }
              }}>
              <Box
                component="img"
                src={peLogo}
                alt="Logo"
                sx={{
                  height: { xs: 50, sm: 55, md: 60 },
                  width: { xs: 50, sm: 55, md: 60 }
                }}
              />
              <Typography
                sx={{
                  ...styles.drawerHeaderTxt,
                  fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
                  marginLeft: { xs: "8px", sm: "12px", md: "8px" },
                  textAlign: { xs: "center", sm: "left" },
                  width: { xs: "100%", sm: "auto" },
                  marginTop: { xs: "8px", sm: "0" }
                }}>
                Nursery Management Reimagined
              </Typography>
            </Grid>
            <Grid sx={styles.form} container spacing={{ xs: 2, sm: 2, md: 2 }}>
              <Divider sx={{ width: "100%", marginBottom: { xs: "10px", md: "0" } }} />
              <Formik
                validateOnMount
                initialValues={LoginValidator.initialValues}
                validationSchema={LoginValidator.validationSchema}
                onSubmit={handleLogin}>
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

                    <Grid
                      sx={{
                        ...styles.buttonContainer,
                        flexDirection: { xs: "column", sm: "column", md: "row" },
                        alignItems: { xs: "stretch", sm: "stretch", md: "center" },
                        marginTop: { xs: "20px", sm: "24px", md: "2.6vh" }
                      }}
                      item
                      xs={12}>
                      <LoadingButton
                        type="submit"
                        disabled={!formik.isValid || showLoader}
                        variant="contained"
                        sx={{
                          ...styles.submitBtn,
                          padding: { xs: "14px 24px", sm: "16px 40px", md: "16px 50px" },
                          width: { xs: "100%", sm: "100%", md: "auto" },
                          fontSize: { xs: "0.875rem", sm: "1rem", md: "1rem" }
                        }}
                        size="large"
                        onClick={formik.handleSubmit}
                        loading={showLoader}
                        loadingPosition="start"
                        startIcon={<LockOpenIcon />}>
                        Sign In
                      </LoadingButton>

                      {/* Manual Reset Password Button */}
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={openPasswordResetModal}
                        sx={{
                          mt: { xs: 2, md: 2 },
                          mb: { xs: 1, md: 1 },
                          width: "100%",
                          borderColor: "#1976d2",
                          color: "#1976d2",
                          padding: { xs: "12px 24px", sm: "14px 32px", md: "14px 32px" },
                          fontSize: { xs: "0.875rem", sm: "1rem", md: "1rem" },
                          "&:hover": {
                            borderColor: "#1565c0",
                            backgroundColor: "rgba(25, 118, 210, 0.04)"
                          }
                        }}>
                        Reset Password
                      </Button>

                      <Typography
                        onClick={navigateToForgotPassword}
                        sx={{
                          ...styles.forgotPassword,
                          marginTop: { xs: "12px", md: "8px" },
                          fontSize: { xs: "0.875rem", sm: "0.9375rem", md: "1rem" },
                          textAlign: { xs: "center", sm: "center", md: "left" },
                          cursor: "pointer"
                        }}
                        variant="c3">
                        Forgot Password?
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
        <Grid
          item
          xs={0}
          md={7}
          sx={{ display: { xs: "none", md: "flex" } }}
          container
          justifyContent={"center"}
          alignItems={"center"}>
          <img
            src={SideBanner}
            style={{
              width: "80%",
              height: "100vh",
              objectFit: "cover"
            }}
            alt="Banner"
          />
        </Grid>
      </Grid>

      <PasswordChangeModal
        open={showPasswordChangeModal}
        onClose={handleModalClose}
        onSuccess={handlePasswordChangeSuccess}
        loginResponse={loginResponse}
      />

      <MotivationalQuoteModal
        open={showQuoteModal}
        onClose={handleQuoteModalClose}
        quote={quote}
      />
    </>
  )
}

export default Login
