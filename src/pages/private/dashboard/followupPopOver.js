import React from "react"
import { Grid, Popover } from "@mui/material"
import { getDynamicStyle } from "utils/gridUtils"
import { makeStyles } from "tss-react/mui"
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline"
import { AddPatient } from "components"
import { useState } from "react";



const FollowUpPopOver = ({ anchorEl, setAnchorEl, followUpPatientList, date }) => {
  const open = Boolean(anchorEl)
  const handleClose = () => {
    setAnchorEl(null)
  }

  const { classes } = useStyles()
  const [openAddPatient, setOpenAddPatient] = useState(false)
  const [selectedPateint, setSelectedPateint] = useState()
  const handleCloseAddPatient = () => {
    setOpenAddPatient(false)
  }
  const handleOpenAddPatient = (id) => {
    setSelectedPateint(id)
    setOpenAddPatient(true)
  }


  return (
    <Popover
      id={"id"}
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left"
      }}>
      <Grid container className={classes.inventoryContainer}>
        <Grid container className={classes.tableHead}>
          <Grid item style={getDynamicStyle(2, 3, 5, true)} className={classes.label}>
            Patinet Name
          </Grid>
          <Grid item style={getDynamicStyle(2, 3, 5, true)} className={classes.label}>
            Mobile Number
          </Grid>
          <Grid
            item
            style={getDynamicStyle(1, 3, 5, true)}
            className={`${classes.label} ${classes.noMarginRight}`}></Grid>
        </Grid>
        {followUpPatientList?.map((patient) => {

          return (

            <Grid container className={classes.tableRow} key={"index" + 1}>
              <Grid item style={getDynamicStyle(2, 3, 5, true)} className={classes.tableCell}>
                {patient?.name}
              </Grid>
              <Grid item style={getDynamicStyle(2, 3, 5, true)} className={classes.tableCell}>
                {patient?.mobile}
              </Grid>
              <Grid
                onClick={() => handleOpenAddPatient(patient?.patientId)}
                item
                style={getDynamicStyle(1, 3, 5, true)}
                className={`${classes.tableCell} ${classes.noMarginRight}`}>
                <AddCircleOutlineIcon
                  onClick={() => handleOpenAddPatient(patient?.patient_id)}
                  style={{ color: "green", height: 25, cursor: "pointer" }}
                />
              </Grid>
            </Grid>
          )
        })}
      </Grid>{" "}
      {openAddPatient && (
        <AddPatient
          open={openAddPatient}
          patientId={selectedPateint}
          handleClose={handleCloseAddPatient}
          date={date}
        />
      )}{" "}
    </Popover>

  )
}

export default FollowUpPopOver

const useStyles = makeStyles()(() => ({
  inventoryContainer: {
    padding: 5,
    background: "#F0F0F0",
    marginTop: 12,
    width: 540
  },
  noMarginRight: {
    marginRight: 0,
    cursor: "pointer"
  },
  label: {
    height: 35,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 5,
    fontSize: 17,
    fontWeight: 700,
    flexDirection: "column",
    background: "#FFF",
    color: "#3A4BB6",
    marginRight: "0.7%"
  },

  tableHead: {
    boxShadow: "0px 3px 3px 0px rgba(0, 0, 0, 0.15)",
    color: "black",
    background: "#FFF"
  },
  tableCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 5,
    flexDirection: "column",
    background: "#FFF",
    height: 43,
    fontWeight: 500,
    fontSize: 17,
    "&:hover": {
      backgroundColor: "#f0eded"
    },
    "& .MuiFormControl-root": {
      height: "85%",
      "& .MuiInputBase-root": {
        height: "80%",
        display: "flex",
        justifyContent: "center"
      }
    },
    marginRight: "0.7%"
  },
  tableRow: {
    marginTop: 4
  }
}))
