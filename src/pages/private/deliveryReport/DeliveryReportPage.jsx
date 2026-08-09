import React, { useCallback, useEffect, useState } from "react"
import { Box } from "@mui/material"
import dayjs from "dayjs"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { API, NetworkManager } from "network/core"
import DeliveryReportStepper from "./DeliveryReportStepper"
import DeliveryReportResults from "./DeliveryReportResults"
import { DEFAULT_FILTERS, isValidMongoId } from "./deliveryReportConstants"
import { fetchDeliveryReportSummary } from "./deliveryReportApi"

const REPORT_ACCESS_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "OFFICE_ADMIN",
  "OFFICEADMIN",
  "DISPATCH_MANAGER",
]

export default function DeliveryReportPage() {
  const navigate = useNavigate()
  const userData = useSelector((s) => s?.userData?.userData)
  const canAccess =
    REPORT_ACCESS_ROLES.includes(userData?.jobTitle) ||
    REPORT_ACCESS_ROLES.includes(userData?.role)

  useEffect(() => {
    if (userData && !canAccess) navigate("/u/dashboard", { replace: true })
  }, [userData, canAccess, navigate])

  const [step, setStep] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    startDate: dayjs(),
    endDate: dayjs(),
  })

  const [plants, setPlants] = useState([])
  const [plantsLoading, setPlantsLoading] = useState(false)
  const [subtypes, setSubtypes] = useState([])
  const [subtypesLoading, setSubtypesLoading] = useState(false)

  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState("")
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!canAccess) return
    setPlantsLoading(true)
    NetworkManager(API.slots.GET_PLANTS)
      .request()
      .then((res) => {
        const raw = res?.data || res?.data?.data || []
        setPlants(Array.isArray(raw) ? raw : [])
      })
      .catch(() => setPlants([]))
      .finally(() => setPlantsLoading(false))
  }, [canAccess])

  useEffect(() => {
    const plantId = String(filters.plantId || "").trim()
    if (!isValidMongoId(plantId)) {
      setSubtypes([])
      return
    }
    setSubtypesLoading(true)
    const year = new Date().getFullYear()
    NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
      .request(null, { plantId, year })
      .then((res) => {
        const raw = res?.data?.subtypes || res?.data?.data || res?.data || []
        const list = (Array.isArray(raw) ? raw : []).map((st) => ({
          _id: st.subtypeId || st._id || st.id,
          name: st.subtypeName || st.name,
        })).filter((st) => st._id)
        setSubtypes(list)
      })
      .catch(() => setSubtypes([]))
      .finally(() => setSubtypesLoading(false))
  }, [filters.plantId])

  const runReport = useCallback(async () => {
    setRunning(true)
    setSummaryLoading(true)
    setSummaryError("")
    try {
      const data = await fetchDeliveryReportSummary(filters)
      setSummary(data)
      setShowResults(true)
    } catch (err) {
      setSummary(null)
      setSummaryError(err?.message || "Failed to load report")
      setShowResults(true)
    } finally {
      setSummaryLoading(false)
      setRunning(false)
    }
  }, [filters])

  const handleEditFilters = () => {
    setShowResults(false)
    setStep(0)
  }

  if (!canAccess) return null

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
        {showResults ? (
          <DeliveryReportResults
            filters={filters}
            summary={summary}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            onEditFilters={handleEditFilters}
            onRefresh={runReport}
          />
        ) : (
          <DeliveryReportStepper
            step={step}
            filters={filters}
            plants={plants}
            plantsLoading={plantsLoading}
            subtypes={subtypes}
            subtypesLoading={subtypesLoading}
            onStepChange={setStep}
            onFiltersChange={setFilters}
            onRunReport={runReport}
            running={running}
          />
        )}
      </Box>
    </LocalizationProvider>
  )
}
