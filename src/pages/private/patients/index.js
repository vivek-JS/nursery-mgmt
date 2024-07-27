import React from "react"
import { Grid } from "@mui/material"
import { makeStyles } from "tss-react/mui"
import { getDynamicStyle } from "utils/gridUtils"
import { useState } from "react"
import { useEffect } from "react"
import { NetworkManager, API } from "network/core"
// import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf"
import { PageLoader } from "components"
import ReactSearchBox from "react-search-box"
import SearchIcon from "@mui/icons-material/Search"
import { useDebounce } from "hooks/utils"
import { NavLink } from "react-router-dom"
import moment from "moment"

function Patients() {
  const [loading, setLoading] = useState(false)
  const [patientArray, setPatientArray] = useState([])
  const [searchValue, setSearchValue] = useState("")

  const debouncedSearch = useDebounce(searchValue, 500)

  useEffect(() => {
    if (debouncedSearch !== undefined) {
      getPatients()
    }
  }, [debouncedSearch])

  const getPatients = async () => {
    setLoading(true)
    const instance = NetworkManager(API.PATIENT.PATIENT_LIST)
    const result = debouncedSearch
      ? await instance.request({}, { name: debouncedSearch })
      : await instance.request({}, {})
    setPatientArray(result?.data.data)

    setLoading(false)
  }
  const { classes } = useStyles()
  const formatDate = (dateString) => {
    return moment(dateString).format("DD-MM-YYYY")
  }

  return (
    <Grid className={classes.container}>
      {loading && <PageLoader />}
      <Grid container justifyContent={"space-between"}>
        <h1 className={classes.header}>Patients</h1>
      </Grid>
      <Grid container style={{ marginTop: 10 }}>
        <ReactSearchBox
          placeholder="Search Patients"
          value="Doe"
          data={patientArray?.map((patient) => {
            return { value: patient?.name, key: patient.name }
          })}
          leftIcon={<SearchIcon />}
          inputHeight={"32px"}
          onSelect={({ pname }) => setSearchValue(pname?.value)}
          onChange={(value) => setSearchValue(value)}
        />
      </Grid>
      <hr />

      <Grid container className={classes.inventoryContainer}>
        <Grid container className={classes.tableHead}>
          <Grid item style={getDynamicStyle(1, 7, 14, true)} className={classes.label}>
            Sr
          </Grid>
          <Grid item style={getDynamicStyle(3, 7, 14, true)} className={classes.label}>
            Patinet Name
          </Grid>

          <Grid item style={getDynamicStyle(2, 7, 14, true)} className={classes.label}>
            Mobile Number
          </Grid>
          <Grid item style={getDynamicStyle(3, 7, 14, true)} className={classes.label}>
            Address
          </Grid>
          <Grid item style={getDynamicStyle(2, 7, 14, true)} className={classes.label}>
            Date of Birth
          </Grid>
          <Grid item style={getDynamicStyle(2, 7, 14, true)} className={classes.label}>
            Enrolled Date
          </Grid>

          <Grid
            item
            style={getDynamicStyle(1, 7, 14, true)}
            className={`${classes.label} ${classes.noMarginRight}`}>
            View Details
          </Grid>
        </Grid>

        {patientArray?.map((patient, index) => {
          return (
            <Grid container className={classes.tableRow} key={"index" + 1}>
              <Grid
                item
                style={getDynamicStyle(1, 7, 14, true)}
                alignItems="flex-start"
                className={classes.tableCell}>
                {" "}
                {index + 1}
              </Grid>
              <Grid item style={getDynamicStyle(3, 7, 14, true)} className={classes.tableCell}>
                {patient?.name}
              </Grid>
              <Grid item style={getDynamicStyle(2, 7, 14, true)} className={classes.tableCell}>
                {patient?.mobileNumber}
              </Grid>

              <Grid item style={getDynamicStyle(3, 7, 14, true)} className={classes.tableCell}>
                {patient?.address}
              </Grid>

              <Grid item style={getDynamicStyle(2, 7, 14, true)} className={classes.tableCell}>
                {formatDate(patient?.dob)}
              </Grid>

              <Grid item style={getDynamicStyle(2, 7, 14, true)} className={classes.tableCell}>
                {formatDate(patient?.createdAt)}
              </Grid>

              <Grid
                item
                style={getDynamicStyle(1, 7, 14, true)}
                className={`${classes.tableCell} ${classes.noMarginRight}`}>
                {/* <PictureAsPdfIcon style={{ color: "green", height: 35, cursor: "pointer" }} /> */}
                <NavLink to={`/u/patients/patientDetails?patient_id=${patient._id}`}>
                  <button>View</button>
                </NavLink>
              </Grid>
            </Grid>
          )
        })}
      </Grid>
    </Grid>
  )
}

export default Patients
const useStyles = makeStyles()(() => ({
  inventoryContainer: {
    padding: 5,
    background: "#F0F0F0",
    marginTop: 12
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
