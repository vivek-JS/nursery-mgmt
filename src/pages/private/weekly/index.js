import React, { useState } from "react"
import { Grid } from "@mui/material"
import { AddPatient, PageLoader } from "components"
import { makeStyles } from "tss-react/mui"
import { NetworkManager, API } from "network/core"
import { useEffect } from "react"
import moment from "moment"
import UperStrip from "pages/private/UpperStrip"
import WeekSchedule from "./WeekSchedule"
import PatientList from "../dashboard/PatientList"
import { useSelector } from "react-redux"

function Weekly() {
  const headerData = useSelector((state) => state?.userData.userData?.details)

  const { tpp } = headerData || {}
  const openingTime = headerData?.openingHours[0]?.startTime
  const closingTime = headerData?.openingHours[0]?.endTime

  const [timing, setTiming] = useState({
    start_time: "",
    end_time: ""
  })

  const [date, setDate] = useState(new Date())
  const [startDateWeek, setStartDateWeek] = useState(null)
  const [openAddPatient, setOpenAddPatient] = useState(false)
  const [patientList, setPatientList] = useState(new Map())
  const [followUpPatientList, setFollowUpPatientList] = useState([])
  const [searchedPatientList, setSearchedPatientList] = useState(new Map())
  const [timeSlots, setTimeSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [timeToAdd, setTimetoAdd] = useState(null)
  const [search, setSearch] = useState("")
  const [stats, setStats] = useState({})
  const [todaysPateint, setTodaysPateint] = useState(new Map())
  useEffect(() => {
    if (patientList?.size) {
      // ...
    }
  }, [patientList])

  useEffect(() => {
    setTiming({
      start_time: openingTime,
      end_time: closingTime
    })
  }, [])

  useEffect(() => {
    if (search) {
      let dummyMap = new Map()
      patientList.forEach((values, keys) => {
        const { patient_name, mobile } = values

        if (patient_name?.concat(mobile)?.toLowerCase()?.includes(search?.toLowerCase())) {
          dummyMap.set(keys, values)
        }
      })
      setSearchedPatientList(dummyMap || [])
    }
  }, [search])

  useEffect(() => {
    getAppointments()
    //getPatientList()
    // getStats()
    setStartDateWeek(moment(date).startOf("isoWeek"))
  }, [date])

  // useEffect(() => {
  //   const startTime = openingTime;
  //   const endTime = closingTime;
  //   let currentTime = moment(startTime)

  //   let arr = []
  //   while (currentTime.isSameOrBefore(endTime)) {
  //     arr.push(currentTime.format())
  //     currentTime.add(tpp, "minutes")
  //   }
  //   setTimeSlots(arr)
  // }, [patientList, date])

  useEffect(() => {
    const { start_time, end_time } = timing
    const startTime = moment(start_time, "hh:mm A")
    const endTime = moment(end_time, "hh:mm A")
    let arr = []
    let currentTime = moment(startTime)
    while (currentTime.isSameOrBefore(endTime)) {
      arr.push(currentTime.format("HH:mm"))
      currentTime.add(tpp, "minutes")
    }

    setTimeSlots(arr)
  }, [timing?.start_time])

  const { classes } = useStyles()

  const getAppointments = async () => {
    setLoading(true)
    const instance = NetworkManager(API.APPOINTMENT.APPOINTMENT_LIST)
    //const user = await instance.request()
    const result = await instance.request(
      {},
      {
        fromDate: moment(moment(date).startOf("isoWeek").toDate()),
        toDate: moment(moment(date).endOf("isoWeek").toDate())
      }
    )
    setLoading(false)

    let map = new Map()
    let patientMap = new Map()
    result?.data?.data.map((appointments) => {
      appointments?.appointments?.map((appointment) => {
        map.set(
          moment(appointments?.date).format("DD-MM-YYYY") +
            moment(appointment?.appointmentTime, "hh:mm").format("hh:mm A"),
          appointment
        )
      })
      const dailyPatients = result?.data?.data?.find((appointment) => {
        return moment(date).format("YYYY-MM-DD") == appointment?.date.split("T")[0]
      })

      dailyPatients?.appointments.map((appointment) => {
        patientMap.set(appointment?.appointmentTime, appointment)
      })
      setTodaysPateint(patientMap)
    })

    const instance1 = NetworkManager(API.FOLLOW_UP.GET_FOLLOW_UP)
    const result1 = await instance1.request({}, { date: moment(date).format("YYYY-MM-DD") })

    setFollowUpPatientList(result1?.data?.data)

    setPatientList(map)

    const instance2 = NetworkManager(API.APPOINTMENT.APPOINTMENT_STATISTICS)
    const result2 = await instance2.request(
      {},
      {
        startDate: moment(moment(date).startOf("isoWeek").toDate()),
        endDate: moment(moment(date).endOf("isoWeek").toDate())
      }
    )
    setStats(result2?.data?.data)
  }

  const handleCloseAddPatient = () => {
    setOpenAddPatient(false)
    getAppointments()
  }
  const handleOpenAddPatient = (time) => {
    setOpenAddPatient(true)
    time && setTimetoAdd(time)
  }

  return (
    <Grid container className={classes.container}>
      {loading && <PageLoader />}
      <UperStrip
        handleOpenAddPatient={handleOpenAddPatient}
        setSearch={setSearch}
        search={search}
        getAppointments={getAppointments}
        date={date}
      />
      <Grid container className={classes.listandgraphcontainer}>
        <PatientList
          date={date}
          setDate={setDate}
          patientList={todaysPateint}
          timeSlots={timeSlots}
          search={search}
          setSearch={setSearch}
          getAppointments={getAppointments}
          stats={stats}
          followUpPatientList={followUpPatientList}></PatientList>
        <Grid item xs={9} contaienr className={classes.graphscontainer}>
          <WeekSchedule
            patientList={search ? searchedPatientList : patientList}
            startDateWeek={startDateWeek}
            timeSlots={timeSlots}
            getAppointments={getAppointments}
            search={search}
          />
        </Grid>
      </Grid>
      {openAddPatient && (
        <AddPatient
          timeToAdd={timeToAdd}
          open={openAddPatient}
          patientId={-1}
          handleClose={handleCloseAddPatient}
        />
      )}{" "}
    </Grid>
  )
}

export default Weekly
const useStyles = makeStyles()(() => ({
  searchContainer: {
    boxShadow: " 0px 4px 5px 0px rgba(0, 0, 0, 0.10)",
    paddingBottom: 12
  },
  btnContainer: {
    marginLeft: 15
  },
  flexDisplay: {
    display: "flex"
  },
  container: {
    //  padding: "0px 0px 0px 26px"
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
    paddingLeft: "6px"
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
  }
}))
