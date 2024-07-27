import React from "react"
import { getDynamicStyle } from "utils/gridUtils"
import { Grid } from "@mui/material"
import { makeStyles } from "tss-react/mui"
import moment from "moment"
import AppointmentCard from "./AppointmentCard"
import { useState, useEffect } from "react"
import { useSelector } from "react-redux"

const WeekSchedule = ({ getAppointments, startDateWeek, patientList }) => {
  const { classes } = useStyles()

  const [timeSlots, setTimeSlots] = useState([])


  const headerData = useSelector((state) => state?.userData.userData?.details)
  const holidays = headerData.holiday

  const { tpp, openingHours } = headerData || {}

  useEffect(() => {
    let allTimeSlots = new Set()

    openingHours.forEach((slot) => {
      const openingTime = slot?.startTime
      const closingTime = slot?.endTime

      if (openingTime && closingTime) {
        let currentTime = moment(openingTime, "hh:mm A")
        const endMoment = moment(closingTime, "hh:mm A")

        while (currentTime.isSameOrBefore(endMoment)) {
          allTimeSlots.add(currentTime.format("HH:mm"))
          currentTime.add(tpp, "minutes")
        }
      }
    })
    setTimeSlots(Array.from(allTimeSlots).sort())


  }, [openingHours, tpp])

  const isHoliday = (date, holidays) => {
    return holidays.includes(date.format('dddd'));
  };

  return (
    <>
      <Grid item xs={3} className={classes.listContainer}>
        <Grid
          className={classes.nurseListHeader}
          container
          justifyContent="space-between"
          alignItems="center">
          <span className={classes.todayTxt}>{moment(startDateWeek).format("MMMM YYYY")}</span>
        </Grid>
      </Grid>
      <Grid style={{ overflowX: "overlay", height: "75vh", width: "100%" }}>
        <Grid container>
          <Grid item style={getDynamicStyle(1, 8, 15)} className={classes.label}></Grid>
          {[0, 1, 2, 3, 4, 5, 6].map(day => {
            const date = moment(startDateWeek).add(day, "days");
            const isHolidayColumn = isHoliday(date, holidays);
            return (
              <Grid
                key={day}
                item
                style={getDynamicStyle(2, 8, 15)}
                className={`${classes.label} ${isHolidayColumn ? classes.holidayColumn : ''}`}
              >
                <div>{date.format("ddd, DD")}</div>
                {isHolidayColumn && <div className={classes.holidayLabel}>Holiday</div>}
              </Grid>
            );
          })}
        </Grid>
        <Grid container>
          {timeSlots?.map((time, index) => (
            <Grid key={time} container>
              <Grid
                item
                style={getDynamicStyle(1, 8, 15)}
                className={`${classes.label} ${classes.time} ${time.includes("00:00") && classes.solidBorder}`}
              >
                <div>{moment(time, "HH:mm").format("hh:mm A")}</div>
              </Grid>
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const date = moment(startDateWeek).add(day, "days");
                const isHolidayColumn = isHoliday(date, holidays);
                return (
                  <Grid
                    key={day}
                    item
                    style={getDynamicStyle(2, 8, 15)}
                    className={`${classes.label} ${isHolidayColumn ? classes.holidayColumn : ''}`}
                  >
                    {!isHolidayColumn && (
                      <AppointmentCard
                        time={moment(time, "HH:mm").format("hh:mm A")}
                        dateTime={date.add(index * 10, "minutes")}
                        patientList={patientList}
                        getAppointments={getAppointments}
                      />
                    )}
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </Grid>
      </Grid>
    </>
  )
}
export default WeekSchedule
const useStyles = makeStyles()(() => ({
  label: {
    border: "0.5px dotted #BDBDBD",
    height: 46,
    display: "flex",
    alignItems: "flex-start",
    paddingLeft: 5,
    fontSize: 16,
    fontWeight: 500,
    flexDirection: "column"
  },

  patientCount: {
    color: "#3A4BB6",

    fontSize: 16,
    fontWeight: 700
  },
  time: {
    color: "#757575",

    fontSize: 12,
    fontWeight: 500
  },
  nurseListHeader: {
    padding: "20px 10px 10px 10px"
  },
  todayTxt: {
    fontSize: 19,
    fontWeight: 500,
    color: "#3A4BB6"
  },
  holidayColumn: {
    backgroundColor: '#f0f0f0',
    color: '#999',
    pointerEvents: 'none',
  },
  holidayLabel: {
    fontSize: 12,
    color: '#999',
  },
}))
