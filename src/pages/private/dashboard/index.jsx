import React, { useState, useEffect, useCallback } from "react"
import { Grid, Button, Box, Badge, Tabs, Tab } from "@mui/material"
import { makeStyles } from "tss-react/mui"
import { Add as AddIcon, Phone as PhoneIcon, Backup as BackupIcon } from "@mui/icons-material"
import { useNavigate, useLocation } from "react-router-dom"
import { useSelector } from "react-redux"
import FarmerOrdersTable from "./FarmerOrdersTable"
import AvailableStockView from "./AvailableStockView"
import { DASHBOARD_TAB_KEY, readAndClearStockPrefill } from "./availableStockUtils"
import {
  readAndClearCopyOrderPrefill,
  COPY_ORDER_OPEN_EVENT,
} from "utils/copyOrderPrefill"
import AddOrderForm from "../order/AddOrderForm"
import { FarmerPhoneCorrectionModal, ExcelExport } from "components"
import useInvalidPhoneFarmers from "hooks/useInvalidPhoneFarmers"

const TAB_BOOKING = 0
const TAB_STOCK = 1

function Dashboard() {
  const { classes } = useStyles()
  const navigate = useNavigate()
  const location = useLocation()
  const userRole = useSelector((state) => state?.userData?.userData?.role)
  const jobTitle = useSelector((state) => state?.userData?.userData?.jobTitle)
  const isSuperAdmin =
    userRole === "SUPER_ADMIN" ||
    userRole === "SUPERADMIN" ||
    jobTitle === "SUPER_ADMIN" ||
    jobTitle === "SUPERADMIN"
  const [mainTab, setMainTab] = useState(() => {
    const saved = sessionStorage.getItem(DASHBOARD_TAB_KEY)
    return saved === "stock" ? TAB_STOCK : TAB_BOOKING
  })
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false)
  const [orderPrefill, setOrderPrefill] = useState(null)
  const [copyOrderPrefill, setCopyOrderPrefill] = useState(null)
  const [isFarmerPhoneModalOpen, setIsFarmerPhoneModalOpen] = useState(false)
  const { count: invalidPhoneCount, refetch: refetchInvalidPhoneCount } = useInvalidPhoneFarmers()

  const handleMainTabChange = (_e, value) => {
    setMainTab(value)
    sessionStorage.setItem(DASHBOARD_TAB_KEY, value === TAB_STOCK ? "stock" : "booking")
  }

  const handleAddOrderSuccess = () => {
    window.location.reload()
  }

  const openAddOrder = useCallback((prefill = null, copyPrefill = null) => {
    setOrderPrefill(prefill)
    setCopyOrderPrefill(copyPrefill)
    setIsAddOrderOpen(true)
  }, [])

  const handleCloseAddOrder = useCallback(() => {
    setIsAddOrderOpen(false)
    setOrderPrefill(null)
    setCopyOrderPrefill(null)
  }, [])

  const handleCopyOrderFromTable = useCallback(
    (copyPrefill) => {
      openAddOrder(null, copyPrefill)
    },
    [openAddOrder]
  )

  const handleBookFromStock = useCallback((row) => {
    openAddOrder({
      initialPlantId: row.plantId,
      initialSubtypeId: row.subtypeId,
      initialSlotId: row.slotId,
      initialStartDay: row.startDay,
    })
  }, [openAddOrder])

  useEffect(() => {
    const fromStorage = readAndClearStockPrefill()
    const prefill =
      fromStorage ||
      (location.state?.bookSlot
        ? {
            initialPlantId: location.state.bookSlot.plantId,
            initialSubtypeId: location.state.bookSlot.subtypeId,
            initialSlotId: location.state.bookSlot.slotId,
            initialStartDay: location.state.bookSlot.startDay,
          }
        : null)
    if (prefill) {
      openAddOrder(prefill)
      navigate(location.pathname, { replace: true, state: {} })
    } else if (location.state?.openAddOrder) {
      openAddOrder()
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, []) // run once on mount for MIS → Book handoff

  useEffect(() => {
    const onCopyOrderEvent = () => {
      const copyPrefill = readAndClearCopyOrderPrefill()
      if (copyPrefill) openAddOrder(null, copyPrefill)
    }
    window.addEventListener(COPY_ORDER_OPEN_EVENT, onCopyOrderEvent)
    return () => window.removeEventListener(COPY_ORDER_OPEN_EVENT, onCopyOrderEvent)
  }, [openAddOrder])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase?.() || ""
      const isTextField =
        tag === "input" || tag === "textarea" || tag === "select" || event.target?.isContentEditable

      if (isTextField) return

      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      if (event.shiftKey) return
      if (event.altKey) return
      if (event.code !== "KeyA") return

      event.preventDefault()
      openAddOrder()
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [openAddOrder])

  const headerActions = (
    <Box display="flex" gap={2} flexWrap="wrap">
      {mainTab === TAB_BOOKING && isSuperAdmin ? (
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<BackupIcon />}
          onClick={() => navigate("/u/database-backup")}
          className={classes.addButton}>
          Database Backup
        </Button>
      ) : null}
      {mainTab === TAB_BOOKING ? (
        <ExcelExport
          title="Export All Orders"
          onExportComplete={() => {
            console.log("Orders exported successfully!")
          }}
        />
      ) : null}
      {mainTab === TAB_BOOKING ? (
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
      ) : null}
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={() => openAddOrder()}
        className={classes.addButton}>
        Add Order
      </Button>
    </Box>
  )

  return (
    <Grid className={classes.padding14}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={2}>
        <Box>
          <h1 style={{ margin: 0 }}>Orders</h1>
          <Tabs value={mainTab} onChange={handleMainTabChange} sx={{ mt: 1 }}>
            <Tab label="Booking & Dispatch" sx={{ textTransform: "none", fontWeight: 600 }} />
            <Tab label="Available Stock" sx={{ textTransform: "none", fontWeight: 600 }} />
          </Tabs>
        </Box>
        {headerActions}
      </Box>

      {mainTab === TAB_BOOKING ? <FarmerOrdersTable onCopyOrder={handleCopyOrderFromTable} /> : null}
      {mainTab === TAB_STOCK ? (
        <AvailableStockView variant="dashboard" onBookSlot={handleBookFromStock} showBookAction />
      ) : null}

      <AddOrderForm
        open={isAddOrderOpen}
        onClose={handleCloseAddOrder}
        onSuccess={handleAddOrderSuccess}
        initialPlantId={orderPrefill?.initialPlantId}
        initialSubtypeId={orderPrefill?.initialSubtypeId}
        initialSlotId={orderPrefill?.initialSlotId}
        initialStartDay={orderPrefill?.initialStartDay}
        copyFromOrder={copyOrderPrefill}
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
    padding: 14,
  },
  addButton: {
    height: 40,
    textTransform: "none",
    fontSize: "1rem",
    fontWeight: 500,
  },
  searchContainer: {
    boxShadow: " 0px 4px 5px 0px rgba(0, 0, 0, 0.10)",
    paddingBottom: 12,
  },
  btnContainer: {
    marginLeft: 15,
  },
  flexDisplay: {
    display: "flex",
  },
  statsContainer: {
    marginTop: 24,
    justifyContent: "center",
    gap: 12,
  },
  listandgraphcontainer: {
    marginTop: 16,
    height: "85vh",
    marginLeft: 16,
  },
  listContainer: {},
  graphscontainer: {
    paddingLeft: 8,
  },
  nurseListHeader: {
    padding: "20px 10px 10px 10px",
  },
  todayTxt: {
    fontSize: 20,
    fontWeight: 700,
  },
  calender: {
    color: "#4E43D6",
    fontSize: "16px",
    fontWeight: "400",
  },
  nurseListContainer: {
    background: "#E4E5E7",
    height: "75vh",
    padding: 4,
    paddingTop: "unset",
    overflow: "overlay",
  },
  graphs: {
    background: "#E4E5E7",
    width: "100%",
    height: "100%",
    padding: 6,
    borderRadius: 6,
  },
  graphOne: {
    background: "#FFFFFF",
    height: "49.5%",
  },
  graphTwo: {
    background: "#FFFFFF",
    height: "49.5%",
  },
  multiSelect: {
    backgroundColor: "#EEEEEE",
    borderRadius: 4,
    width: 180,
    marginRight: 10,
    marginLeft: 10,
    height: "45px !important",
  },
}))
