import { Grid } from "@mui/material"
import React from "react"
import { makeStyles } from "tss-react/mui"

const useStyles = makeStyles()(() => ({
  card: {
    display: "flex",
    flexDirection: "column",
    padding: "6px 4px",
    flexdirection: "column",
    alignitems: "center",
    borderRight: "1px solid #BDBDBD"
  },
  heading: {
    color: "#757575",
    fontfamily: "Montserrat",
    FontSize: 20,
    fontStyle: "normal",
    fontWeight: 400,
    lineHeight: "normal",
    textAlign: "center"
  },
  value: {
    color: "#272727",
    fontfamily: "Montserrat",
    fontSize: 20,
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "normal",
    textAlign: "center"
  },
  marginLeftCard: {
    //marginLeft: "1.5%",
    paddingLeft: 10
  }
}))
const NewStatCard = ({ heading, value, nomargin }) => {
  const { classes } = useStyles()

  return (
    <Grid item xs={3} className={`${classes.card} ${nomargin ? "" : classes.marginLeftCard}`}>
      <span className={classes.heading}>{heading}</span>
      <span className={classes.value}>{value}</span>
    </Grid>
  )
}
export default NewStatCard
