import * as React from "react"
import { makeStyles } from "tss-react/mui"

import Stack from "@mui/material/Stack"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import rightArrow from "assets/icons/rightArrow.svg"
import { Grid } from "@mui/material"
import leftArrow from "assets/icons/leftArrow.jpg"
import moment from "moment"
import calendarIcon from "assets/icons/calendar.svg"

function ButtonField(props) {
  const { classes } = useStyles()

  const { setOpen, InputProps: { ref } = {}, ownerState } = props

  const { value, setDate, isCalenderIcon } = ownerState
  const onLeftClick = () => {
    setDate(moment(value).subtract(1, "days").toDate())
  }
  const onRightClick = () => {
    setDate(moment(value).add(1, "days").toDate())
  }
  return (
    <Grid alignItems="center" container ref={ref}>
      {!isCalenderIcon ? (
        <>
          <img src={leftArrow} className={classes.arrowL} onClick={onLeftClick} />

          <div onClick={() => setOpen?.((prev) => !prev)} className={classes.calender}>
            {moment(value, "DD-MM-YYYY").format("ddd - DD")}
          </div>
          <img src={rightArrow} onClick={onRightClick} className={classes.arrow} />
        </>
      ) : (
        <img
          src={calendarIcon}
          onClick={() => setOpen?.((prev) => !prev)}
          className={classes.iconCalender}
        />
      )}
    </Grid>
  )
}

function ButtonDatePicker(props) {
  const [open, setOpen] = React.useState(false)

  return (
    <DatePicker
      slots={{ field: ButtonField, ...props.slots }}
      slotProps={{ field: { setOpen } }}
      {...props}
      open={open}
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}


      shouldDisableDate={(date) => {
        const day = date.toLocaleString('en-US', { weekday: 'long' });
        return props?.holidays?.includes(day);
      }}
    />
  )
}

export default function CalenderDatePicker({ setDate, date, isCalenderIcon, holidays }) {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Stack spacing={1}>
        <ButtonDatePicker
          setDate={setDate}
          value={date}
          onChange={(newValue) => setDate(newValue)}
          isCalenderIcon={isCalenderIcon}
          holidays={holidays}
        />
      </Stack>
    </LocalizationProvider>
  )
}
const useStyles = makeStyles()(() => ({
  calender: {
    color: "#4E43D6",
    fontSize: "16px",
    fontWeight: "400",
    cursor: "pointer"
  },
  arrow: {
    marginLeft: 12,
    cursor: "pointer"
  },
  arrowL: {
    marginRight: 12,
    cursor: "pointer",
    height: 13
  },
  iconCalender: {
    height: "100%",
    width: "100%"
  }
}))
