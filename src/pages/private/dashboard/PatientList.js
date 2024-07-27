import React, { useState, useEffect } from "react"
import { Grid } from "@mui/material"
import { AddPatient, CalenderDatePicker, DoctorsModal } from "components"
import { makeStyles } from "tss-react/mui"
import NurseCard from "./NurseCard"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import moment from "moment"
import { useSelector } from "react-redux"
import appointment_popup from "assets/icons/appointment_popup.svg"
import Prescription from "./Prescription"
import NewStatCard from "./NewStatCard"
import AddTaskIcon from "@mui/icons-material/AddTask"
import FollowUpPopOver from "./followupPopOver"
const PatientList = ({
  date,
  setDate,
  patientList,
  search,
  getAppointments,
  isPrescriptionOpen,
  followUpPatientList,
  stats
}) => {
  const headerData = useSelector((state) => state?.userData.userData?.details)
  const holidays = headerData.holiday
  const userType = useSelector((state) => state?.userData?.userData?.type)
  const { tpp, openingHours } = headerData || {}

  const [openAddPatient, setOpenAddPatient] = useState(false)
  const [openDoctorsModal, setOpenDoctorsModal] = useState(false)

  const [timeSlots, setTimeSlots] = useState([])

  const [timeToAdd, setTimetoAdd] = useState(null)
  const [amount, setAmount] = useState(0)
  const { classes } = useStyles()
  const { checkedInPatient } = useSelector((store) => store.checkInActive)
  const [deseases, setDeases] = useState({ deseas: "", bp: "", suger: "", decsription: "" })
  const [particular, setParticular] = useState([
    {
      item: "",
      qtyUsed: "",
      charge_per_item: ""
    }
  ])

  const [prescription, setPrescription] = useState([
    {
      presc: "",
      drug: "",
      unit: "",
      brkPre: false,
      brkPost: false,
      lunchPre: false,
      lunchPost: false,
      dnPre: false,
      dnPost: false,
      bBed: false
    }
  ])
  const [anchorEl, setAnchorEl] = useState(null)

  useEffect(() => {
    if (checkedInPatient) {
      setOpenDoctorsModal(checkedInPatient?.appointmentStatus == 2)
    }
  }, [checkedInPatient])

  useEffect(() => {
    let allTimeSlots = []

    openingHours.map((slot) => {
      const openingTime = slot?.startTime
      const closingTime = slot?.endTime

      if (openingTime && closingTime) {
        const startTime = openingTime
        const endTime = closingTime

        let arr = []
        let currentTime = moment(startTime, "hh:mm A")
        const endMoment = moment(endTime, "hh:mm A")

        while (currentTime.isSameOrBefore(endMoment)) {
          arr.push(currentTime.format("HH:mm"))
          currentTime.add(tpp, "minutes")
        }
        allTimeSlots.push(arr)
        // setTimeSlots(arr)
      }
    })
    setTimeSlots(allTimeSlots)
  }, [])

  const onDragEnd = (result) => {
    if (!result.destination) {
      return
    }
  }

  const getListStyle = (isDraggingOver) => ({
    background: isDraggingOver ? "lightblue" : "lightgrey",
    width: "100%"
  })

  const handleCloseAddPatient = () => {
    setOpenAddPatient(false)
    getAppointments()
  }

  const handleCloseDoctorsModal = () => {
    setOpenDoctorsModal(false)
    getAppointments()
  }

  const handleOpenDoctorsModal = () => {
    setOpenDoctorsModal(true)
  }

  const handleOpenAddPatient = (time) => {
    setOpenAddPatient(true)
    time && setTimetoAdd(time)
  }

  const handleOpenPopOver = (event) => {
    setAnchorEl(event.currentTarget)
  }
  return (
    <Grid item xs={4} md={3} className={classes.listContainer}>
      <Grid
        className={classes.nurseListHeader}
        container
        justifyContent="space-between"
        alignItems="center">
        <span className={classes.todayTxt}>Todays Schedule</span>
        {followUpPatientList?.length > 0 && (
          <AddTaskIcon
            onClick={(e) => handleOpenPopOver(e)}
            style={{ color: "green", height: 25, cursor: "pointer" }}
          />
        )}

        <CalenderDatePicker date={date} setDate={setDate} holidays={holidays} />
      </Grid>

      <Grid item container className={classes.statsContainer}>
        <NewStatCard
          className={classes.cardItem}
          heading={"Total"}
          value={stats?.totalAppointments || "-"}></NewStatCard>
        <NewStatCard
          className={classes.cardItem}
          heading={"Waiting"}
          value={stats?.waitingAppointments || "-"}></NewStatCard>
        <NewStatCard
          className={classes.cardItem}
          heading={"Done"}
          value={stats?.doneAppointments || "-"}></NewStatCard>
        <NewStatCard
          className={classes.cardItem}
          heading={"Follow Ups"}
          value={stats?.totalFollowups || "-"}
          nomargin={true}></NewStatCard>
      </Grid>

      <Grid container className={classes.nurseListContainer}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="droppable">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={getListStyle(snapshot.isDraggingOver)}>
                {timeSlots?.length > 0 ? (
                  timeSlots?.map((slot, index) => {
                    return (
                      <Grid key={index + 1}>
                        {slot?.map((time, index) => {
                          const {
                            patientId,
                            appointemntTime,
                            status,
                            treatment,
                            paymentStatus,
                            paymentMode,
                            patient,
                            _id
                          } = patientList?.get(time) || {}
                          const { name, mobileNumber } = patient || {}
                          if (search) {
                            if (
                              !name
                                ?.concat(mobileNumber)
                                ?.toLowerCase()
                                ?.includes(search?.toLowerCase())
                            ) {
                              return
                            }
                          }
                          return (
                            <Draggable key={index + 1} draggableId={patientId} index={index}>
                              {(provided, snapshot) => (
                                <NurseCard
                                  key={index + 1}
                                  treatment={treatment}
                                  name={name}
                                  id={patientId}
                                  appointmentId={_id}
                                  time={appointemntTime || time}
                                  provided={provided}
                                  snapshot={snapshot}
                                  patient_id={patientId}
                                  mobile={mobileNumber}
                                  status={status}
                                  date={date}
                                  payment_status={paymentStatus}
                                  payment_mode={paymentMode}
                                  getAppointments={getAppointments}
                                  allowref={true}
                                  amount={amount}
                                  handleOpenAddPatient={() => handleOpenAddPatient(time)}
                                  db_id={_id}
                                  setOpenDoctorsModal={setOpenDoctorsModal}
                                  handleOpenDoctorsModal={handleOpenDoctorsModal}
                                  checkedInPatient={checkedInPatient}
                                  userType={userType}
                                />
                              )}
                            </Draggable>
                          )
                        })}

                        <Grid conatiner className={classes.hrLine}></Grid>
                      </Grid>
                    )
                  })
                ) : (
                  <>No Appointments Found.</>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </Grid>
      {openAddPatient && (
        <AddPatient
          timeToAdd={timeToAdd}
          open={openAddPatient}
          patientId={-1}
          handleClose={handleCloseAddPatient}
          date={date}
        />
      )}
      {openDoctorsModal && userType !== "compounder" && (
        <DoctorsModal
          open={openDoctorsModal}
          handleClose={handleCloseDoctorsModal}
          checkedInPatient={checkedInPatient}
          particular={particular}
          setParticular={setParticular}
          prescription={prescription}
          setPrescription={setPrescription}
          deseases={deseases}
          setDeases={setDeases}
          date={date}
          setDate={setDate}
          getAppointments={getAppointments}
          setAmount={setAmount}
        />
      )}
      {checkedInPatient?.appointmentStatus === 2 && userType !== "compounder" && (
        <div className={classes.appointment_popup} onClick={handleOpenDoctorsModal}>
          <img src={appointment_popup} />
        </div>
      )}

      {isPrescriptionOpen && <Prescription />}
      <FollowUpPopOver
        anchorEl={anchorEl}
        setAnchorEl={setAnchorEl}
        followUpPatientList={followUpPatientList}
        date={date}
      />
    </Grid>
  )
}

export default PatientList

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
  container: {
    padding: "0px 0px 0px 26px"
  },
  statsContainer: {
    display: "flex",
    padding: "2px 0px",
    justifycontent: "center",
    alignitems: "center",
    borderRadius: 4,
    border: "1px solid rgba(117, 117, 117, 0.50)",
    background: "#FFF"
  },
  cardItem: {
    display: "flex",
    padding: "6px 4px",
    flexdirection: "column",
    alignitems: "center",
    gap: 6,
    borderRadius: 4
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
  hrLine: {
    height: 2,
    background: "gray",
    margin: "20px 0px"
  }
}))
