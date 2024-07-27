import React, { useState, useEffect, useRef } from "react"
import { makeStyles } from "tss-react/mui"
import Grid from "@mui/material/Grid"
// import logo from "assets/icons/Logo.png"
import moment from "moment"
import { API, NetworkManager } from "network/core"
import Slide from "@mui/material/Slide"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import { useSelector } from "react-redux"
import { GET_API_DATE } from "utils/dateUtils"

import { IoPrintOutline } from "react-icons/io5"

import html2canvas from "html2canvas"
import jsPDF from "jspdf"

import { HiDownload } from "react-icons/hi"

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="top" ref={ref} {...props} />
})

const Prescription = ({
  openPopup,
  closePopup,
  appointmentDate,
  appointmentTime,
  appointmentId
}) => {
  const { classes } = useStyles()
  const headerData = useSelector((state) => state)
  const data = headerData.userData.userData
  const [prescriptionData, setPrescriptionData] = useState({})
  const { patientData, treatment } = prescriptionData || {}

  const pdfRef = useRef()

  useEffect(() => {
    getPrescriptionList()
  }, [])

  const downloadPdF = () => {
    const input = pdfRef.current
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4", true)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 30
      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      pdf.save("prescription.pdf")
    })
  }

  const printPrescription = () => {
    const printWindow = window.open("", "_blank")

    const treatmentItems = treatment?.medicins
      ?.map(
        (element, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${element.name}</td>
        <td>${element.dosage}</td>
        <td>${element.drug}</td>
      </tr>
    `
      )
      .join("")

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Prescription</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .header { background-color: #f2f2f2; padding: 20px; }
            .patient-info { margin-top: 20px; }
            .treatment-table { margin-top: 20px; }
            .diagnosis { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${data?.details?.doctorName}</h2>
            <p>${data?.details?.medicalDegree} | Reg.No: ${
      data?.details?.registrationNumber
    } | Mob.No: ${data?.mobileNumber}</p>
            <h3>${data?.details?.hospitalName}</h3>
            <p>${data?.details?.address}</p>
          </div>
          <div class="patient-info">
            <p><strong>Patient Name:</strong> ${patientData?.name}</p>
            <p><strong>Address:</strong> ${patientData?.address}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="treatment-table">
            <h3>Treatment</h3>
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Medicine Name</th>
                  <th>Dosage</th>
                  <th>Drug</th>
                </tr>
              </thead>
              <tbody>
                ${treatmentItems}
              </tbody>
            </table>
          </div>
          <div class="diagnosis">
            <p><strong>Diagnosed:</strong> ${treatment?.dignosed}</p>
            <p><strong>Advice Given:</strong> ${treatment?.advice}</p>
            <p><strong>Follow Up:</strong> ${new Date(
              prescriptionData?.nextFollowUpDate
            ).toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    printWindow.onload = function () {
      printWindow.print()
      printWindow.close()
    }
  }

  const getPrescriptionList = async () => {
    const instance = NetworkManager(API.PRESCRIPTION.GET_PRESCRIPTION)
    const prescriptionData = await instance.request(
      {},
      {
        appointementDate: GET_API_DATE(appointmentDate),
        appointementTime: appointmentTime,
        appointmentId: appointmentId
      }
    )
    setPrescriptionData(prescriptionData?.data[0])
  }

  return (
    <Dialog
      className="Dialog"
      PaperProps={{ sx: { width: "800px", height: "710px" } }}
      maxWidth="md"
      open={openPopup}
      TransitionComponent={Transition}
      keepMounted
      onClose={closePopup}
      aria-describedby="alert-dialog-slide-description">
      <DialogContent>
        <div ref={pdfRef} className={classes.container}>
          <div className={classes.prescription}>
            <section className={classes.header}>
              <HiDownload className={classes.print_logo} onClick={downloadPdF} />
              <IoPrintOutline className={classes.print_logo} onClick={printPrescription} />

              <Grid container spacing={3}>
                <Grid item xs={4}>
                  <h3>{data?.details?.doctorName}</h3>
                  <p>
                    {data?.details?.medicalDegree} | Reg.No:{data?.details?.registrationNumber} |
                    Mob.No:{data?.mobileNumber}
                  </p>
                </Grid>
                <Grid item xs={4}>
                  {/* <div>
                    <img src={logo} className={classes.hospital_logo} />
                  </div> */}
                </Grid>
                <Grid item xs={4}>
                  <h3>{data?.details?.hospitalName}</h3>
                  <p>{data?.details?.address}</p>
                </Grid>
              </Grid>
            </section>
            <hr></hr>
            <section className={classes.patient_info}>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <div>
                    <strong>Name: {patientData?.name}</strong>
                  </div>
                  <div>
                    <strong>Address: </strong>
                    {patientData?.address}
                  </div>
                  <div>{patientData?.refferBy != "N/A" && patientData?.refferBy}</div>
                </Grid>
                <Grid item xs={4}>
                  <strong>Date: </strong>
                  {moment().format("D-MMM-YYYY, h:mm a")}
                </Grid>
              </Grid>
            </section>
            <hr></hr>
            <section className={classes.treatment}>
              <Grid container spacing={2}>
                <Grid container justifyContent={"center"} alignItems={"center"} item xs={4}>
                  <h4>Medicine Name</h4>
                </Grid>
                <Grid item container justifyContent={"center"} alignItems={"center"} xs={6}>
                  <h4>Dosage</h4>
                </Grid>
                <Grid item container justifyContent={"center"} alignItems={"center"} xs={2}>
                  <h4>Drug</h4>
                </Grid>
              </Grid>
              <hr></hr>
              {treatment?.medicins?.map((element, index) => (
                <Grid container spacing={2} key={index}>
                  <Grid item container justifyContent={"center"} alignItems={"center"} xs={4}>
                    {element.name}
                  </Grid>
                  <Grid item container justifyContent={"center"} alignItems={"center"} xs={6}>
                    {element.dosage}
                  </Grid>
                  <Grid item container justifyContent={"center"} alignItems={"center"} xs={2}>
                    {element?.drug}
                  </Grid>
                </Grid>
              ))}
            </section>
            <hr></hr>
            <section>
              <div>
                <strong>Dignosed: </strong>
                {treatment?.dignosed}
              </div>
              <div>
                <strong>Advice Given: </strong>
                {treatment?.advice}
              </div>
              <div>
                <strong>Follow Up: </strong>
                {moment(prescriptionData?.nextFollowUpDate).format("DD-MM-YYYY")}
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const useStyles = makeStyles()(() => ({
  container: {
    width: 730,
    height: 650,
    background: "#F2F2F2",
    margin: 10
  },
  prescription: {
    paddingLeft: 60,
    paddingRight: 60,
    paddingTop: 40,
    paddingBottom: 40
  },

  hospital_logo: {
    width: 90,
    height: 30,
    marginTop: 40,
    paddingLeft: 30
  },
  patient_info: {
    marginBottom: 30
  },
  print_logo: {
    width: 30,
    height: 30,
    cursor: "pointer",
    zIndex: 10
  }
}))

export default Prescription
