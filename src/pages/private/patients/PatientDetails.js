import React, { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { makeStyles } from "tss-react/mui"
import moment from "moment"
// import axios from "axios"
import { NetworkManager, API } from "network/core"

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

function PatientDetails() {
  const [patient, setPatient] = useState(null)

  const query = useQuery()
  const patientId = query.get("patient_id")
  const { classes } = useStyles()

  // useEffect(() => {
  //   axios
  //     .get(`http://localhost:8080/api/v1/users/getPatientsDetails/${patientId}`, {
  //       headers: {
  //         credentials: true
  //       }
  //     })
  //     .then((response) => {
  //       setPatient(response.data.data[0])
  //     })
  // }, [patientId])

  // if (loading) {
  //   return <div>Loading...</div>
  // }

  useEffect(() => {
    getPatientDetails()
  }, [patientId])

  const getPatientDetails = async () => {
    const instance = NetworkManager(API.PATIENT.GET_PATIENT_WITH_APPOINTMENT_DETAILS)
    const patientData = await instance.request({}, { patientId })
    setPatient(patientData?.data?.data)
  }
  return (
    <div className={classes.container}>
      <h1 className={classes.title}>Patient Details</h1>
      {patient ? (
        <div className={classes.details}>
          <div className={classes.detailColumn}>
            <div className={classes.detailItem}>Patient Name: {patient?.name}</div>
            <div className={classes.detailItem}>Patient ID: {patient?._id}</div>
            <div className={classes.detailItem}>Mobile Number: {patient?.mobileNumber}</div>
            <div className={classes.detailItem}>Email: {patient?.email}</div>
            <div className={classes.detailItem}>Address: {patient?.address}</div>
            <div className={classes.detailItem}>Pin Code: {patient?.pinCode}</div>
          </div>
          <div className={classes.detailColumn}>
            <div className={classes.detailItem}>Adhar Number: {patient?.aadharNumber}</div>
            <div className={classes.detailItem}>
              Date of Birth: {new Date(patient.dob).toLocaleDateString()}
            </div>
            <div className={classes.detailItem}>Gender: {patient?.gender}</div>
            {/* <div className={classes.detailItem}>Main Complaint: {patient?.mainComplaint}</div> */}
            <div className={classes.detailItem}>
              Date of Admission: {new Date(patient?.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      ) : (
        <div>No patient details available</div>
      )}
      {/* {patient && patient.appointmentsRecord.length > 0 && ( */}

      {patient && patient.appointments && patient?.appointments?.length > 0 && (
        <>
          <h2 className={classes.subtitle}>Appointments:</h2>
          <div className={classes.appointmentList}>
            <div className={classes.appointmentItem}>
              <div className={classes.appointmentDetail_t}>Date</div>
              <div className={classes.appointmentDetail_t}>Time</div>
              <div className={classes.appointmentDetail_t}>FollowUp Date</div>
            </div>

            {patient?.appointments?.map((appointment) => (
              <div key={appointment._id} className={classes.appointmentItem}>
                <div className={classes.appointmentDetail}>
                  {moment(appointment?.date).format("DD-MM-YYYY")}
                </div>
                <div className={classes.appointmentDetail}>
                  {appointment?.appointments?.appointmentTime}
                </div>
                <div className={classes.appointmentDetail}>
                  {appointment?.appointments?.nextFollowUpDate
                    ? moment(appointment?.appointments?.nextFollowUpDate).format("DD-MM-YYYY")
                    : "No Follow Up"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const useStyles = makeStyles()(() => ({
  container: {
    padding: "20px",
    backgroundColor: "#f4f4f9",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
    maxWidth: "800px",
    margin: "auto"
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
    color: "#333"
  },
  details: {
    display: "flex",
    gap: "20px"
  },
  detailColumn: {
    flex: "1",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  detailItem: {
    backgroundColor: "#fff",
    padding: "10px",
    borderRadius: "4px",
    boxShadow: "0 0 5px rgba(0, 0, 0, 0.1)"
  },
  subtitle: {
    marginTop: "20px",
    marginBottom: "10px",
    color: "#555"
  },
  appointmentList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  appointmentItem: {
    display: "flex",
    gap: "10px",
    backgroundColor: "#fff",
    padding: "10px",
    borderRadius: "4px",
    boxShadow: "0 0 5px rgba(0, 0, 0, 0.1)"
  },
  appointmentDetail: {
    flex: "1",
    textAlign: "left"
  },
  appointmentDetail_t: {
    flex: "1",
    textAlign: "left",
    fontWeight: "bold"
  }
}))

export default PatientDetails
