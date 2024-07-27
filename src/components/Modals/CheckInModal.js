import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import Slide from "@mui/material/Slide"
import { makeStyles } from "tss-react/mui"
import { Grid } from "@mui/material"
import patient from "assets/icons/patient_logo.svg"
import call_logo from "assets/icons/call_logo.svg"
import Box from "@mui/material/Box"
import Stepper from "@mui/material/Stepper"
import Step from "@mui/material/Step"
import StepLabel from "@mui/material/StepLabel"
import StepConnector, { stepConnectorClasses } from "@mui/material/StepConnector"
import { styled } from "@mui/material/styles"
import TooltipRef from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import { NetworkManager, API } from "network/core"
import { PageLoader } from "components"
import Chip from "@mui/material/Chip"
import { Toast } from "helpers/toasts/toastHelper"
import { GET_API_DATE } from "utils/dateUtils"
import { useSelector } from "react-redux"
//import calendarIcon from "assets/icons/calendar.svg"
const steps = [
  { label: "Appointed", value: 0 },
  { label: "In Waitning", value: 1 },

  { label: "Check In", value: 2 },
  { label: "Exit", value: 3 }
]
const QontoConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 10,
    left: "calc(-50% + 12px)",
    right: "calc(50% + 12px)"
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: "#4E43D6"
    }
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: "#838383"
    }
  },
  [`& .${stepConnectorClasses.line}`]: {
    borderColor: theme.palette.mode === "dark" ? "#838383" : "#838383",
    borderTopWidth: 3,
    borderRadius: 1
  }
}))
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="right" ref={ref} {...props} />
})
// const ONLY_CHAR_REGEX = /^[a-zA-Z_ ]+$/

