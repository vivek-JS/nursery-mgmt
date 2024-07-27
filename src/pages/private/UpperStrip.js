import React, { useState } from "react"
import { Grid, Button } from "@mui/material"
import { SearchInput, AddButton, AddPatient } from "components"
import { makeStyles } from "tss-react/mui"
import RefreshIcon from '@mui/icons-material/Refresh';


// import notificationIcon from "assets/icons/Notification.svg"
// import profileIcon from "assets/icons/profileIcon.svg"

function UperStrip({ date, setSearch, search, getAppointments }) {
  const { classes } = useStyles()
  const [openAddPatient, setOpenAddPatient] = useState(false)

  const handleOpenAddPatient = () => {
    setOpenAddPatient(true)
  }

  const handleCloseAddPatient = () => {
    setOpenAddPatient(false)
    getAppointments()
  }
  return (
    <Grid container>
      <Grid
        className={classes.searchContainer}
        container
        alignItems="center"
        justifyContent="space-between">
        <Grid item className={classes.flexDisplay}>
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
            }}
            setSearch={setSearch}
            label="Find Patient"
          />
          <Grid className={classes.btnContainer}>
            <AddButton onClick={handleOpenAddPatient}></AddButton>
          </Grid>

          <Grid className={classes.btnContainer}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={getAppointments}
              className={classes.refreshButton}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
        {/* <Grid item className={classes.flexDisplay}>
          <img src={notificationIcon} />
          <img className={classes.btnContainer} src={profileIcon} />
        </Grid> */}
      </Grid>
      {openAddPatient && <AddPatient date={date} open={openAddPatient} patientId={-1} handleClose={handleCloseAddPatient} />}
    </Grid>
  )
}

export default UperStrip
const useStyles = makeStyles()(() => ({
  searchContainer: {
    boxShadow: " 0px 4px 5px 0px rgba(0, 0, 0, 0.10)",
    paddingBottom: 12,
    marginTop: -12
  },
  btnContainer: {
    marginLeft: 15
  },
  refreshButton: {
    backgroundColor: '#3A4BB6',
    color: '#FFFFFF',
    '&:hover': {
      backgroundColor: '#2A3BA6',
    },
  },
  flexDisplay: {
    display: "flex",
    marginLeft: 10
  },
  container: {
    padding: "11px 21px 11px 70px"
  },
  statsContainer: {
    marginTop: 24,
    marginLeft: 16
  },
  listandgraphcontainer: {
    marginTop: 16,
    height: "70vh"
  },
  listContainer: {},
  graphscontainer: {
    paddingLeft: "4%"
  },
  nurseListHeader: {
    padding: "20px 10px 10px 10px"
  },
  todayTxt: {
    fontSize: 20,
    fontWeight: 700
  },
  calender: {
    color: "#4E43D6",
    fontSize: "16px",
    fontWeight: "400"
  },
  nurseListContainer: {
    background: "#E4E5E7",
    height: "62vh",
    padding: 4,
    paddingTop: "unset",
    overflow: "overlay"
  },
  graphs: {
    background: "#E4E5E7",
    width: "100%",
    height: "100%",
    padding: 6,
    borderRadius: 6
  },
  graphOne: {
    background: "#FFFFFF",
    height: "49.5%"
  },
  graphTwo: {
    background: "#FFFFFF",
    height: "49.5%"
  },
  multiSelect: {
    backgroundColor: "#EEEEEE",
    borderRadius: 4,
    width: 180,
    marginRight: 10,
    marginLeft: 10,
    height: "45px !important"
  }
}))
