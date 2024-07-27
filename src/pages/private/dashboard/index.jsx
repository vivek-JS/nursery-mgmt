import React, { useState } from "react"
import { Grid } from "@mui/material"
import { PageLoader } from "components"
import { makeStyles } from "tss-react/mui"

import { NetworkManager, API } from "network/core"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  XAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import PieRechartComponent from "components/Charts/PieRechartComponent"
import { useEffect } from "react"
import moment from "moment"
import UperStrip from "pages/private/UpperStrip"
import PatientList from "./PatientList"
import { useSelector } from "react-redux"
//import { Quixote } from "components/Pdfs/try"
// import { PDFDownloadLink, usePDF, pdf } from "@react-pdf/renderer"
// import { PDFViewer } from "@react-pdf/renderer"

function Dashboard() {
  const data = [
    {
      name: "Jan 2019",
      Fever: 3432,
      Cough: 2342
    },
    {
      name: "Feb 2019",
      Fever: 2342,
      Cough: 3246
    },
    {
      name: "Mar 2019",
      Fever: 4565,
      Cough: 4556
    },
    {
      name: "Apr 2019",
      Fever: 6654,
      Cough: 4465
    },
    {
      name: "May 2019",
      Fever: 8765,
      Cough: 4553
    }
  ]

  const [date, setDate] = useState(new Date())
  const [search, setSearch] = useState("")
  const [patientList, setPatientList] = useState(new Map())
  const [followUpPatientList, setFollowUpPatientList] = useState([])

  const [timeSlots, setTimeSlots] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [timing, setTiming] = useState({
    start_time: "",
    end_time: ""
  })
  const headerData = useSelector((state) => {
    state?.userData.userData?.details
  })
  const { openingTime, closingTime, tpp } = headerData || {}
  useEffect(() => {
    setTiming({
      start_time: openingTime,
      end_time: closingTime
    })
  }, [])
  useEffect(() => {
    getAppointments()
  }, [date])

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
    const result = await instance.request({}, { date: moment(date).format("YYYY-MM-DD") })
    let map = new Map()
    if (result?.data?.data || result?.data?.stats) {
      result?.data?.data?.map((appointment) => {
        map.set(appointment?.appointmentTime, appointment)
      })
    }

    const instance1 = NetworkManager(API.FOLLOW_UP.GET_FOLLOW_UP)
    const result1 = await instance1.request({}, { date: moment(date).format("YYYY-MM-DD") })
    setPatientList(map || [])

    //sending stats
    const instance2 = NetworkManager(API.APPOINTMENT.APPOINTMENT_STATISTICS)
    const result2 = await instance2.request(
      {},
      {
        date: moment(date).format("YYYY-MM-DD")
      }
    )

    setStats(result2?.data?.data)
    setFollowUpPatientList(result1?.data?.data)
    setLoading(false)
  }

  return (
    <Grid container className={classes.container}>
      {loading && <PageLoader />}
      <UperStrip
        date={date}
        setSearch={setSearch}
        search={search}
        getAppointments={getAppointments}
      />

      {/* <Invoice /> */}

      <Grid container className={classes.listandgraphcontainer}>
        <PatientList
          date={date}
          setDate={setDate}
          patientList={patientList}
          timeSlots={timeSlots}
          search={search}
          setSearch={setSearch}
          getAppointments={getAppointments}
          stats={stats}
          followUpPatientList={followUpPatientList}></PatientList>
        <Grid item xs={8} md={9} contaienr className={classes.graphscontainer}>
          <Grid container className={classes.graphs}>
            <Grid
              className={classes.graphOne}
              container
              justifyContent="center"
              alignItems="center">
              <ResponsiveContainer width="95%" height="90%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Fever" stroke="#0095FF" />
                  <Line type="monotone" dataKey="Cough" stroke="#FF0000" />
                </LineChart>
              </ResponsiveContainer>
            </Grid>
            <Grid className={classes.graphTwo} container>
              <PieRechartComponent />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default Dashboard
const useStyles = makeStyles()(() => ({
  appointment_popup: {
    position: "fixed",
    top: "10%",
    right: "0%",
    cursor: "pointer"
  },
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

  statsContainer: {
    marginTop: 24,
    justifyContent: "center",
    gap: 12
  },
  listandgraphcontainer: {
    marginTop: 16,
    height: "85vh",
    marginLeft: 16
  },
  listContainer: {},
  graphscontainer: {
    paddingLeft: 8
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
