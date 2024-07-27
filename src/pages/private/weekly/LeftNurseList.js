import React, { useState } from "react"
import { AddPatient } from "components"

import NurseCard from "pages/private/dashboard/NurseCard"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

import moment from "moment"
function LeftNurseList({ getAppointments, timeSlots, patientList }) {
  const [openAddPatient, setOpenAddPatient] = useState(false)

  const currentTime = moment(new Date()).toDate().toISOString()
  const [timeToAdd, setTimetoAdd] = useState(null)

  const handleCloseAddPatient = () => {
    setOpenAddPatient(false)
    getAppointments()
  }
  const handleOpenAddPatient = (time) => {
    setOpenAddPatient(true)
    time && setTimetoAdd(time)
  }
  // const reorder = (list, startIndex, endIndex) => {
  //   const result = Array.from(list)
  //   const [removed] = result.splice(startIndex, 1)
  //   result.splice(endIndex, 0, removed)

  //   return result
  // }
  const onDragEnd = (result) => {
    // dropped outside the list
    if (!result.destination) {
      return
    }

    // const items = reorder(patientList, result.source.index, result.destination.index)

    // setPatientList(items)
  }
  //const grid = 8

  // const getItemStyle = (isDragging, draggableStyle) => ({
  //   // some basic styles to make the items look a bit nicer
  //   userSelect: "none",
  //   padding: grid * 2,
  //   margin: `0 0 ${grid}px 0`,

  //   // change background colour if dragging
  //   background: isDragging ? "lightgreen" : "grey",

  //   // styles we need to apply on draggables
  //   ...draggableStyle
  // })

  const getListStyle = (isDraggingOver) => ({
    background: isDraggingOver ? "lightblue" : "lightgrey",
    width: "100%"
  })

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={getListStyle(snapshot.isDraggingOver)}>
              {timeSlots?.length > 0 ? (
                timeSlots?.map((time, index) => {
                  const { patient_name, patient_id, appointemnt_time, mobile, status } =
                    patientList?.get(time) || {}

                  return (
                    <Draggable key={index + 1} draggableId={patient_id} index={index}>
                      {(provided, snapshot) => (
                        <NurseCard
                          key={index + 1}
                          name={patient_name}
                          id={patient_id}
                          time={appointemnt_time || time}
                          provided={provided}
                          snapshot={snapshot}
                          patient_id={patient_id}
                          mobile={mobile}
                          status={status}
                          date={new Date()}
                          getAppointments={getAppointments}
                          allowref={
                            moment(currentTime)
                              .subtract(20, "minutes")
                              .isBetween(moment(time), moment(time).add(10, "minutes"))
                              ? true
                              : null
                          }
                          handleOpenAddPatient={() => handleOpenAddPatient(time)}
                        />
                      )}
                    </Draggable>
                  )
                })
              ) : (
                <>No Appointments Found.</>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {openAddPatient && (
        <AddPatient
          timeToAdd={timeToAdd}
          open={openAddPatient}
          patientId={-1}
          handleClose={handleCloseAddPatient}
        />
      )}
    </>
  )
}

export default LeftNurseList
