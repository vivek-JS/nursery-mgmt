import { Grid } from "@mui/material"
import React, { useEffect, useState } from "react"
import { makeStyles } from "tss-react/mui"
import Add from "assets/icons/add.svg"
import moment from "moment"
import { AddPatient } from "components"
const AppointmentCard = ({ getAppointments, time, dateTime, patientList }) => {
  const { classes } = useStyles()
  const [patient, setPatient] = useState(null)
  const [openAddPatient, setOpenAddPatient] = useState(false)
  // let appointmentTime = moment(dateTime).format()
  useEffect(() => {
    setPatient(patientList?.get(moment(dateTime).format("DD-MM-YYYY") + time))

  }, [patientList])



  const handleCloseAddPatient = () => {
    setOpenAddPatient(false)
    getAppointments()
  }
  const handleOpenAddPatient = () => {
    setOpenAddPatient(true)
  }
  return (
    <>
      <Grid container className={classes.nurseCard}>
        {patient ? (
          <Grid className={classes.cardCOntainerP}>
            <div className={classes.barContainer}>
              <div className={classes.blueBarP}></div>
            </div>
            <Grid item className={classes.pname}>
              {patient?.patient?.name}
            </Grid>
          </Grid>
        ) : (
          <Grid onClick={handleOpenAddPatient} className={classes.cardCOntainer}>
            <div className={classes.barContainer}>
              <div className={classes.blueBar}></div>
              <div className={classes.time}>{time}</div>
            </div>
            <img className={classes.imgClass} src={Add}></img>
          </Grid>
        )}
      </Grid>

      {openAddPatient && (
        <AddPatient
          timeToAdd={moment(time, "hh:mm A").format("HH:mm")}
          date={moment(dateTime).toDate()}
          open={openAddPatient}
          patientId={-1}
          handleClose={handleCloseAddPatient}
        />
      )}
    </>
  )
}
export default AppointmentCard
const useStyles = makeStyles()(() => ({
  nurseCard: {
    height: "95%",
    flexDirection: "column",
    justifyContent: "center"
  },
  patientCount: {
    opacity: 1,
    background: "gary",
    "&:hover": {
      opacity: 1,
      transition: "0.5s"
      // background: "gary",
    }
  },
  blueBar: {
    width: 1.9,
    background: "rgba(58, 75, 182, 0.50)",
    height: "100%"
  },
  blueBarP: {
    width: 1.9,
    background: "#3A4BB6",
    height: "100%"
  },
  imgClass: {
    width: 13,
    height: 13,
    marginRight: 10
  },
  cardCOntainer: {
    width: "100%",
    display: "flex",
    height: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    opacity: 0,
    cursor: "pointer",
    "&:hover": {
      opacity: 1,
      transition: "0.5s"
      // background: "gary",
    }
  },
  cardCOntainerP: {
    width: "100%",
    display: "flex",
    height: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
    background: "#DDDDE8"
  },
  time: {
    color: "#757575",
    fontSize: 8,
    fontWeight: 700,
    marginLeft: 9
  },
  barContainer: {
    height: "100%",
    display: "flex",
    alignItems: "center"
  },
  pname: {
    fontSize: 12,
    fontWeight: 500,
    marginLeft: 6
  }
}))
