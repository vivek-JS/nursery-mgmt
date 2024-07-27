import React, { useState } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Slide from "@mui/material/Slide"
import { makeStyles } from "tss-react/mui"
import { InputField } from "components"
import { FormControl, Grid } from "@mui/material"
import CrossIcon from "assets/icons/cross-icon.svg"

//import calendarIcon from "assets/icons/calendar.svg"

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />
})
// const ONLY_CHAR_REGEX = /^[a-zA-Z_ ]+$/
const MedicalHistory = ({ handleClose, medicalHistory, setMedicalHistory }) => {
  const { classes } = useStyles()

  const [currentStatus, setCurrentStatus] = useState({
    allergies: medicalHistory?.allergies || [{ name: "" }],
    habits: medicalHistory?.habits || [{ name: "" }],
    currentTreatment: medicalHistory?.currentTreatment || [{ name: "" }],
    previousDisease: medicalHistory?.previousDisease || [{ name: "" }],
    surgery: medicalHistory?.surgery || [{ name: "" }]
  })
  // const [patientList, setPatientList] = useState([])
  const handleChange = (key, index, value) => {
    let obj = { ...currentStatus }
    obj[key][index].name = value
    setCurrentStatus(obj)
  }
  const removeElements = (key, index) => {
    let obj = { ...currentStatus }
    obj[key].splice(index, 1)
    setCurrentStatus(obj)
  }
  const addObj = (key) => {
    let arr = { ...currentStatus }
    arr[key].push({
      name: ""
    })
    setCurrentStatus(arr)
  }

  return (
    <Dialog
      PaperProps={{ sx: { width: "750px", height: "550px" } }}
      maxWidth="md"
      open={true}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      aria-describedby="alert-dialog-slide-description">
      <DialogTitle className={classes.modalTitle}>
        <div>Medical History</div>
      </DialogTitle>
      <DialogContent>
        <div className={classes.hr}></div>
        <FormControl variant="outlined" fullWidth={true}>
          <Grid className={classes.currentDiv}>
            <h4>Current Status</h4>
            <h5>
              Allergies:{" "}
              <Button
                type="submit"
                className={classes.addLergies}
                onClick={() => addObj("allergies")}>
                Add more +
              </Button>
            </h5>

            <Grid container spacing={2} className={classes.inputContainer}>
              {currentStatus?.allergies?.map((obj, index) => {
                return (
                  <Grid className={classes.inputContainer} item xs={4} key={index + 1}>
                    <InputField
                      label="Allergeis"
                      id="reffered_by"
                      variant="outlined"
                      value={obj.name}
                      onChange={(e) => handleChange("allergies", index, e.target.value)}
                    />
                    {index > 0 && (
                      <img
                        src={CrossIcon}
                        onClick={() => removeElements("allergies", index)}
                        className={`${classes.crossStyle} ${classes.imgStyle}`}
                        alt="search"
                      />
                    )}
                  </Grid>
                )
              })}
            </Grid>

            <h5>
              Habits
              <Button type="submit" className={classes.addLergies} onClick={() => addObj("habits")}>
                Add more +
              </Button>
            </h5>

            <Grid container spacing={2} className={classes.inputContainer}>
              {currentStatus?.habits?.map((obj, index) => {
                return (
                  <Grid className={classes.inputContainer} item xs={4} key={index + 1}>
                    <InputField
                      label="Enter Hxabits"
                      id="habits"
                      variant="outlined"
                      value={obj.name}
                      onChange={(e) => handleChange("habits", index, e.target.value)}
                    />
                    {index > 0 && (
                      <img
                        src={CrossIcon}
                        onClick={() => removeElements("habits", index)}
                        className={`${classes.crossStyle} ${classes.imgStyle}`}
                        alt="search"
                      />
                    )}
                  </Grid>
                )
              })}
            </Grid>
            <h5>
              Current Treatment
              <Button
                type="submit"
                className={classes.addLergies}
                onClick={() => addObj("currentTreatment")}>
                Add more +
              </Button>
            </h5>

            <Grid container spacing={2} className={classes.inputContainer}>
              {currentStatus?.currentTreatment?.map((obj, index) => {
                return (
                  <Grid className={classes.inputContainer} item xs={4} key={index + 1}>
                    <InputField
                      label="Current Treatment"
                      id="currentTreatment"
                      variant="outlined"
                      value={obj.name}
                      onChange={(e) => handleChange("currentTreatment", index, e.target.value)}
                    />
                    {index > 0 && (
                      <img
                        src={CrossIcon}
                        onClick={() => removeElements("currentTreatment", index)}
                        className={`${classes.crossStyle} ${classes.imgStyle}`}
                        alt="search"
                      />
                    )}
                  </Grid>
                )
              })}
            </Grid>
            <h4>Patient History</h4>
            <h5>
              Previous Desease
              <Button
                type="submit"
                className={classes.addLergies}
                onClick={() => addObj("previousDisease")}>
                Add more +
              </Button>
            </h5>
            <Grid container spacing={2} className={classes.inputContainer}>
              {currentStatus?.previousDisease?.map((obj, index) => {
                return (
                  <Grid className={classes.inputContainer} item xs={4} key={index + 1}>
                    <InputField
                      label="Previous Desease"
                      id="previousDisease"
                      variant="outlined"
                      value={obj.name}
                      onChange={(e) => handleChange("previousDisease", index, e.target.value)}
                    />
                    {index > 0 && (
                      <img
                        src={CrossIcon}
                        onClick={() => removeElements("previousDisease", index)}
                        className={`${classes.crossStyle} ${classes.imgStyle}`}
                        alt="search"
                      />
                    )}
                  </Grid>
                )
              })}
            </Grid>
            <h5>
              Surgeries
              <Button
                type="submit"
                className={classes.addLergies}
                onClick={() => addObj("surgery")}>
                Add more +
              </Button>
            </h5>
            <Grid container spacing={2} className={classes.inputContainer}>
              {currentStatus?.surgery?.map((obj, index) => {
                return (
                  <Grid className={classes.inputContainer} item xs={4} key={index + 1}>
                    <InputField
                      label="Surgeries"
                      id="surgery"
                      variant="outlined"
                      value={obj.name}
                      onChange={(e) => handleChange("surgery", index, e.target.value)}
                    />
                    {index > 0 && (
                      <img
                        src={CrossIcon}
                        onClick={() => removeElements("surgery", index)}
                        className={`${classes.crossStyle} ${classes.imgStyle}`}
                        alt="search"
                      />
                    )}
                  </Grid>
                )
              })}
            </Grid>
          </Grid>
        </FormControl>
      </DialogContent>
      <DialogActions className={classes.DialogActions}>
        <div>
          <Button onClick={handleClose} className={classes.cancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            className={classes.agree}
            onClick={() => {
              setMedicalHistory(currentStatus)
              handleClose()
            }}>
            Save
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  )
}
export default MedicalHistory
const useStyles = makeStyles()(() => ({
  DialogActions: {
    boxSizing: "border-box",
    height: 90,
    paddingRight: 60,
    paddingLeft: 60,
    display: "flex",
    justifyContent: "space-between"
  },
  cancel: {
    color: "#3A4BB6",
    fontWeight: 600,
    fontSize: 16,
    marginRight: 16
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  hr: {
    border: "1px solid #3A4BB6"
  },
  form: {
    marginTop: 24
  },
  txt: {
    fontSize: 16,
    fontWeight: 600
  },
  agree: {
    borderRadius: 5,
    background: "#4E43D6",
    color: "#FFFFFF",
    fontWeight: 600,
    fontSize: 16,
    "&:hover": {
      color: "white",
      background: "#3A4BB6",
    },
  },
  idDiv: {
    background: "linear-gradient(90deg, #F23A41 0%, #6E3AA8 100%)",
    border: "1px solid #FFF",
    borderRadius: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 32,
    color: "#FFFFFF"
  },
  multiSelect: {
    backgroundColor: "#EEEEEE",
    borderRadius: 4,
    width: 180,
    marginRight: 10,
    marginLeft: 10,
    height: "45px !important"
  },
  calenderPicker: {
    "& .MuiTextField-root": {
      marginLeft: 10,
      width: "100%"
    }
  },
  medIcon: {
    cursor: "pointer"
  },
  currentDiv: {
    paddingLeft: 8
  },
  addLergies: {
    "&:hover": {
      backgroundColor: "#8F88E5 !important",
      borderColor: "#d8dcf3",
      boxShadow: "none"
    }
  },
  inputContainer: { position: "relative" },
  crossStyle: {
    position: "absolute",
    right: -2,
    top: 6
  }
}))
