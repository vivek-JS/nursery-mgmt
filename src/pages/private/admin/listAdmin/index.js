import React, { useState, useEffect } from "react"
import { Grid } from "@mui/material"
import { makeStyles } from "tss-react/mui"
import { getDynamicStyle } from "utils/gridUtils"
import { PageLoader } from "components"
import { NetworkManager, API } from "network/core"

const ListAdmin = () => {
  const [loading, setLoading] = useState(false)
  const [receptionists, setReceptionists] = useState([])

  useEffect(() => {
    const fetchReceptionists = async () => {
      setLoading(true)
      const instance = NetworkManager(API.COMPOUNDER.GET_COMPOUNDER)
      const result = await instance.request({}, {})
      setReceptionists(result?.data.data)
      setLoading(false)
    }

    fetchReceptionists()
  }, [])

  const { classes } = useStyles()

  return (
    <Grid className={classes.container}>
      {loading && <PageLoader />}
      <Grid container justifyContent="space-between">
        <h1 className={classes.header}>Receptionists</h1>
      </Grid>
      <hr />

      <Grid container className={classes.inventoryContainer}>
        <Grid container className={classes.tableHead}>
          <Grid item style={getDynamicStyle(1, 3, 8, true)} className={classes.label}>
            Sr
          </Grid>
          <Grid item style={getDynamicStyle(4, 3, 8, true)} className={classes.label}>
            Email ID
          </Grid>
          <Grid
            item
            style={getDynamicStyle(3, 3, 8, true)}
            className={`${classes.label} ${classes.noMarginRight}`}>
            Mobile Number
          </Grid>
        </Grid>

        {receptionists.map((receptionist, index) => (
          <Grid container className={classes.tableRow} key={receptionist.id}>
            <Grid item style={getDynamicStyle(1, 3, 8, true)} className={classes.tableCell}>
              {index + 1}
            </Grid>
            <Grid item style={getDynamicStyle(4, 3, 8, true)} className={classes.tableCell}>
              {receptionist?.email}
            </Grid>
            <Grid
              item
              style={getDynamicStyle(3, 3, 8, true)}
              className={`${classes.tableCell} ${classes.noMarginRight}`}>
              {receptionist?.mobileNumber}
            </Grid>
          </Grid>
        ))}
      </Grid>
    </Grid>
  )
}

export default ListAdmin

const useStyles = makeStyles()(() => ({
  container: {
    padding: 20
  },
  header: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "16px"
  },
  inventoryContainer: {
    padding: 5,
    background: "#F0F0F0",
    marginTop: 12
  },
  noMarginRight: {
    marginRight: 0
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
    marginRight: "0.7%"
  },
  tableRow: {
    marginTop: 4
  }
}))
