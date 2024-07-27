import React, { useState, useRef, useEffect } from "react"
import moment from "moment"
import { makeStyles } from "tss-react/mui"
import { CheckInModal, PageLoader } from "components"
import TooltipRef from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import "react-confirm-alert/src/react-confirm-alert.css" // Import css
import { confirmAlert } from "react-confirm-alert"
import { Button, Grid } from "@mui/material"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline"
import Prescription from "./Prescription"
import Invoice from "./Invoice"
const NurseCard = ({
  status,
  treatment,
  getAppointments,
  date,
  name,
  time,
  provided,
  patient_id,
  mobile,
  allowref,
  handleOpenAddPatient,
  db_id,
  setOpenDoctorsModal,
  checinModalAfterOut,
  payment_status,
  payment_mode,
  appointmentId,
  amount,
  checkedInPatient,
  userType
}) => {
  const ref = useRef(null)
  const [loading, setLoading] = useState(false)

  const [openCheckin, setOpenCheckin] = useState(false)
  const { classes } = useStyles()
  const handleCloseAddPatient = (e) => {
    e.stopPropagation()
    getAppointments()
    setOpenCheckin(false)
  }
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false)
  const openPrescription = () => {
    setIsPrescriptionOpen(true)
  }

  const closePrescription = () => {
    setIsPrescriptionOpen(false)
  }

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)

  const openInvoice = () => {
    setIsInvoiceOpen(true)
  }
  const closeInvoice = () => {
    setIsInvoiceOpen(false)
  }

  useEffect(() => {
    if (checkedInPatient && userType !== "super admin") {
      if (checkedInPatient?.appointmentId === appointmentId)
        setOpenCheckin(checkedInPatient?.appointmentStatus == 3)
    }
  }, [checkedInPatient])
  useEffect(() => {
    if (time == checinModalAfterOut) {
      setOpenCheckin(true)
    }
  }, [checinModalAfterOut])
  useEffect(() => {
    if (ref) {
      ref.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [ref, date])

  const deleteAppointment = async () => {
    setLoading(true)

    const instance = NetworkManager(API.APPOINTMENT.DELETE_APPOINTMENT)
    const payload = { appointmentId: db_id, date: moment(date).format("YYYY-MM-DD") }
    const result = await instance.request(payload)
    if (result?.code) {
      getAppointments()
      Toast.success("Appointment Cancelled Succesfully.")
    }
    setLoading(false)
  }

  const submit = (id) => {
    confirmAlert({
      customUI: ({ onClose }) => {
        return (
          <div className={`custom-ui ${classes.modal}`}>
            <h1 className={classes.h1Class}>Are you sure?</h1>
            <p className={classes.h2Class}>{`Do you want to delete appointment of ${name} ?`}</p>
            <Button className={classes.cancelBtn} onClick={onClose}>
              No
            </Button>
            <Button
              className={classes.deleteBtn}
              onClick={() => {
                deleteAppointment(id)
                onClose()
              }}>
              Yes
            </Button>
          </div>
        )
      }
    })
  }

  return (
    <>
      {loading && <PageLoader />}

      <div
        style={{
          padding: 10,
          borderRadius: 6,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
          background: "white",
          margin: "0 0 8px 0",
          display: "grid",
          gridGap: 20,
          flexDirection: "column"
        }}
        onClick={() => {
          patient_id ? setOpenCheckin(true) : handleOpenAddPatient(time)
        }}
        ref={provided.innerRef}
        //snapshot={snapshot}
        {...provided.draggableProps}
        {...provided.dragHandleProps}>
        <Grid
          ref={allowref ? ref : null}
          container
          justifyContent="flex-start"
          alignItems="center"
          className={`${classes.nurseCard} ${status === undefined && classes.emptyApointemnt} ${
            moment(`${moment(date).format("MM-DD-YYYY")} ${time}`, "MM-DD-YYYY  HH:mm").isBefore(
              moment()
            ) && classes.missedBg
          }  ${status === 2 && classes.greenBg} ${status === 3 && classes.compltedBg}`}>
          <div className={classes.time}>{moment(time, "HH:mm").format("hh:mm A")}</div>
          <TooltipRef title={name}>
            <Typography noWrap className={name ? classes.name : classes.notAppointed}>
              {name || "Not Appointed"}
            </Typography>
          </TooltipRef>
          {status === 1 && (
            <div className={classes.tickIcon}>
              <CheckCircleRoundedIcon style={{ color: "green", height: 15 }} />
            </div>
          )}
          {status === 3 && !payment_status && (
            <div className={classes.tickIcon}>
              <ErrorOutlineIcon style={{ color: "red", height: 15 }} />
            </div>
          )}
          {patient_id && (
            <div className={classes.deleteIcon}>
              <DeleteOutlineIcon
                onClick={(e) => {
                  submit(db_id)
                  e.stopPropagation()
                }}
              />
            </div>
          )}
        </Grid>
        {openCheckin && (
          <CheckInModal
            Prescriptionpopup={openPrescription}
            Invoicepopup={openInvoice}
            open={openCheckin}
            handleClose={handleCloseAddPatient}
            name={name}
            patient_id={patient_id}
            mobile={mobile}
            date={date}
            time={time}
            status={status}
            setOpenDoctorsModal={setOpenDoctorsModal}
            treatment={treatment}
            payment_status={payment_status}
            payment_mode={payment_mode}
            appointmentId={appointmentId}
            amount={amount}
          />
        )}

        {isPrescriptionOpen && (
          <Prescription
            openPopup={isPrescriptionOpen}
            appointmentId={appointmentId}
            closePopup={closePrescription}
            appointmentDate={date}
            appointmentTime={time}
          />
        )}

        {isInvoiceOpen && (
          <Invoice
            appointmentId={appointmentId}
            patient_id={patient_id}
            openPopup={isInvoiceOpen}
            closePopup={closeInvoice}
            appointmentDate={date}
            appointmentTime={time}
          />
        )}
      </div>
    </>
  )
}
export default NurseCard

const useStyles = makeStyles()(() => ({
  nurseCard: {
    position: "relative",
    height: 40,
    paddingLeft: 8,
    borderRadius: 4,
    border: " 0.5px solid rgba(0, 0, 0, 0.20)",
    background: "#FFFFFF",
    marginTop: 4,
    cursor: "pointer",
    "&:hover div": {
      background: "#3A4BB6",
      color: "#FFFFFF",
      display: "unset !important"
    },
    "&:hover": {
      background: "#3A4BB6",
      color: "#000000",
      fontWeight: "bold"
    }
  },
  time: {
    fontSize: 15,
    fontWeight: 400,
    color: "#838383",
    "&:hover": {
      color: "#000000"
    }
  },
  name: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: 400,
    maxWidth: "75%",
    lineHeight: "unset"
  },
  notAppointed: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: 300,
    maxWidth: "75%"
  },
  greenBg: {
    background: "#90CC6A !important",
    color: "#FFFFFF !important",

    "& div": {
      color: "#FFFFFF !important"
    }
  },
  compltedBg: {
    background: "#F2F7FF",
    color: "#838383"
  },
  missedBg: {
    background: "#F1C8B9",
    color: "#000000"
  },
  emptyApointemnt: {
    background: "#f5f5f5"
  },
  container: {
    padding: 10,
    borderRadius: 6,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
    background: "white",
    margin: "0 0 8px 0",
    display: "grid",
    gridGap: 20,
    flexDirection: "column"
  },
  deleteIcon: {
    position: "absolute",
    right: "5px",
    display: "none",
    "&:hover div": {
      background: "unset !important"
    }
  },
  tickIcon: {
    marginLeft: 4
  },
  h1Class: {
    color: "#3A4BB6",
    marginTop: "unset"
  },
  h2Class: {
    color: "#3A4BB6"
  },
  modal: {
    padding: 16,
    border: "2px solid #3A4BB6",
    borderRadius: 4,
    background: "#FFF"
  },
  cancelBtn: {
    borderRadius: 3,
    border: "0.5px solid #838383",
    width: 118,
    height: 35
  },
  deleteBtn: {
    background: "lightred",
    color: "red",
    marginLeft: 8,
    border: "0.5px solid red",
    width: 118,
    height: 35
  }
}))
