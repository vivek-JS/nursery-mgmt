import React, { useState } from "react"
import { useRef } from "react"
import { makeStyles } from "tss-react/mui"
import { Grid } from "@mui/material"
// import logo from "assets/icons/Logo.png"
// import print from "assets/icons/Print-Icon.png"
// import doenload from "assets/icons/Download-Icon.png"
import { API, NetworkManager } from "network/core"
import { useEffect } from "react"
import Slide from "@mui/material/Slide"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
// import moment from "moment"
import { HiDownload } from "react-icons/hi"
import { IoPrintOutline } from "react-icons/io5"

import { useSelector } from "react-redux"
import { GET_API_DATE } from "utils/dateUtils"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="top" ref={ref} {...props} />
})

function Invoice({ openPopup, closePopup, appointmentDate, appointmentTime }) {
  const { classes } = useStyles()
  const headerData = useSelector((state) => state)
  const data = headerData.userData.userData
  const pdfRef = useRef()
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
      pdf.save("invoice.pdf")
    })
  }

  const printPrescription = () => {
    const printWindow = window.open("", "_blank")
    const invoiceItems = invoiceData?.invoiceData
      ?.map((element, index) =>
        element?.item !== undefined
          ? `
      <tr>
        <td>${index + 1}</td>
        <td>${element?.item}</td>
        <td>${element?.qty}</td>
        <td>${element?.charges / element?.qty}</td>
        <td>${element?.charges}</td>
      </tr>
    `
          : element?.doctorFee !== undefined
          ? `
      <tr>
        <td>${index + 1}</td>
        <td>Doctor Fee</td>
        <td>1</td>
        <td>${element?.doctorFee}</td>
        <td>${element?.doctorFee}</td>
      </tr>
    `
          : ""
      )
      .join("")

    // const totalAmount = invoiceData?.invoiceData?.reduce((acc, element) => acc + element.charges, 0) || 0;
    // const discount = 5; // 5% discount
    // const discountAmount = (discount / 100) * totalAmount;
    // const finalTotal = totalAmount - discountAmount;

    printWindow.document.write(`
      <html>
      <head>
      <title>Print Invoice</title>
      <style>
        body { font-family: Arial, sans-serif; color: black; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        
        .header { 
          background: linear-gradient(90deg, #F23A41 0%, #6E3AA8 100%); 
          color: black !important; 
          padding: 20px; 
        }
        .header h1, .header h3, .header p { color: black !important; }
        .whitebox { background-color: white; padding: 20px; }
        .total-section { margin-top: 20px; text-align: right; }
        @media print {
          body, .header, .header h1, .header h3, .header p { color: black !important; }
        }
      </style>
    </head>
        <body>
          <div class="header">
            <h1>Invoice</h1>
            <h3>${data?.details?.doctorName}</h3>
            <p>${data?.details?.medicalDegree} | Reg.No: ${data?.details?.registrationNumber} | Mob.No: ${data?.mobileNumber}</p>
            <h3>${data?.details?.hospitalName}</h3>
            <p>${data?.details?.address}</p>
            <p>Date: ${invoiceData?.date}</p>
            <p>Patient Name: ${invoiceData?.patientName}</p>
          </div>
          <div class="whitebox">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Item Description</th>
                  <th>Qty</th>
                  <th>Per Item</th>
                  <th>Total Charges</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceItems}
              </tbody>
            </table>
           
          </div>
          <div style="text-align: right; margin-top: 20px; font-weight: bold;">Total Amount Paid ${invoiceData?.total}</div>
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
  const [invoiceData, setInvoiceData] = useState([])

  useEffect(() => {
    getInvoiceList()
  }, [])

  const getInvoiceList = async () => {
    const instance = NetworkManager(API.INVOICE.GET_INVOICE)
    const response = await instance.request(
      {},
      { appointementDate: GET_API_DATE(appointmentDate), appointementTime: appointmentTime }
    )
    // setInvoiceData(response?.data?.data?.invoiceData)
    setInvoiceData(response?.data?.data)
  }

  //for total

  // const totalAmount = invoiceData?.invoice_data?.reduce((acc, element) => {
  //   const itemTotal = element?.charge_per_item * element?.qty
  //   return acc + itemTotal
  // }, 0)

  // Add GST (assuming GST is 18%)
  // const discount = 5
  // const disctAmount = (discount / 100) * totalAmount

  // Calculate final effective total
  // const finalTotal = totalAmount - disctAmount

  return (
    <Dialog
      PaperProps={{ sx: { width: "650px", height: "710px" } }}
      maxWidth="md"
      open={openPopup}
      onClose={closePopup}
      TransitionComponent={Transition}
      keepMounted
      aria-describedby="alert-dialog-slide-description">
      <DialogContent>
        <div ref={pdfRef} className={classes.invoice}>
          <div className={classes.header}>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <HiDownload className={classes.print_logo} onClick={downloadPdF} />
                <IoPrintOutline className={classes.print_logo} onClick={printPrescription} />
                <p className={classes.header_title}>Invoice</p>
                <p className={classes.header_recipient}>RECIPIENT</p>
                <span>Name:</span>
                <span>{invoiceData?.patientName}</span>
              </Grid>
              <Grid item xs={8}>
                <div className={classes.invoice_num_date}>
                  <p>
                    Invoice Date<br></br>
                    <span>{invoiceData?.date}</span>
                  </p>
                </div>
              </Grid>
            </Grid>

            <section className={classes.header}>
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
          </div>

          <div className={classes.whitebox}>
            <div className={classes.invoce_content}>
              <div className={classes.contentHeading}>
                <Grid container spacing={5}>
                  <Grid item xs={1}>
                    No
                  </Grid>
                  <Grid item xs={5}>
                    Item Description
                  </Grid>

                  <Grid item xs={2}>
                    Qty
                  </Grid>
                  <Grid item xs={2}>
                    Per Item
                  </Grid>
                  <Grid item xs={2}>
                    Total Charges
                  </Grid>
                </Grid>
              </div>

              {invoiceData?.invoiceData?.map((element, index) =>
                element ? (
                  <div
                    className={classes.invoiceDescription}
                    style={
                      {
                        // backgroundColor: index % 2 == 0 ? "rgba(189, 189, 189, 0.75)" : "white"
                      }
                    }
                    key={index}>
                    <Grid container spacing={5} key={index}>
                      <Grid item xs={1}>
                        {index + 1}
                      </Grid>
                      <Grid item xs={5}>
                        {element?.item || "Doctor Fee"}
                      </Grid>
                      <Grid item xs={2}>
                        {element?.qty || "N/A"}
                      </Grid>
                      <Grid item xs={2}>
                        {element?.charges ? element.charges / element.qty : element?.doctorFee}
                      </Grid>
                      <Grid item xs={2}>
                        {element?.charges || element?.doctorFee}
                      </Grid>
                    </Grid>
                  </div>
                ) : (
                  <></>
                )
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      <div className={classes.subTotalContainer}>
        <div className={classes.subTotal}>
          <span>Total Amount Paid</span>
          <span>{invoiceData?.total}</span>
        </div>
      </div>
    </Dialog>
  )
}

const useStyles = makeStyles()(() => ({
  invoice: {
    width: 600,
    height: 750,
    border: "5 solid black",
    flexShrink: 0
  },
  header: {
    color: "white",
    paddingLeft: 30,
    paddingTop: 2,
    borderRadius: 20,
    background: "linear-gradient(90deg, #F23A41 0%, #6E3AA8 100%)",
    height: 380
  },
  hospital_logo: {
    width: 110,
    height: 40,
    marginTop: 40,
    paddingTop: 2
  },
  header_title: {
    marginTop: 0,
    color: "white",
    fontFamily: "Poppins",
    fontSize: 30,
    fontStyle: "normal",
    fontWeight: 700,
    lineHeight: "normal"
  },
  header_recipient: {
    fontSize: 12,
    marginTop: 0,
    fontStyle: "normal",
    fontWeight: 700,
    letterSpacing: 0.002,
    textTransform: "uppercase"
  },
  download_print_logo: {
    marginLeft: 240,
    marginTop: 55,
    display: "inlineFlex",
    alignItems: "flexStart",
    gap: 23
  },
  print_logo: {
    width: 24,
    height: 24,
    cursor: "pointer",
    color: "white", // This ensures the icons are visible on the colored background
    marginLeft: "10px" // This adds some space between the icons
  },
  invoice_num_date: {
    marginLeft: 160,
    marginTop: 100,
    fontSize: 15,
    textAlign: "right",
    marginRight: 60
  },
  whitebox: {
    height: 400,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 20,
    display: "flex",
    justifyContent: "center",
    marginTop: -30
  },
  invoce_content: {
    display: "flex",
    flexDirection: "column",
    width: 550,
    height: 360,
    backgroundColor: "white",
    marginTop: -60,
    borderRadius: 20
  },
  contentDetails: {
    marginTop: 15
  },
  contentHeading: {
    marginLeft: 25,
    marginRight: 25,
    textAlign: "center",
    justifyContent: "center",
    marginTop: 20,
    height: 40,
    width: 500
  },
  invoiceDescription: {
    textAlign: "center",
    borderRadius: 10,
    marginLeft: 20,
    marginRight: 20,
    paddingLeft: 5,
    marginTop: 5,
    height: 30,
    width: 500
  },
  total: {
    float: "right"
  },
  finalTotal: {
    color: "red"
  },
  subTotalContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "20px",
    marginRight: "80px"
  },
  subTotal: {
    display: "flex",
    justifyContent: "space-between",
    width: "200px",
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px"
  }
}))

export default Invoice
