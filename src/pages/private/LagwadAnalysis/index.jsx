import React, { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Tooltip } from "@mui/material"
import { ExternalLink, Leaf, Plus, RefreshCw, ScrollText } from "lucide-react"
import { API, NetworkManager } from "network/core"
import RollExpiredAvailableModal from "../SlotsView/RollExpiredAvailableModal"
import { openSlotManageTab } from "../SlotsView/slotMetrics"
import SecondaryDirectLagwadWizard from "../plantPipeline/dialogs/SecondaryDirectLagwadWizard"
import { useLagwadMasterData } from "../plantPipeline/hooks/useLagwadMasterData"
import { refId } from "../plantPipeline/utils/lagwadWizardHelpers"
import LagwadFilterBar from "./LagwadFilterBar"
import LagwadLinesTable from "./LagwadLinesTable"
import ReadyRollLedgerModal from "./ReadyRollLedgerModal"
import { tooltipSlotProps } from "./lagwadAnalysisUi"
import useLagwadAnalysis from "./useLagwadAnalysis"
import "./lagwadAnalysis.css"

const YEARS = ["2025", "2026", "2027"]

const headerButton =
  "flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 hover:shadow-md"

const headerChip =
  "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"

/**
 * Lagwad analysis: pick plant + subtype + year — one sortable, Excel-style entry table.
 */
