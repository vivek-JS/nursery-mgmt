import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Button,
  Tab,
  Tabs,
  Typography,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress,
  FormControlLabel,
  Switch,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import dayjs from "dayjs"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import RefreshIcon from "@mui/icons-material/Refresh"
import FileDownloadIcon from "@mui/icons-material/FileDownload"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import GrassIcon from "@mui/icons-material/Grass"
import PersonIcon from "@mui/icons-material/Person"
import StorefrontIcon from "@mui/icons-material/Storefront"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import MenuBookIcon from "@mui/icons-material/MenuBook"
import Inventory2Icon from "@mui/icons-material/Inventory2"
import { API, NetworkManager } from "network/core"
import AvailableStockView from "../dashboard/AvailableStockView"
import { saveStockPrefill } from "../dashboard/availableStockUtils"
import moment from "moment"
import MisOrderDrawer from "./MisOrderDrawer"
import MisDailyTable from "./MisDailyTable"
import MisVarietyTable from "./MisVarietyTable"
import MisBreakdownTable from "./MisBreakdownTable"
import { DELIVERY_BUCKETS, fmt, asDisplayLabel, formatDuePlus, duePlusCaption } from "./misConstants"
import { breakdownRowsToCsv, downloadCsv } from "./misExportUtils"
import MisGuideJoyride from "./MisGuideJoyride"

const TAB_PLANT = 0
const TAB_DUE = 1
const TAB_SALES = 2
const TAB_DEALER = 3
const TAB_DAILY = 4
const TAB_STOCK = 5

function dateParams(startDate, endDate, dueOnly, includeAllPastDue) {
  const params = {
    // Bust stale browser cache (304 + old ETag after MIS deploys)
    _: String(Date.now()),
  }
  if (startDate) params.startDate = startDate.format("YYYY-MM-DD")
  if (endDate) params.endDate = endDate.format("YYYY-MM-DD")
  if (dueOnly) params.dueOnly = "true"
  if (includeAllPastDue) params.includeAllPastDue = "true"
  return params
}