const CheckInModal = ({
  status,
  date,
  time,
  open,
  handleClose,
  name,
  // patient_id,
  mobile,
  treatment,
  payment_status,
  payment_mode,
  Prescriptionpopup,
  Invoicepopup,
  appointmentId,
  amount
}) => {
  const { classes } = useStyles()

  const userType = useSelector((state) => state?.userData?.userData?.type)

  const [showPaymentMode, setShowPaymentMode] = useState(false)
  const [loading, setLoading] = useState(false)
  //const [appointmentStatus, setAppointmentStatus] = useState(status)
  const [appointmentData, setAppointmentData] = useState({})
  useEffect(() => {
    getAppointments()
  }, [])

  const getAppointments = async () => {
    setLoading(true)
    const instance = NetworkManager(API.APPOINTMENT.APPOINTMENT_LIST)
    const result = await instance.request({}, { appointmentId: appointmentId })
    setAppointmentData(result?.data?.data)
    //sending stats

    setLoading(false)
  }
  const changeStatus = async (e, value) => {
    if (status === value) {
      return
    }
    setLoading(true)
    const instance = NetworkManager(API.APPOINTMENT.CHANGE_STATUS)
    //const user = await instance.request()
    const result = await instance.request(
      { appointmentId: appointmentId, appointmentStatus: value },
      []
    )
    if (result) {
      setLoading(false)

      handleClose(e)

      // if (value === 2) {
      //   setOpenDoctorsModal(true)
      // }
    }

    setLoading(false)
  }
  const updatePaymentStatus = async (status, mode, e) => {
    setLoading(true)
    const instance = NetworkManager(API.APPOINTMENT.CHANGE_STATUS)
    //const user = await instance.request()
    const result = await instance.request({
      date: GET_API_DATE(date),
      appointmentId,
      time,
      paymentStatus: status,
      paymentMode: mode,
      amount
    })
    if (result) {
      setLoading(false)
      Toast.success("Payment updated succesfullt")
      handleClose(e)

      // if (value === 2) {
      //   setOpenDoctorsModal(true)
      // }
    }

    setLoading(false)
  }

  // const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false)
  // const openModal = () => {
  //   setIsPrescriptionOpen(true)
  // }

  return (
    <Dialog
      PaperProps={{
        sx: { width: 325, maxHeight: "650px", padding: "30px 15px", borderRadius: 2.5 }
      }}
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      classes={{
        root: {
          // width: 700,
          // height: 700
          borderRadius: 10
        }
      }}
      aria-describedby="alert-dialog-slide-description">
      {appointmentData?.status == 3 && treatment?.amt > 0 && (
        <Grid className={classes.chip}>
          <Chip
            label={payment_status ? `PAID ₹ ${treatment?.amt} ${payment_mode}` : "UN-PAID"}
            color={"success"}
            style={!payment_status ? { backgroundColor: "red", color: "#FFFFFF" } : {}}
          />
        </Grid>
      )}
      <DialogContent>
        {loading && <PageLoader />}

        <Grid container spacing={2}>
          <Grid container item>
            <img src={patient}></img>
            <Grid container alignItems="center" className={classes.namespam}>
              <TooltipRef title={name}>
                <Typography noWrap className={classes.name}>
                  {name}
                </Typography>
              </TooltipRef>
            </Grid>
          </Grid>
          {/* <Grid container item>
            <img style={{ visibility: "hidden" }} src={patient}></img>
            <Grid container alignItems="center" className={classes.namespam}>
              {patient_id || "New Patient"}
            </Grid>
          </Grid> */}
          <Grid container item>
            <img src={call_logo}></img>
            <Grid container alignItems="center" className={classes.namespam}>
              {mobile}
            </Grid>
          </Grid>
        </Grid>
        <Grid className={classes.steperContrainer}>
          <Grid container justifyContent="center" alignItems="center" className={classes.statusBar}>
            Status Bar
          </Grid>
          <Grid container className={classes.stepeer}>
            <Box sx={{ width: "100%" }}>
              <Stepper activeStep={status} alternativeLabel connector={<QontoConnector />}>
                {steps?.map((step) => (
                  <Step key={step.label}>
                    <StepLabel
                      style={payment_status ? { pointerEvents: "none" } : { cursor: "pointer" }}
                      onClick={(e) => changeStatus(e, step.value)}>
                      {step.label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      {appointmentData?.status == 3 && userType === "compounder" && (
        <Grid className={classes.presContainer} onMouseLeave={() => setShowPaymentMode(false)}>
          {!payment_status && (
            <Grid
              onMouseEnter={() => {
                setShowPaymentMode(true)
              }}
              container
              className={classes.paymentContainer}
              justifyContent={"space-between"}>
              {!showPaymentMode && (
                <Button className={classes.collect}>{`Collect Payment of ₹ ${
                  appointmentData?.treatment?.amount || ""
                }`}</Button>
              )}

              {showPaymentMode && (
                <Grid container justifyContent={"space-between"}>
                  <Grid item className={classes.wd95}>
                    <Button
                      className={`${classes.cancel}`}
                      onClick={(e) => updatePaymentStatus(true, "by_upi", e)}>
                      By UPI
                    </Button>
                  </Grid>
                  <Grid item className={classes.wd95}>
                    <Button
                      className={`${classes.cancel} `}
                      onClick={(e) => updatePaymentStatus(true, "by_cash", e)}>
                      By Cash
                    </Button>
                  </Grid>
                </Grid>
              )}
            </Grid>
          )}
          {appointmentData?.status == 3 && (
            <Grid container>
              <Button
                className={`${classes.cancel} ${classes.mgTp}`}
                //  onClick={() => openPdf(instance)}
                //onClick={() => openPdf(instance)}
                onClick={Invoicepopup}>
                Invoice Details
              </Button>
            </Grid>
          )}
          <Grid container>
            <Button onClick={Prescriptionpopup} className={`${classes.cancel} ${classes.mgTp}`}>
              View Prescription
            </Button>
          </Grid>
        </Grid>
      )}
    </Dialog>
  )
}
export default CheckInModal
const useStyles = makeStyles()(() => ({
  DialogActions: {
    boxSizing: "border-box",
    height: 90,
    marginTop: -10,
    display: "flex",
    justifyContent: "space-between"
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  hr: {
    border: "1px solid #3A4BB6"
  },
  form: {
    marginTop: 24
  },
  txt: {
    fontSize: 16,
    fontWeight: 600
  },
  agree: {
    borderRadius: 5,
    background: "#4E43D6",
    color: "#FFFFFF",
    fontWeight: 600,
    fontSize: 16
  },
  idDiv: {
    background: "linear-gradient(90deg, #F23A41 0%, #6E3AA8 100%)",
    border: "1px solid #FFF",
    borderRadius: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 32,
    color: "#FFFFFF"
  },
  multiSelect: {
    backgroundColor: "#EEEEEE",
    borderRadius: 4,
    width: 180,
    marginRight: 10,
    marginLeft: 10,
    height: "45px !important"
  },
  namespam: {
    width: 225,
    borderRadius: 5,
    border: "0.5px solid #BDBDBD",
    height: 30,
    boxSizing: "border-box",
    marginLeft: 13,
    fontWeight: 500,
    fontSize: 16,
    paddingLeft: 4
  },
  name: {
    fontWeight: 500,
    fontSize: 16,
    width: "95%"
  },
  statusBar: {
    fontWeight: 500,
    fontSize: 10,
    borderBottom: "0.5px solid #BDBDBD",
    marginTop: 25,
    paddingBottom: 5
  },
  stepeer: {
    marginTop: 10
  },
  steperContrainer: {
    paddingBottom: 7,
    borderBottom: "0.5px solid #BDBDBD"
  },
  cancel: {
    width: "100%",
    color: "#3A4BB6",
    border: "1.5px solid #3A4BB6",
    height: 40
  },
  collect: {
    width: "100%",
    color: "#FFFFFF",
    border: "1.5px solid #3A4BB6",
    height: 40,
    background: "#3A4BB6",
    transition: "width 2s"
  },
  prescription: {},
  presContainer: {
    padding: 8,
    marginTop: -14
  },
  mgTp: {
    marginTop: 5
  },
  paymentContainer: {
    "& .displayToggle": {
      display: "unset"
    },
    "&:hover": {
      "& .collect": {
        display: "none"
      },
      "& .displayToggle": {
        display: "unset"
      }
    }
  },
  displayToggle: {
    display: "none"
  },
  wd95: {
    width: "49%"
  },
  chip: {
    position: "absolute",
    top: 7,
    right: 8
  }
}))