const LagwadAnalysis = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [plants, setPlants] = useState([])
  const [subtypes, setSubtypes] = useState([])
  const [plantId, setPlantId] = useState(searchParams.get("plantId") || "")
  const [subtypeId, setSubtypeId] = useState(searchParams.get("subtypeId") || "")
  const [year, setYear] = useState(searchParams.get("year") || String(new Date().getFullYear()))

  const [rollLedger, setRollLedger] = useState({ open: false, slot: null })
  const [rollExpiredSlot, setRollExpiredSlot] = useState(null)
  const [lagwadOpen, setLagwadOpen] = useState(false)

  const hasSelection = Boolean(plantId && subtypeId)
  const { dispatchBatches, locations, trays } = useLagwadMasterData(hasSelection)

  const initialBatchId = useMemo(() => {
    if (!plantId || !subtypeId) return ""
    const match = dispatchBatches.find(
      (b) => refId(b.plantCmsId) === plantId && refId(b.plantSubtypeId) === subtypeId
    )
    return match ? refId(match._id ?? match.id) : ""
  }, [dispatchBatches, plantId, subtypeId])

  const { data, loading, error, refetch } = useLagwadAnalysis({
    plantId,
    subtypeId,
    year,
  })

  useEffect(() => {
    const params = {}
    if (plantId) params.plantId = plantId
    if (subtypeId) params.subtypeId = subtypeId
    if (year) params.year = year
    setSearchParams(params, { replace: true })
  }, [plantId, subtypeId, year, setSearchParams])

  useEffect(() => {
    let cancelled = false

    const loadPlants = async () => {
      try {
        const instance = NetworkManager(API.slots.GET_PLANTS)
        const response = await instance.request({}, { year })
        const list = Array.isArray(response?.data) ? response.data : []
        if (cancelled) return
        setPlants(list)
        // Only seeds the first selection; an existing choice is left alone.
        setPlantId((prev) => prev || (list[0]?.plantId ? String(list[0].plantId) : ""))
      } catch (e) {
        console.error("Failed to load plants:", e)
      }
    }

    loadPlants()
    return () => {
      cancelled = true
    }
  }, [year])

  useEffect(() => {
    let cancelled = false
    if (!plantId) {
      setSubtypes([])
      return undefined
    }

    const loadSubtypes = async () => {
      try {
        const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
        const response = await instance.request({}, { plantId, year })
        const list = response?.data?.subtypes || []
        if (cancelled) return
        setSubtypes(list)
        // Keep the current subtype only when the fresh list still offers it.
        setSubtypeId((prev) => {
          const stillValid = list.some((s) => String(s.subtypeId) === String(prev))
          if (stillValid) return prev
          return list[0]?.subtypeId ? String(list[0].subtypeId) : ""
        })
      } catch (e) {
        console.error("Failed to load subtypes:", e)
      }
    }

    loadSubtypes()
    return () => {
      cancelled = true
    }
  }, [plantId, year])

  const slots = data?.slots || []
  const lines = data?.lines || []
  const rolls = data?.rolls || []
  const context = data?.context
  const currentSlot = slots.find((s) => s.windowState === "current")
  const slotLabelById = useMemo(() => new Map(slots.map((s) => [s._id, s.label])), [slots])

  const ledgerRolls = rollLedger.slot
    ? rolls.filter((r) => r.targetSlotId === rollLedger.slot._id)
    : rolls

  return (
    <div className="lag-root min-h-screen">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="lag-rise">
              <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25">
                  <Leaf className="h-5 w-5" />
                </span>
                Lagwad analysis
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {context?.plantName && (
                <span className={headerChip}>
                  {context.plantName}
                  {context.subtypeName ? ` · ${context.subtypeName}` : ""} · {context.year}
                </span>
              )}
              {context?.todayLabel && (
                <span className={headerChip}>Today · {context.todayLabel}</span>
              )}
              {rolls.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRollLedger({ open: true, slot: null })}
                  className={headerButton}>
                  <ScrollText className="h-3.5 w-3.5" />
                  Roll ledger
                </button>
              )}
              {currentSlot && (
                <Tooltip
                  title="Move ready plants off expired windows onto today's slot"
                  arrow
                  slotProps={tooltipSlotProps}>
                  <button
                    type="button"
                    onClick={() => setRollExpiredSlot(currentSlot)}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/30">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Roll expired ready
                  </button>
                </Tooltip>
              )}
              {hasSelection && (
                <Tooltip title="Record secondary lagwad (direct sowing)" arrow slotProps={tooltipSlotProps}>
                  <button type="button" onClick={() => setLagwadOpen(true)} className={headerButton}>
                    <Plus className="h-3.5 w-3.5" />
                    Record lagwad
                  </button>
                </Tooltip>
              )}
              {hasSelection && (
                <Tooltip
                  title="Open slot management for this subtype"
                  arrow
                  slotProps={tooltipSlotProps}>
                  <button
                    type="button"
                    onClick={() => openSlotManageTab(plantId, subtypeId, year)}
                    className={headerButton}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Manage slots
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        <LagwadFilterBar
          plants={plants}
          subtypes={subtypes}
          years={YEARS}
          plantId={plantId}
          subtypeId={subtypeId}
          year={year}
          onPlantChange={(v) => {
            setPlantId(v)
            setSubtypeId("")
          }}
          onSubtypeChange={setSubtypeId}
          onYearChange={setYear}
          loading={loading}
          onRefresh={refetch}
        />

        {!hasSelection && (
          <div className="lag-rise rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Leaf className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Pick a plant and subtype to start
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Full-year lagwad and slot totals load automatically for that subtype.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading && lines.length === 0 && hasSelection && (
          <div className="lag-skeleton h-64 rounded border border-slate-200" />
        )}

        {hasSelection && data && (
          <LagwadLinesTable lines={lines} slotLabelById={slotLabelById} onChanged={refetch} />
        )}
      </div>

      <ReadyRollLedgerModal
        open={rollLedger.open}
        onClose={() => setRollLedger({ open: false, slot: null })}
        rolls={ledgerRolls}
        slotLabel={rollLedger.slot?.label}
      />

      <RollExpiredAvailableModal
        open={Boolean(rollExpiredSlot)}
        slot={rollExpiredSlot}
        onClose={() => setRollExpiredSlot(null)}
        onSuccess={refetch}
      />

      <SecondaryDirectLagwadWizard
        open={lagwadOpen}
        onClose={() => setLagwadOpen(false)}
        initialPlantId={plantId}
        initialSubtypeId={subtypeId}
        initialBatchId={initialBatchId}
        locations={locations}
        trays={trays}
        dispatchBatches={dispatchBatches}
        onSuccess={refetch}
      />
    </div>
  )
}

export default LagwadAnalysis
