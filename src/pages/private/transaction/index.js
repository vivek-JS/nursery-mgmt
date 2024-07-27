import React, { useState } from "react"
import { Button, Chip, Grid } from "@mui/material"
import { PageLoader } from "components"
import { makeStyles } from "tss-react/mui"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import dayjs from "dayjs"
import { NetworkManager, API } from "network/core"
import { useEffect } from "react"
import moment from "moment"
import StatCard from "../dashboard/statCard"
import { LocalizationProvider } from "@mui/x-date-pickers"
// import { DateRangePicker } from "@mui/x-date-pickers-pro/DateRangePicker"
import { DateRangePicker } from "@mui/x-date-pickers-pro"
import { getDynamicStyle } from "utils/gridUtils"
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf"
import Invoice from "../dashboard/Invoice"

function Transactions() {
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [invoiceData, setInvoiceData] = useState({ appointmentTime: "", appointmentDate: "" })
  const openInvoice = (appointmentTime, appointmentDate) => {
    setIsInvoiceOpen(true)
    setInvoiceData({ appointmentTime, appointmentDate })
  }
  const closeInvoice = () => {
    setIsInvoiceOpen(false)
  }

  const [value, setValue] = React.useState([dayjs(), dayjs()])

  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [paymentArray, setPaymentArray] = useState([])
  useEffect(() => {
    getAppointments()
  }, [value])
  const { classes } = useStyles()

  const getAppointments = async () => {
    setLoading(true)

    const year = value[0].$y
    const month = value[0].$M + 1
    const day = value[0].$D

    const startDate = `${year}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`

    const edyear = value[1].$y
    const edmonth = value[1].$M + 1
    const edday = value[1].$D

    const endDate = `${edyear}-${edmonth.toString().padStart(2, "0")}-${edday
      .toString()
      .padStart(2, "0")}`

    const instance = NetworkManager(API.PAYMENTS.GET_PAYMENTS)
    const result = await instance.request(
      {},
      {
        startDate: startDate,
        endDate: endDate
      }
    )
    setPaymentArray(result?.data?.data?.transcationData)
    setStats(result?.data?.data)
    setLoading(false)
  }
  const downloadCsv = async () => {
    const instance = NetworkManager(API.PAYMENTS.GET_PAYMENTS_CSV)

    const year = value[0].$y
    const month = value[0].$M + 1
    const day = value[0].$D

    const startDate = `${year}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`

    const edyear = value[1].$y
    const edmonth = value[1].$M + 1
    const edday = value[1].$D

    const endDate = `${edyear}-${edmonth.toString().padStart(2, "0")}-${edday
      .toString()
      .padStart(2, "0")}`

    const result = await instance.request(
      {},
      {
        startDate: startDate,
        endDate: endDate
      }
    )
    const url = window.URL.createObjectURL(new Blob([result?.data], { type: "text/csv" }))
    const link = document.createElement("a")
    link.href = url
    link.setAttribute(
      "download",
      `${moment(value[0]?.$d).format("DD-MM-YYYY")}-${moment(value[1]?.$d).format(
        "DD-MM-YYYY"
      )}.csv`
    )
    document.body.appendChild(link)
    link.click()
  }
  return (
    <div>
      <Grid className={classes.container}>
        {loading && <PageLoader />}
        <Grid container justifyContent={"space-between"}>
          <h1 className={classes.header}>Transactions</h1>
          <Grid className={classes.dateContainer}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateRangePicker value={value} onChange={(newValue) => setValue(newValue)} />
            </LocalizationProvider>
            <Button
              onClick={downloadCsv}
              className={`csv-btn ${classes.csvButton}`}
              variant="contained">
              Export CSV
            </Button>
          </Grid>
        </Grid>
        <hr />
        <Grid container className={classes.statsContainer}>
          <StatCard
            heading={"Earnings"}
            value={`₹ ${stats?.totalEarnings}` || "-"}
            nomargin={true}></StatCard>
          <StatCard
            heading={"Payment Recived"}
            value={`₹ ${stats?.paymentReceived}` || "-"}></StatCard>

          <StatCard
            heading={"Payment Pending"}
            value={`₹ ${stats?.paymentPending}` || "-"}></StatCard>

          <StatCard heading={"Cash Paymenyt"} value={`₹ ${stats?.paymentByCash}` || "-"}></StatCard>
          <StatCard heading={"UPI Paymenyt"} value={`₹ ${stats?.paymentByUPI}` || "-"}></StatCard>
        </Grid>
        <Grid container className={classes.inventoryContainer}>
          <Grid container className={classes.tableHead}>
            <Grid item style={getDynamicStyle(1, 8, 14, true)} className={classes.label}>
              Sr
            </Grid>
            <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.label}>
              Patinet Name
            </Grid>

            <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.label}>
              Mobile Number
            </Grid>
            <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.label}>
              Amount
            </Grid>
            <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.label}>
              Date
            </Grid>
            <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.label}>
              Payment Status
            </Grid>
            <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.label}>
              Payment Mode
            </Grid>
            <Grid
              item
              style={getDynamicStyle(1, 8, 14, true)}
              className={`${classes.label} ${classes.noMarginRight}`}>
              Invoice
            </Grid>
          </Grid>
          {paymentArray?.map((payment, index) => {
            return (
              <Grid container className={classes.tableRow} key={"index" + 1}>
                <Grid
                  item
                  style={getDynamicStyle(1, 8, 14, true)}
                  alignItems="flex-start"
                  className={classes.tableCell}>
                  {" "}
                  {index + 1}
                </Grid>
                <Grid
                  item
                  style={getDynamicStyle(2, 8, 14, true)}
                  alignItems="flex-start"
                  className={`${classes.tableCell} ${classes.nameClass}`}>
                  {payment?.["Patient Name"]}
                </Grid>
                <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.tableCell}>
                  {payment?.["Mobile Number"]}
                </Grid>
                <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.tableCell}>
                  {payment?.Amount ? `₹ ${payment?.Amount}` : "-"}
                </Grid>
                <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.tableCell}>
                  {payment?.Date || "-"}
                </Grid>
                <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.tableCell}>
                  {payment?.["Payment Status"] === "Paid" ? (
                    <Chip
                      sx={{
                        width: 100
                      }}
                      label="Paid"
                      color="success"
                    />
                  ) : (
                    <Chip
                      sx={{
                        width: 100
                      }}
                      label="Pending"
                      color="warning"
                    />
                  )}
                </Grid>
                <Grid item style={getDynamicStyle(2, 8, 14, true)} className={classes.tableCell}>
                  {payment?.["Payment Mode"]
                    ? payment?.["Payment Mode"] === "by_upi"
                      ? "UPI"
                      : "Cash"
                    : "N/A"}
                </Grid>
                <Grid
                  item
                  style={getDynamicStyle(1, 8, 14, true)}
                  className={`${classes.tableCell} ${classes.noMarginRight}`}>
                  <PictureAsPdfIcon
                    onClick={() =>
                      openInvoice(
                        payment["Appointment Time"],
                        moment(payment?.Date, "DD-MM-YYYY").format("YYYY-M-D")
                      )
                    }
                    style={{ color: "green", height: 35, cursor: "pointer" }}
                  />
                </Grid>
              </Grid>
            )
          })}
        </Grid>{" "}
      </Grid>
      {isInvoiceOpen && (
        <Invoice
          openPopup={isInvoiceOpen}
          closePopup={closeInvoice}
          appointmentTime={invoiceData.appointmentTime}
          appointmentDate={invoiceData.appointmentDate}
        />
      )}
    </div>
  )
}

