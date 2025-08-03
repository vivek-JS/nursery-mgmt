import React, { useState } from "react"
import { Grid, Button, Box, Badge, Alert } from "@mui/material"
import { makeStyles } from "tss-react/mui"
import { Add as AddIcon, Phone as PhoneIcon } from "@mui/icons-material"
import FarmerOrdersTable from "./FarmerOrdersTable"
import AddOrderForm from "../order/AddOrderForm"
import { FarmerPhoneCorrectionModal, ExcelExport } from "components"
import useInvalidPhoneFarmers from "hooks/useInvalidPhoneFarmers"

function Dashboard() {
  const { classes } = useStyles()
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false)
  const [isFarmerPhoneModalOpen, setIsFarmerPhoneModalOpen] = useState(false)
  const { count: invalidPhoneCount, refetch: refetchInvalidPhoneCount } = useInvalidPhoneFarmers()

  const handleAddOrderSuccess = () => {
    // Refresh the orders table
    window.location.reload()
  }

  return (
    <Grid className={classes.padding14}>
      {invalidPhoneCount > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => setIsFarmerPhoneModalOpen(true)}>
              Fix Now
            </Button>
          }>
          {invalidPhoneCount} farmer(s) have invalid phone numbers that need to be corrected.
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <h1>Orders</h1>
        <Box display="flex" gap={2}>
          <ExcelExport
            title="Export All Orders"
            onExportComplete={() => {
              console.log("Orders exported successfully!")
            }}
          />
          <Badge badgeContent={invalidPhoneCount} color="error" max={99}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<PhoneIcon />}
              onClick={() => setIsFarmerPhoneModalOpen(true)}
              className={classes.addButton}
              disabled={invalidPhoneCount === 0}>
              Fix Invalid Phones
            </Button>
          </Badge>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsAddOrderOpen(true)}
            className={classes.addButton}>
            Add Order
          </Button>
        </Box>
      </Box>

      <FarmerOrdersTable />

      <AddOrderForm
        open={isAddOrderOpen}
        onClose={() => setIsAddOrderOpen(false)}
        onSuccess={handleAddOrderSuccess}
      />

      <FarmerPhoneCorrectionModal
        open={isFarmerPhoneModalOpen}
        onClose={() => {
          setIsFarmerPhoneModalOpen(false)
          refetchInvalidPhoneCount()
        }}
      />
    </Grid>
  )
}

export default Dashboard
const useStyles = makeStyles()(() => ({
  padding14: {
    padding: 14
  },
  addButton: {
    height: 40,
    textTransform: "none",
    fontSize: "1rem",
    fontWeight: 500
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
