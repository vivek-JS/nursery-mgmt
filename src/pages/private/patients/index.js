import React from "react"
import { Box, Button, Grid } from "@mui/material"
import { makeStyles } from "tss-react/mui"
//import { useState } from "react"
// import { useEffect } from "react"
// import { NetworkManager, API } from "network/core"
// import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf"
//import { useDebounce } from "hooks/utils"
import ButtonGroupToggle from "components/FormField/ToggleBtns"
import { useStyles } from "pages/public/commonStyles"
import AddEmployeeButton from "components/FormField/AddButton"

function Patients() {
  // const [loading, setLoading] = useState(false)
  // const [patientArray, setPatientArray] = useState([])
  //const [searchValue, setSearchValue] = useState("")

  //const debouncedSearch = useDebounce(searchValue, 500)

  // useEffect(() => {
  //   if (debouncedSearch !== undefined) {
  //     getPatients()
  //   }
  // }, [debouncedSearch])

  // const getPatients = async () => {
  //   setLoading(true)
  //   const instance = NetworkManager(API.PATIENT.PATIENT_LIST)
  //   const result = debouncedSearch
  //     ? await instance.request({}, { name: debouncedSearch })
  //     : await instance.request({}, {})
  //   setPatientArray(result?.data.data)

  //   setLoading(false)
  // }
  const { classes } = useStylesLocal()
  const styles = useStyles()

  return (
    <>
      <Grid container className={classes.container}>
        <Grid container className={classes.marginTl}>
          <Grid
            container
            className={styles.header}
            justifyContent={"space-between"}
            alignItems={"center"}>
            <h2>Employeese</h2>
            <AddEmployeeButton />
          </Grid>
          <Box m={1}>
            <ButtonGroupToggle initialSelected={0} onChange={(i) => console.log(i)}>
              <Button color="primary">Lab</Button>
              <Button color="primary">Sales</Button>
              <Button color="primary">Labours</Button>
              <Button color="primary">Management</Button>
              <Button color="primary">other</Button>
            </ButtonGroupToggle>
          </Box>{" "}
        </Grid>
      </Grid>
    </>
  )
}

export default Patients
const useStylesLocal = makeStyles()(() => ({
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
  },
  marginTl: {
    margin: 10
  }
}))