function AdminStatsPage() {
  const navigate = useNavigate()
  const userData = useSelector((s) => s?.userData?.userData)

  const isAdmin =
    userData?.jobTitle === "ADMIN" ||
    userData?.jobTitle === "SUPER_ADMIN" ||
    userData?.jobTitle === "SUPERADMIN" ||
    userData?.role === "ADMIN" ||
    userData?.role === "SUPER_ADMIN" ||
    userData?.role === "SUPERADMIN"

  useEffect(() => {
    if (userData && !isAdmin) navigate("/u/dashboard", { replace: true })
  }, [userData, isAdmin, navigate])

  const [tab, setTab] = useState(TAB_PLANT)
  const [startDate, setStartDate] = useState(dayjs())
  const [endDate, setEndDate] = useState(dayjs())

  const [mis, setMis] = useState(null)
  const [misLoading, setMisLoading] = useState(false)
  const [misError, setMisError] = useState("")

  const [salesMis, setSalesMis] = useState(null)
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesError, setSalesError] = useState("")

  const [dealerMis, setDealerMis] = useState(null)
  const [dealerLoading, setDealerLoading] = useState(false)
  const [dealerError, setDealerError] = useState("")

  const [dueMis, setDueMis] = useState(null)
  const [dueLoading, setDueLoading] = useState(false)
  const [dueError, setDueError] = useState("")

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerFilter, setDrawerFilter] = useState(null)
  const [dueOnly, setDueOnly] = useState(false)
  const [includeAllPastDue, setIncludeAllPastDue] = useState(false)

  const [joyrideRun, setJoyrideRun] = useState(false)
  const [joyrideKey, setJoyrideKey] = useState(0)
  const [stockRefreshKey, setStockRefreshKey] = useState(0)

  const salesFetchedKeyRef = useRef(null)
  const dealerFetchedKeyRef = useRef(null)
  const dueFetchedKeyRef = useRef(null)
  const salesFetchInFlightRef = useRef(false)
  const dealerFetchInFlightRef = useRef(false)
  const dueFetchInFlightRef = useRef(false)

  const rangeKey = useMemo(
    () =>
      `${startDate?.format("YYYY-MM-DD")}_${endDate?.format("YYYY-MM-DD")}_due${dueOnly}_all${includeAllPastDue}`,
    [startDate, endDate, dueOnly, includeAllPastDue]
  )

  const fetchMis = useCallback(async () => {
    if (!isAdmin) return
    setMisLoading(true)
    setMisError("")
    try {
      const instance = NetworkManager(API.ORDER.ADMIN_DAILY_MIS)
      const res = await instance.request({}, dateParams(startDate, endDate, dueOnly, includeAllPastDue))
      if (res?.success) setMis(res.data?.data || res.data)
      else setMisError(res?.message || "Failed to load MIS")
    } catch (err) {
      setMisError(err?.response?.data?.message || err?.message || "Failed to load MIS")
    } finally {
      setMisLoading(false)
    }
  }, [isAdmin, startDate, endDate, dueOnly, includeAllPastDue])

  useEffect(() => {
    fetchMis()
  }, [fetchMis])

  const fetchSalesMisStamped = useCallback(
    async (force = false) => {
      if (!isAdmin) return
      if (!force && salesFetchedKeyRef.current === rangeKey) return
      if (salesFetchInFlightRef.current) return

      salesFetchInFlightRef.current = true
      setSalesLoading(true)
      setSalesError("")
      const requestKey = rangeKey

      try {
        const instance = NetworkManager(API.ORDER.ADMIN_MIS_SALES)
        const res = await instance.request({}, dateParams(startDate, endDate, dueOnly, includeAllPastDue))
        if (requestKey !== rangeKey) return
        if (res?.success) {
          const data = res.data?.data || res.data
          salesFetchedKeyRef.current = requestKey
          setSalesMis(data || null)
        } else {
          salesFetchedKeyRef.current = null
          setSalesMis(null)
          setSalesError(res?.message || "Failed to load sales MIS")
        }
      } catch (err) {
        if (requestKey !== rangeKey) return
        salesFetchedKeyRef.current = null
        setSalesMis(null)
        setSalesError(err?.response?.data?.message || err?.message || "Failed to load sales MIS")
      } finally {
        salesFetchInFlightRef.current = false
        if (requestKey === rangeKey) setSalesLoading(false)
      }
    },
    [isAdmin, startDate, endDate, rangeKey, dueOnly, includeAllPastDue]
  )

  const fetchDueMisStamped = useCallback(
    async (force = false) => {
      if (!isAdmin) return
      if (!force && dueFetchedKeyRef.current === rangeKey) return
      if (dueFetchInFlightRef.current) return

      dueFetchInFlightRef.current = true
      setDueLoading(true)
      setDueError("")
      const requestKey = rangeKey

      try {
        const instance = NetworkManager(API.ORDER.ADMIN_MIS_DUE)
        const res = await instance.request(
          {},
          {
            ...dateParams(startDate, endDate, true, includeAllPastDue),
          }
        )
        if (requestKey !== rangeKey) return
        if (res?.success) {
          const data = res.data?.data || res.data
          dueFetchedKeyRef.current = requestKey
          setDueMis(data || null)
        } else {
          dueFetchedKeyRef.current = null
          setDueMis(null)
          setDueError(res?.message || "Failed to load due MIS")
        }
      } catch (err) {
        if (requestKey !== rangeKey) return
        dueFetchedKeyRef.current = null
        setDueMis(null)
        setDueError(err?.response?.data?.message || err?.message || "Failed to load due MIS")
      } finally {
        dueFetchInFlightRef.current = false
        if (requestKey === rangeKey) setDueLoading(false)
      }
    },
    [isAdmin, startDate, endDate, rangeKey, includeAllPastDue]
  )

  const fetchDealerMisStamped = useCallback(
    async (force = false) => {
      if (!isAdmin) return
      if (!force && dealerFetchedKeyRef.current === rangeKey) return
      if (dealerFetchInFlightRef.current) return

      dealerFetchInFlightRef.current = true
      setDealerLoading(true)
      setDealerError("")
      const requestKey = rangeKey

      try {
        const instance = NetworkManager(API.ORDER.ADMIN_MIS_DEALER)
        const res = await instance.request({}, dateParams(startDate, endDate, dueOnly, includeAllPastDue))
        if (requestKey !== rangeKey) return
        if (res?.success) {
          const data = res.data?.data || res.data
          dealerFetchedKeyRef.current = requestKey
          setDealerMis(data || null)
        } else {
          dealerFetchedKeyRef.current = null
          setDealerMis(null)
          setDealerError(res?.message || "Failed to load dealer MIS")
        }
      } catch (err) {
        if (requestKey !== rangeKey) return
        dealerFetchedKeyRef.current = null
        setDealerMis(null)
        setDealerError(err?.response?.data?.message || err?.message || "Failed to load dealer MIS")
      } finally {
        dealerFetchInFlightRef.current = false
        if (requestKey === rangeKey) setDealerLoading(false)
      }
    },
    [isAdmin, startDate, endDate, rangeKey, dueOnly, includeAllPastDue]
  )

  useEffect(() => {
    if (!isAdmin || tab !== TAB_SALES) return
    if (salesFetchedKeyRef.current === rangeKey) return
    fetchSalesMisStamped()
  }, [tab, rangeKey, isAdmin, fetchSalesMisStamped])

  useEffect(() => {
    if (!isAdmin || tab !== TAB_DEALER) return
    if (dealerFetchedKeyRef.current === rangeKey) return
    fetchDealerMisStamped()
  }, [tab, rangeKey, isAdmin, fetchDealerMisStamped])

  useEffect(() => {
    if (!isAdmin || tab !== TAB_DUE) return
    if (dueFetchedKeyRef.current === rangeKey) return
    fetchDueMisStamped()
  }, [tab, rangeKey, isAdmin, fetchDueMisStamped])

  const days = mis?.days || []
  const totals = mis?.totals
  const varietyRows = mis?.varietyTable || []
  const varietyTotals = mis?.varietyTotals
  const salesRows = salesMis?.rows || []
  const salesTotals = salesMis?.totals
  const dealerRows = dealerMis?.rows || []
  const dealerTotals = dealerMis?.totals
  const dueDays = dueMis?.days || []
  const dueTotals = dueMis?.totals
  const dueSalesRows = dueMis?.salesTable || []
  const dueSalesTotals = dueMis?.salesTotals
  const dueDealerRows = dueMis?.dealerTable || []
  const dueDealerTotals = dueMis?.dealerTotals

  const activeDueSummary = useMemo(() => {
    if (tab === TAB_DUE) return dueMis?.dueSummary
    if (tab === TAB_SALES) return salesMis?.dueSummary
    if (tab === TAB_DEALER) return dealerMis?.dueSummary
    return mis?.dueSummary
  }, [tab, mis, salesMis, dealerMis, dueMis])

  const dueDisplay = useMemo(
    () => ({
      includeAllPastDue,
      dueSummary: activeDueSummary,
    }),
    [includeAllPastDue, activeDueSummary]
  )

  const drawerRangeFlags = useMemo(
    () => ({
      includeAllPastDue,
      dueSummary: activeDueSummary,
    }),
    [includeAllPastDue, activeDueSummary]
  )

  const rangeStart =
    mis?.startDate ||
    dueMis?.startDate ||
    salesMis?.startDate ||
    dealerMis?.startDate ||
    startDate?.format("YYYY-MM-DD")
  const rangeEnd =
    mis?.endDate || dueMis?.endDate || salesMis?.endDate || dealerMis?.endDate || endDate?.format("YYYY-MM-DD")

  const openDailyCell = (date, payload) => {
    setDrawerFilter({
      date,
      scope: tab === TAB_DUE ? "due" : "daily",
      rangeStart,
      rangeEnd,
      ...drawerRangeFlags,
      dueOnly: tab === TAB_DUE || dueOnly,
      pastDueOnly: date === "past-due",
      ...payload,
    })
    setDrawerOpen(true)
  }

  const openVarietyCell = (payload) => {
    setDrawerFilter({ scope: "variety", rangeStart, rangeEnd, dueOnly, ...drawerRangeFlags, ...payload })
    setDrawerOpen(true)
  }

  const openSalesCell = (payload) => {
    setDrawerFilter({
      scope: "sales",
      rangeStart: salesMis?.startDate || dueMis?.startDate || rangeStart,
      rangeEnd: salesMis?.endDate || dueMis?.endDate || rangeEnd,
      salesPersonId: payload.personId,
      dueOnly: tab === TAB_DUE || dueOnly,
      ...drawerRangeFlags,
      ...payload,
    })
    setDrawerOpen(true)
  }

  const openDealerCell = (payload) => {
    setDrawerFilter({
      scope: "dealer",
      rangeStart: dealerMis?.startDate || rangeStart,
      rangeEnd: dealerMis?.endDate || rangeEnd,
      dealerId: payload.personId,
      dueOnly: tab === TAB_DUE || dueOnly,
      ...drawerRangeFlags,
      ...payload,
    })
    setDrawerOpen(true)
  }

  const openDueSummary = () => {
    setDrawerFilter({
      scope: "due",
      rangeStart,
      rangeEnd,
      mode: "delivery",
      bucket: "deliveryTotal",
      dueOnly: true,
      includeAllPastDue,
      pastDueOnly: false,
    })
    setDrawerOpen(true)
  }

  const dateRangeLabel = useMemo(() => {
    const s = mis?.startDate || salesMis?.startDate || dealerMis?.startDate || startDate?.format("YYYY-MM-DD")
    const e = mis?.endDate || salesMis?.endDate || dealerMis?.endDate || endDate?.format("YYYY-MM-DD")
    if (s && e) return `${moment(s).format("DD MMM")} – ${moment(e).format("DD MMM YYYY")}`
    return "—"
  }, [mis, salesMis, dealerMis, startDate, endDate])

  const invalidateBreakdownCache = useCallback(() => {
    salesFetchedKeyRef.current = null
    dealerFetchedKeyRef.current = null
    dueFetchedKeyRef.current = null
    setSalesMis(null)
    setDealerMis(null)
    setDueMis(null)
  }, [])

  const handleApply = () => {
    invalidateBreakdownCache()
    fetchMis()
    if (tab === TAB_SALES) fetchSalesMisStamped(true)
    else if (tab === TAB_DEALER) fetchDealerMisStamped(true)
    else if (tab === TAB_DUE) fetchDueMisStamped(true)
  }

  const applyDateShortcut = (from, to) => {
    setStartDate(from)
    setEndDate(to)
  }

  useEffect(() => {
    invalidateBreakdownCache()
  }, [dueOnly, includeAllPastDue, invalidateBreakdownCache])

  const handleRefresh = () => {
    if (tab === TAB_STOCK) {
      setStockRefreshKey((k) => k + 1)
      return
    }
    if (tab === TAB_SALES) {
      salesFetchedKeyRef.current = null
      fetchSalesMisStamped(true)
    } else if (tab === TAB_DEALER) {
      dealerFetchedKeyRef.current = null
      fetchDealerMisStamped(true)
    } else if (tab === TAB_DUE) {
      dueFetchedKeyRef.current = null
      fetchDueMisStamped(true)
    } else fetchMis()
  }

  const tabLoading =
    tab === TAB_STOCK
      ? false
      : tab === TAB_SALES
        ? salesLoading
        : tab === TAB_DEALER
          ? dealerLoading
          : tab === TAB_DUE
            ? dueLoading
            : misLoading

  const tabError =
    tab === TAB_STOCK
      ? ""
      : tab === TAB_SALES
        ? salesError
        : tab === TAB_DEALER
          ? dealerError
          : tab === TAB_DUE
            ? dueError
            : misError

  const handleBookFromStock = useCallback(
    (row) => {
      saveStockPrefill(row)
      navigate("/u/dashboard", { state: { openAddOrder: true } })
    },
    [navigate]
  )

  const exportMainCsv = () => {
    if (!days.length && !varietyRows.length) return
    const lines = []
    lines.push("=== DAILY MIS ===")
    const dailyHeader = [
      "Date",
      "Booking_Orders",
      "Booking_Plants",
      "Delivery_Total_Orders",
      "Delivery_Total_Plants",
      ...DELIVERY_BUCKETS.flatMap((b) => [`${b}_Orders`, `${b}_Plants`]),
      "Unique_Orders",
    ]
    lines.push(dailyHeader.join(","))
    for (const row of days) {
      const d = row.delivery
      lines.push(
        [
          row.date,
          row.booking.orders,
          row.booking.plants,
          d.total.orders,
          d.total.plants,
          ...DELIVERY_BUCKETS.flatMap((b) => [d[b].orders, d[b].plants]),
          row.uniqueOrders,
        ].join(",")
      )
    }
    if (totals) {
      const t = totals.delivery
      lines.push(
        [
          "TOTAL",
          totals.booking.orders,
          totals.booking.plants,
          t.total.orders,
          t.total.plants,
          ...DELIVERY_BUCKETS.flatMap((b) => [t[b].orders, t[b].plants]),
          totals.uniqueOrders,
        ].join(",")
      )
    }
    lines.push("")
    lines.push("=== PLANT SUBTYPE ===")
    lines.push(
      [
        "Plant",
        "Subtype",
        "Booking_Orders",
        "Booking_Plants",
        "Delivery_Total_Orders",
        "Delivery_Total_Plants",
        ...DELIVERY_BUCKETS.flatMap((b) => [`${b}_Orders`, `${b}_Plants`]),
      ].join(",")
    )
    for (const row of varietyRows) {
      const d = row.delivery
      lines.push(
        [
          `"${asDisplayLabel(row.plantName)}"`,
          `"${asDisplayLabel(row.subtype)}"`,
          row.booking.orders,
          row.booking.plants,
          d.total.orders,
          d.total.plants,
          ...DELIVERY_BUCKETS.flatMap((b) => [d[b].orders, d[b].plants]),
        ].join(",")
      )
    }
    downloadCsv(
      `admin-mis-${startDate?.format("DD-MM-YYYY")}-to-${endDate?.format("DD-MM-YYYY")}.csv`,
      [lines]
    )
  }

  const exportSalesCsv = () => {
    downloadCsv(`admin-mis-sales-${startDate?.format("DD-MM-YYYY")}-to-${endDate?.format("DD-MM-YYYY")}.csv`, [
      breakdownRowsToCsv("=== SALES PERSON ===", salesRows),
    ])
  }

  const exportDealerCsv = () => {
    downloadCsv(`admin-mis-dealer-${startDate?.format("DD-MM-YYYY")}-to-${endDate?.format("DD-MM-YYYY")}.csv`, [
      breakdownRowsToCsv("=== DEALER ===", dealerRows),
    ])
  }

  const appendDueChip = (chips, dueSummary, inRangePlants) => {
    if (!dueSummary?.inRange) return chips
    return [
      ...chips,
      {
        label: includeAllPastDue ? "Due (range + backlog)" : "Due in range",
        duePlus: true,
        value: formatDuePlus(dueSummary, { includeAllPastDue, inRangePlants }),
        caption: duePlusCaption(dueSummary, { includeAllPastDue, inRangePlants }),
        onClick: openDueSummary,
      },
    ]
  }

  const formatDeliveryChipPlants = (deliveryPlants, dueSummary) => {
    if (includeAllPastDue && dueSummary?.pastDue) {
      return formatDuePlus(dueSummary, { includeAllPastDue: true, inRangePlants: deliveryPlants })
    }
    return fmt(deliveryPlants)
  }

  const summaryChips = useMemo(() => {
    if (tab === TAB_DUE && dueTotals) {
      const rangeDeliveryPlants = dueTotals.delivery?.total?.plants ?? 0
      return appendDueChip(
        [
          {
            label: includeAllPastDue ? "Delivery (range + backlog)" : "Due delivery (range)",
            orders: dueTotals.delivery?.total?.orders,
            plants: rangeDeliveryPlants,
            plantsDisplay: formatDeliveryChipPlants(rangeDeliveryPlants, dueMis?.dueSummary),
          },
          {
            label: "Backlog (before range)",
            orders: dueMis?.dueSummary?.pastDue?.orders,
            plants: dueMis?.dueSummary?.pastDue?.plants,
          },
        ],
        dueMis?.dueSummary,
        rangeDeliveryPlants
      )
    }
    if (tab === TAB_SALES && salesTotals) {
      const rangeDeliveryPlants = salesTotals.delivery?.total?.plants ?? 0
      return appendDueChip(
        [
          { label: "Sales reps", value: fmt(salesRows.length), ordersOnly: true },
          {
            label: "Booked",
            orders: salesTotals.booking.orders,
            plants: salesTotals.booking.plants,
          },
          {
            label: dueOnly ? "Delivery (due only)" : "Delivery",
            orders: salesTotals.delivery.total.orders,
            plants: rangeDeliveryPlants,
            plantsDisplay: formatDeliveryChipPlants(rangeDeliveryPlants, salesMis?.dueSummary),
          },
        ],
        salesMis?.dueSummary,
        rangeDeliveryPlants
      )
    }
    if (tab === TAB_DEALER && dealerTotals) {
      const rangeDeliveryPlants = dealerTotals.delivery?.total?.plants ?? 0
      return appendDueChip(
        [
          { label: "Dealers", value: fmt(dealerRows.length), ordersOnly: true },
          {
            label: "Booked",
            orders: dealerTotals.booking.orders,
            plants: dealerTotals.booking.plants,
          },
          {
            label: dueOnly ? "Delivery (due only)" : "Delivery",
            orders: dealerTotals.delivery.total.orders,
            plants: rangeDeliveryPlants,
            plantsDisplay: formatDeliveryChipPlants(rangeDeliveryPlants, dealerMis?.dueSummary),
          },
        ],
        dealerMis?.dueSummary,
        rangeDeliveryPlants
      )
    }
    if (!totals) return []
    const rangeDeliveryPlants = totals.delivery?.total?.plants ?? 0
    return appendDueChip(
      [
        { label: "Booked", orders: totals.booking.orders, plants: totals.booking.plants },
        {
          label: dueOnly ? "Delivery (due only)" : "Delivery",
          orders: totals.delivery.total.orders,
          plants: rangeDeliveryPlants,
          plantsDisplay: formatDeliveryChipPlants(rangeDeliveryPlants, mis?.dueSummary),
        },
        { label: "Unique (range)", value: fmt(totals.uniqueOrders), ordersOnly: true },
        { label: "Varieties", value: fmt(varietyRows.length), ordersOnly: true },
      ],
      mis?.dueSummary,
      rangeDeliveryPlants
    )
  }, [
    tab,
    totals,
    varietyRows.length,
    salesTotals,
    salesRows.length,
    dealerTotals,
    dealerRows.length,
    dueOnly,
    includeAllPastDue,
    mis?.dueSummary,
    salesMis?.dueSummary,
    dealerMis?.dueSummary,
    dueMis,
    dueTotals,
  ])

  if (!isAdmin && userData) {
    return (
      <Box p={3}>
        <Alert severity="error">Access denied. Admin only.</Alert>
      </Box>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          maxWidth: 1600,
          mx: "auto",
          minHeight: "100%",
          background: "linear-gradient(160deg, #e8f5e9 0%, #f5f7fa 35%, #fff 100%)",
        }}>
        <Box
          data-tour="mis-header"
          sx={{
            mb: 2.5,
            p: 2.5,
            borderRadius: 3,
            background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 40%, #1565c0 100%)",
            color: "#fff",
            boxShadow: "0 8px 32px rgba(27, 94, 32, 0.25)",
          }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
                Admin MIS
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.92, maxWidth: 560, mt: 0.5 }}>
                {tab === TAB_STOCK
                  ? "Slot-wise plants available to book · all plants in one view · GET /slots/availability-overview"
                  : tab === TAB_DUE
                    ? "Open pipeline orders only · delivery cells show orders + plants · GET /order/admin-mis-due"
                    : tab === TAB_SALES
                      ? "Sales-wise booking & delivery — loaded from dedicated API when you open this tab."
                      : tab === TAB_DEALER
                        ? "Dealer-wise breakdown (dealer orders only) — separate API."
                        : "Daily booking & delivery pipeline · plant & subtype for the selected range (IST)."}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Tooltip title="English walkthrough tour · column/cell hover = Hinglish help">
                <Button
                  data-tour="mis-guide-btn"
                  size="small"
                  variant="outlined"
                  startIcon={<MenuBookIcon sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    setJoyrideKey((k) => k + 1)
                    setJoyrideRun(true)
                  }}
                  sx={{
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.55)",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 12,
                    py: 0.25,
                    "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.12)" },
                  }}>
                  Guide
                </Button>
              </Tooltip>
              <Tooltip title="Click any number → order drawer. Hover header/cell → Hinglish tip.">
                <InfoOutlinedIcon fontSize="small" sx={{ opacity: 0.85 }} />
              </Tooltip>
              {tab !== TAB_STOCK && (
                <Tooltip title={tab === TAB_SALES ? "Export sales CSV" : tab === TAB_DEALER ? "Export dealer CSV" : "Export plant & daily CSV"}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={
                        tab === TAB_SALES
                          ? exportSalesCsv
                          : tab === TAB_DEALER
                            ? exportDealerCsv
                            : exportMainCsv
                      }
                      disabled={
                        tab === TAB_SALES
                          ? !salesRows.length
                          : tab === TAB_DEALER
                            ? !dealerRows.length
                            : !days.length && !varietyRows.length
                      }
                      sx={{ color: "#fff" }}>
                      <FileDownloadIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              <Tooltip title="Refresh current tab">
                <span>
                  <IconButton onClick={handleRefresh} disabled={tabLoading} size="small" sx={{ color: "#fff" }}>
                    {tabLoading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          {tab !== TAB_STOCK && summaryChips.length > 0 && (
            <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
              {summaryChips.map((c) => (
                <Box
                  key={c.label}
                  onClick={c.onClick}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    bgcolor: c.duePlus ? "rgba(255, 193, 7, 0.22)" : "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(4px)",
                    cursor: c.onClick ? "pointer" : "default",
                    border: c.duePlus ? "1px solid rgba(255, 235, 59, 0.45)" : "none",
                    "&:hover": c.onClick ? { bgcolor: "rgba(255,255,255,0.28)" } : {},
                  }}>
                  <Typography variant="caption" sx={{ opacity: 0.85, display: "block", lineHeight: 1 }}>
                    {c.label}
                  </Typography>
                  {c.duePlus ? (
                    <>
                      <Typography variant="body2" fontWeight={800} lineHeight={1.2} color="warning.light">
                        {c.value}
                      </Typography>
                      {c.caption && (
                        <Typography variant="caption" sx={{ opacity: 0.85, display: "block", lineHeight: 1.2 }}>
                          {c.caption}
                        </Typography>
                      )}
                    </>
                  ) : c.ordersOnly ? (
                    <Typography variant="body2" fontWeight={800}>
                      {c.value}
                    </Typography>
                  ) : (
                    <>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        lineHeight={1.2}
                        color={c.plantsDisplay?.includes("+") ? "warning.light" : "success.light"}>
                        {c.plantsDisplay ?? fmt(c.plants)}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8, display: "block", lineHeight: 1.2 }}>
                        {fmt(c.orders)} orders
                      </Typography>
                    </>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {tabLoading && (mis || salesMis || dealerMis || dueMis) && (
          <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} color="success" />
        )}
        {tabError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {tabError}
          </Alert>
        )}

        {tab !== TAB_STOCK && (
        <Box
          data-tour="mis-filters"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: "#fff",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>
          <DatePicker
            label="From"
            value={startDate}
            onChange={(v) => {
              if (!v) return
              setStartDate(v)
              if (endDate && v.isAfter(endDate, "day")) setEndDate(v)
            }}
            slotProps={{ textField: { size: "small", sx: { width: 150 } } }}
          />
          <DatePicker
            label="To"
            value={endDate}
            onChange={(v) => {
              if (!v) return
              setEndDate(v)
              if (startDate && v.isBefore(startDate, "day")) setStartDate(v)
            }}
            slotProps={{ textField: { size: "small", sx: { width: 150 } } }}
            minDate={startDate || undefined}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => applyDateShortcut(dayjs(), dayjs())}
            sx={{ height: 40, textTransform: "none", fontWeight: 700 }}>
            Today
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => applyDateShortcut(dayjs().subtract(1, "day"), dayjs().subtract(1, "day"))}
            sx={{ height: 40, textTransform: "none", fontWeight: 700 }}>
            Yesterday
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={handleApply}
            disabled={tabLoading}
            sx={{ height: 40 }}>
            Apply
          </Button>
          <Typography variant="caption" fontWeight={600} color="text.secondary">
            {dateRangeLabel}
          </Typography>
          <FormControlLabel
            data-tour="mis-toggle-due"
            control={
              <Switch
                size="small"
                color="warning"
                checked={dueOnly}
                onChange={(e) => setDueOnly(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" fontWeight={600}>
                Due orders only
              </Typography>
            }
          />
          <FormControlLabel
            data-tour="mis-toggle-backlog"
            control={
              <Switch
                size="small"
                color="warning"
                checked={includeAllPastDue}
                onChange={(e) => setIncludeAllPastDue(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" fontWeight={600}>
                All past due (backlog)
              </Typography>
            }
          />
        </Box>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          data-tour="mis-tabs"
          sx={{
            mb: 2,
            bgcolor: "#fff",
            borderRadius: 2,
            px: 1,
            minHeight: 44,
            boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
            "& .MuiTab-root": { minHeight: 44, fontWeight: 600, textTransform: "none" },
          }}>
          <Tab icon={<GrassIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Plant & subtype" />
          <Tab icon={<WarningAmberIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Due orders" />
          <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Sales" />
          <Tab icon={<StorefrontIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Dealer" />
          <Tab icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Daily calendar" />
          <Tab icon={<Inventory2Icon sx={{ fontSize: 18 }} />} iconPosition="start" label="Available stock" />
        </Tabs>

        {tab === TAB_PLANT && (
          <MisVarietyTable
            rows={varietyRows}
            totals={varietyTotals}
            loading={misLoading}
            onCellClick={openVarietyCell}
            dueDisplay={dueDisplay}
          />
        )}

        {tab === TAB_DUE && (
          <Box display="flex" flexDirection="column" gap={2}>
            <MisDailyTable
              days={dueDays}
              totals={dueTotals}
              loading={dueLoading}
              onCellClick={openDailyCell}
              dueDisplay={{ includeAllPastDue, dueSummary: dueMis?.dueSummary }}
            />
            <MisBreakdownTable
              scope="sales"
              rows={dueSalesRows}
              totals={dueSalesTotals}
              loading={dueLoading}
              onCellClick={openSalesCell}
              onRefresh={() => fetchDueMisStamped(true)}
              icon={PersonIcon}
              title="Due orders by sales person"
              subtitle="Open pipeline only · Delivery column = range plants + backlog when toggled"
              emptyMessage="No due orders in this range"
              nameColumnLabel="Sales person"
              dateRangeLabel={dateRangeLabel}
              dueDisplay={{ includeAllPastDue, dueSummary: dueMis?.dueSummary }}
            />
            <MisBreakdownTable
              scope="dealer"
              rows={dueDealerRows}
              totals={dueDealerTotals}
              loading={dueLoading}
              onCellClick={openDealerCell}
              onRefresh={() => fetchDueMisStamped(true)}
              icon={StorefrontIcon}
              title="Due orders by dealer"
              subtitle="Dealer orders only · pipeline delivery · GET /order/admin-mis-due"
              emptyMessage="No due dealer orders in this range"
              nameColumnLabel="Dealer"
              dateRangeLabel={dateRangeLabel}
              dueDisplay={{ includeAllPastDue, dueSummary: dueMis?.dueSummary }}
            />
          </Box>
        )}

        {tab === TAB_SALES && (
          <MisBreakdownTable
            scope="sales"
            rows={salesRows}
            totals={salesTotals}
            loading={salesLoading}
            onCellClick={openSalesCell}
            onRefresh={() => fetchSalesMisStamped(true)}
            onExport={exportSalesCsv}
            icon={PersonIcon}
            title="Sales person — range summary"
            subtitle="GET /order/admin-mis-sales · all orders by attributed sales rep"
            emptyMessage="No orders with sales attribution in this range"
            nameColumnLabel="Sales person"
            dateRangeLabel={dateRangeLabel}
            dueDisplay={dueDisplay}
          />
        )}

        {tab === TAB_DEALER && (
          <MisBreakdownTable
            scope="dealer"
            rows={dealerRows}
            totals={dealerTotals}
            loading={dealerLoading}
            onCellClick={openDealerCell}
            onRefresh={() => fetchDealerMisStamped(true)}
            onExport={exportDealerCsv}
            icon={StorefrontIcon}
            title="Dealer — range summary"
            subtitle="GET /order/admin-mis-dealer · dealer orders grouped by dealer account"
            emptyMessage="No dealer orders in this range"
            nameColumnLabel="Dealer"
            dateRangeLabel={dateRangeLabel}
            dueDisplay={dueDisplay}
          />
        )}

        {tab === TAB_DAILY && (
          <MisDailyTable
            days={days}
            totals={totals}
            loading={misLoading}
            onCellClick={openDailyCell}
            dueDisplay={dueDisplay}
          />
        )}

        {tab === TAB_STOCK && (
          <AvailableStockView
            variant="mis"
            refreshKey={stockRefreshKey}
            onBookSlot={handleBookFromStock}
            showBookAction
          />
        )}

        <MisOrderDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} filter={drawerFilter} />

        <MisGuideJoyride
          run={joyrideRun}
          tourKey={joyrideKey}
          activeTab={tab}
          onFinish={() => setJoyrideRun(false)}
        />
      </Box>
    </LocalizationProvider>
  )
}

export default AdminStatsPage
