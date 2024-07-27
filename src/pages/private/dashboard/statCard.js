import { Grid } from "@mui/material"
import React from "react"
import { makeStyles } from "tss-react/mui"

const useStyles = makeStyles()(() => ({
  card: {
    padding: 10,
    display: "flex",
    flexDirection: "column",
    borderRadius: 14,
    border: "1px solid #757575",
    boxShadow: "3px 2px 3px 0px rgba(0, 0, 0, 0.16)",
    boxSizing: "border-box",
    width: "270px"
  },
  heading: {
    color: "#757575",
    FontSize: 18,
    fontWeight: 400
  },
  value: {
    color: "#3A4BB6",
    fontSize: 34,
    fontWeight: 700,
    marginTop: 8
  },
  marginLeftCard: {
    //marginLeft: "1.5%",
    paddingLeft: 15
  }
}))
const StatCard = ({ heading, value, nomargin }) => {
  const { classes } = useStyles()

  return (
    <Grid item className={`${classes.card} ${nomargin ? "" : classes.marginLeftCard}`}>
      <span className={classes.heading}>{heading}</span>
      <span className={classes.value}>{value}</span>
    </Grid>
  )
}
export default StatCard
