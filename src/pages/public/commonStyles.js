import { useTheme } from "@mui/system"
import SideBanner from "assets/images/placeholders/onboarding.svg"

export const useStyles = () => {
  const theme = useTheme()
  return {
    imgLogo: {
      height: 60,
      weight: 60
    },
    flexDisplay: {
      display: "flex",
      alignItems: "center"
    },
    nameTxt: {},
    container: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "center",
      margin: "auto",
      height: "100vh",
      maxWidth: "66%"
    },
    signupContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "center",
      margin: "auto",
      height: "100vh",
      maxWidth: "66%",
      marginTop: "100px"
    },
    headerContainer: {
      position: "relative"
    },
    backIcon: {
      position: "absolute",
      left: "-23%",
      top: "23%",
      color: `rgba(0, 0, 0, 0.54)`,
      backgroundColor: `rgba(0, 0, 0, 0.14)`
    },
    form: {
      textAlign: "center"
    },
    formField: {
      width: "100%"
    },
    topLabel: {
      color: theme.palette.text.secondary,
      marginBottom: "20px",
      marginTop: "20px"
    },
    label: {
      marginTop: "2vh",
      color: "#444444",
      fontSize: "16px",
      fontStyle: "normal",
      fontWeight: " 600",
      lineHeight: " 24px",
      letterSpacing: "0.5px",
      textAlign: "left"
    },
    buttonContainer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "2.6vh"
    },
    submitBtn: {
      padding: "16px 50px"
    },
    resendBtn: {
      padding: "16px 50px",
      marginBottom: "20px"
    },
    button: {
      fontWeight: 700,
      color: theme.palette.text.white,
      background: theme.palette.primary.main,
      height: "52px",
      width: "157px",
      marginTop: "30px"
    },
    forgotPassword: {
      "&:hover": {
        color: theme.palette.primary.main,
        cursor: "pointer"
      }
    },
    loader: {
      padding: "0px 15px 1px 16px",
      color: theme.palette.text.white
    },
    userimg: {
      height: "150px",
      width: "150px",
      borderRadius: "50%",
      marginLeft: "1rem"
    },
    imgBox: {
      display: "flex",
      alignItems: "center",
      flexDirection: "column"
    },
    fileUpload: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "left",
      marginTop: "-0.7rem",
      marginBottom: "1rem"
    },
    fileButton: {
      marginTop: "1rem",
      width: "150px",
      marginLeft: "2rem"
    },
    textbox: {
      textAlign: "left"
    },
    errorBox: {
      height: "16px"
    },
    errorText: {
      color: theme.palette.error.main,
      fontWeight: 400
    },
    drawerHeader: {
      color: "#40A082",
      fontSize: "2.5rem",
      fontWeight: 900,
      marginTop: 10,
      marginLeft: 4
    },
    drawerHeaderTxt: {
      fontSize: "2rem",
      fontWeight: 500,
      marginLeft: 8
    },
    imageContainer: {
      background: `url(${SideBanner})`,
      backgroundSize: "cover",
      height: "100vh"
    },
    header: {}
  }
}