export default Transactions
const useStyles = makeStyles()(() => ({
  csvButton: {
    boxShadow: "none",
    border: "1px solid #EDECF5",
    marginLeft: 20,
    height: 35,
    maxWidth: 170,
    borderRadius: 4,
    fontSize: "0.8125rem",
    "@media (max-width:1280px)": {
      fontSize: "0.75rem"
    }
  },
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
  },
  header: {
    marginTop: -10,
    paddingLeft: 18
  },
  dateContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    "& .MuiStack-root .MuiTextField-root .MuiOutlinedInput-root": {
      height: 40
    }
  },
  inventoryContainer: {
    padding: 5,
    background: "#F0F0F0",
    marginTop: 12
  },
  noMarginRight: {
    marginRight: 0,
    cursor: "pointer"
  },
  label: {
    height: 35,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 5,
    fontSize: 17,
    fontWeight: 700,
    flexDirection: "column",
    background: "#FFF",
    color: "#3A4BB6",
    marginRight: "0.7%"
  },

  tableHead: {
    boxShadow: "0px 3px 3px 0px rgba(0, 0, 0, 0.15)",
    color: "black",
    background: "#FFF"
  },
  tableCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 5,
    flexDirection: "column",
    background: "#FFF",
    height: 43,
    fontWeight: 500,
    fontSize: 17,

    "& .MuiFormControl-root": {
      height: "85%",
      "& .MuiInputBase-root": {
        height: "80%",
        display: "flex",
        justifyContent: "center"
      }
    },
    marginRight: "0.7%"
  },
  tableRow: {
    marginTop: 4
  },
  nameClass: {
    alignItems: "flex-start",
    paddingLeft: 10
  }
}))
