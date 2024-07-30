import React from "react"
import { Box, Button, Grid } from "@mui/material"
import { makeStyles } from "tss-react/mui"
import { useStyles } from "pages/public/commonStyles"

import "react-confirm-alert/src/react-confirm-alert.css" // Import css
import ButtonGroupToggle from "components/FormField/ToggleBtns"
import TagsInput from "components/Modals/TagsInput"
function Cms() {
  const { classes } = useStylesLocal()
  const styles = useStyles()

  //   const [value, setValue] = useState()
  //   const changeValue = (e, v) => {
  //     if (v !== null) setValue(v)
  //   }

  return (
    <>
      <Grid container className={classes.container}>
        <Grid container className={classes.marginTl}>
          <Grid container className={styles.header}>
            <h2>Content Management System</h2>
          </Grid>
          <Box m={1}>
            <ButtonGroupToggle initialSelected={0} onChange={(i) => console.log(i)}>
              <Button color="primary">Haedening</Button>
              <Button color="primary">Labs</Button>
              <Button color="primary">Address</Button>
              <Button color="primary">Vheicals</Button>
              <Button color="primary">other</Button>
            </ButtonGroupToggle>
            <TagsInput tag_title={"Address"} />
          </Box>{" "}
        </Grid>
      </Grid>
    </>
  )
}

export default Cms
const useStylesLocal = makeStyles()(() => ({
  searchContainer: {
    boxShadow: " 0px 4px 5px 0px rgba(0, 0, 0, 0.10)",
    paddingBottom: 12
  },

  flexDisplay: {
    display: "flex"
  },
  container: {
    //padding: "0px 0px 0px 26px"
  },
  statsContainer: {
    marginTop: 24,
    marginLeft: 16
  },
  listandgraphcontainer: {
    marginTop: 16,
    height: "85vh",
    marginLeft: 16
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
    height: "75vh",
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
  },
  addEditBtn: {
    height: 30,
    width: 240,
    display: "flex",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 19,
    fontWeight: 500,
    color: "#3A4BB6",
    cursor: "pointer",
    border: "1px solid #BDBDBD",
    marginLeft: 12
  },
  inventoryContainer: {
    padding: 5,
    background: "#F0F0F0",
    marginTop: 12
  },
  label: {
    height: 35,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 5,
    fontSize: 17,
    fontWeight: 700,
    flexDirection: "column",
    background: "#FFF",
    color: "#3A4BB6"
  },
  marginTl: {
    margin: 10
  },
  tableHead: {
    boxShadow: "0px 3px 3px 0px rgba(0, 0, 0, 0.15)",
    color: "black"
  },
  tableCell: {
    display: "flex",
    alignItems: "flex-start",
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
    }
  },
  tableRow: {
    marginTop: 4
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
    border: "0.5px solid #838383",
    width: 118,
    height: 35
  },
  btnContainer: {
    marginTop: 18
  },
  solidBtn: {
    background: "#3A4BB6",
    color: "#FFF",
    borderRadius: 3,
    marginLeft: 8,
    width: 118,
    height: 35,
    "&:hover": {
      backgroundColor: "#8F88E5 !important",
      borderColor: "#d8dcf3",
      boxShadow: "none"
    }
  },
  whiteBg: {
    background: "#FFFFFF",
    height: 45
  }
}))
