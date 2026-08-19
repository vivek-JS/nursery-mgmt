import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Tooltip } from "@mui/material"
import { ChevronDown, ExternalLink, Leaf, RefreshCw, ScrollText } from "lucide-react"
import { API, NetworkManager } from "network/core"
import RollExpiredAvailableModal from "../SlotsView/RollExpiredAvailableModal"
import { openSlotManageTab } from "../SlotsView/slotMetrics"
import LagwadCharts from "./LagwadCharts"
import LagwadFilterBar from "./LagwadFilterBar"
import LagwadLinesTable from "./LagwadLinesTable"
import LagwadTotalsStrip from "./LagwadTotalsStrip"
import MonthCardsGrid from "./MonthCardsGrid"
import MonthDetailModal from "./MonthDetailModal"
import MortalityTransferDialog from "./MortalityTransferDialog"
import ReadyRollLedgerModal from "./ReadyRollLedgerModal"
import { fmt, rollupSlotsByMonth, tooltipSlotProps } from "./lagwadAnalysisUi"
import useLagwadAnalysis from "./useLagwadAnalysis"
import "./lagwadAnalysis.css"

const YEARS = ["2025", "2026", "2027"]

const CURRENT_MONTH = new Date().toLocaleString("en-US", { month: "long" })

const parseList = (value) =>
  (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

const SkeletonTile = () => <div className="lag-skeleton h-24 rounded-xl border border-slate-200" />

const sectionLabel = "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700"

const headerButton =
  "flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 hover:shadow-md"

const headerChip =
  "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"

/** Keeps the raw card walls and tables one click away so the charts stay the headline. */
const Section = ({ label, open, onToggle, children }) => (
  <div className="space-y-2">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-cyan-300 hover:shadow-md">
      <ChevronDown
        className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${
          open ? "" : "-rotate-90"
        }`}
      />
      <span className={sectionLabel}>{label}</span>
      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
        {open ? "hide" : "show"}
      </span>
    </button>
    {open && <div className="lag-expand">{children}</div>}
  </div>
)

const PoolsExplainer = () => (
  <div className="lag-panel lag-rise rounded-2xl p-4">
    <p className={sectionLabel}>Three pools — do not mix</p>
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="relative overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <span className="lag-rail lag-rail-sellable" />
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          1. Sellable pool (90%)
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Sits on the slot ledger. Stays put when only ready rolls off an expired window.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-rose-200 bg-rose-50 p-3">
        <span className="lag-rail lag-rail-mortality" />
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          2. Exp. mortality (10%)
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Not sellable until transferred into the ready pool.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-cyan-200 bg-cyan-50 p-3">
        <span className="lag-rail lag-rail-ready" />
        <p className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
          3. Ready to dispatch
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Only this goes on trucks. Vehicle dispatch decreases it; sellable is unchanged.
        </p>
      </div>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 text-[11px] text-slate-500 md:grid-cols-3">
      <p>
        <span className="font-semibold text-slate-700">Calendar rule</span> — on the ready date the
        full entry moves to the current ongoing slot.
      </p>
      <p>
        <span className="font-semibold text-slate-700">Expired rule</span> — when a window ends only
        READY rolls to the current slot; the sellable pool stays behind.
      </p>
      <p>
        <span className="font-semibold text-slate-700">Dispatch rule</span> — vehicle load subtracts
        ready plants only.
      </p>
    </div>
  </div>
)

/**
 * Lagwad analysis: pick a plant subtype, then any set of months and slot windows, and read
 * one combined picture of physical stock versus what farmers are still owed.
 */
const LagwadAnalysis = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [plants, setPlants] = useState([])
  const [subtypes, setSubtypes] = useState([])
  const [plantId, setPlantId] = useState(searchParams.get("plantId") || "")
  const [subtypeId, setSubtypeId] = useState(searchParams.get("subtypeId") || "")
  const [year, setYear] = useState(searchParams.get("year") || String(new Date().getFullYear()))
  const [selectedMonths, setSelectedMonths] = useState(parseList(searchParams.get("months")))
  const [selectedSlotIds, setSelectedSlotIds] = useState(parseList(searchParams.get("slotIds")))
  const [monthsTouched, setMonthsTouched] = useState(
    parseList(searchParams.get("months")).length > 0
  )

  const [openSection, setOpenSection] = useState(null)
  const [monthDetail, setMonthDetail] = useState(null)
  const [rollLedger, setRollLedger] = useState({ open: false, slot: null })
  const [mortalitySlot, setMortalitySlot] = useState(null)
  const [rollExpiredSlot, setRollExpiredSlot] = useState(null)

  const { data, loading, error, refetch } = useLagwadAnalysis({
    plantId,
    subtypeId,
    year,
    months: selectedMonths,
    slotIds: selectedSlotIds,
    // The very first call only feeds the month picker, before a month is chosen.
    metaOnly: selectedMonths.length === 0 && !monthsTouched
  })

  useEffect(() => {
    const params = {}
    if (plantId) params.plantId = plantId
    if (subtypeId) params.subtypeId = subtypeId
    if (year) params.year = year
    if (selectedMonths.length) params.months = selectedMonths.join(",")
    if (selectedSlotIds.length) params.slotIds = selectedSlotIds.join(",")
    setSearchParams(params, { replace: true })
  }, [plantId, subtypeId, year, selectedMonths, selectedSlotIds, setSearchParams])

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

  const availableMonths = data?.meta?.availableMonths || []

  // Default to the month that holds today, so the page opens on the window being dispatched.
  useEffect(() => {
    if (monthsTouched || availableMonths.length === 0) return
    const current = availableMonths.find((m) => m.hasCurrentSlot)
    const named = availableMonths.find((m) => m.month === CURRENT_MONTH)
    const pick = current || named || availableMonths[0]
    if (pick) setSelectedMonths([pick.month])
  }, [availableMonths, monthsTouched])

  const monthSlots = useMemo(() => {
    const months = selectedMonths.length
      ? availableMonths.filter((m) => selectedMonths.includes(m.month))
      : availableMonths
    return months.flatMap((m) => m.slots || [])
  }, [availableMonths, selectedMonths])

  // A slot selection only makes sense inside the chosen months.
  useEffect(() => {
    if (selectedSlotIds.length === 0) return
    const valid = new Set(monthSlots.map((s) => s._id))
    const next = selectedSlotIds.filter((id) => valid.has(id))
    if (next.length !== selectedSlotIds.length) setSelectedSlotIds(next)
  }, [monthSlots, selectedSlotIds])

  const toggleMonth = useCallback((month) => {
    setMonthsTouched(true)
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    )
  }, [])

  const toggleSlot = useCallback(
    (slotId) => {
      setSelectedSlotIds((prev) => {
        if (prev.length === 0) return monthSlots.filter((s) => s._id !== slotId).map((s) => s._id)
        return prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
      })
    },
    [monthSlots]
  )

  const slots = data?.slots || []
  const totals = data?.totals
  const rolls = data?.rolls || []
  const context = data?.context
  const currentSlot = slots.find((s) => s.windowState === "current")
  const slotLabelById = useMemo(() => new Map(slots.map((s) => [s._id, s.label])), [slots])

  const ledgerRolls = rollLedger.slot
    ? rolls.filter((r) => r.targetSlotId === rollLedger.slot._id)
    : rolls

  const monthRollups = useMemo(() => rollupSlotsByMonth(slots), [slots])

  const openMonth = useCallback(
    (month) => setMonthDetail(monthRollups.find((m) => m.month === month) || null),
    [monthRollups]
  )

  const hasSelection = Boolean(plantId && subtypeId)
  const showEmpty = hasSelection && !loading && slots.length === 0

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
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Sellable pool (90%), expected mortality (10%) and ready-to-dispatch are three
                different numbers. Trucks load from{" "}
                <strong className="text-cyan-700">READY</strong> only; farmer orders are a{" "}
                <strong className="text-violet-700">DELIVERY</strong> need.
              </p>
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
            setSelectedSlotIds([])
          }}
          onSubtypeChange={(v) => {
            setSubtypeId(v)
            setSelectedSlotIds([])
          }}
          onYearChange={(v) => {
            setYear(v)
            setSelectedSlotIds([])
            setSelectedMonths([])
            setMonthsTouched(false)
          }}
          availableMonths={availableMonths}
          selectedMonths={selectedMonths}
          onToggleMonth={toggleMonth}
          onSelectAllMonths={() => {
            setMonthsTouched(true)
            setSelectedMonths(availableMonths.map((m) => m.month))
          }}
          onClearMonths={() => {
            setMonthsTouched(true)
            setSelectedMonths([])
          }}
          slots={monthSlots}
          selectedSlotIds={selectedSlotIds}
          onToggleSlot={toggleSlot}
          onSelectAllSlots={() => setSelectedSlotIds([])}
          onClearSlots={() => setSelectedSlotIds([])}
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
              Then choose one or more months, and narrow to specific slot windows if you need to.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading && slots.length === 0 && hasSelection && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SkeletonTile />
              <SkeletonTile />
              <SkeletonTile />
              <SkeletonTile />
            </div>
            <div className="lag-skeleton h-32 rounded-2xl border border-slate-200" />
          </div>
        )}

        {showEmpty && (
          <div className="lag-rise rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No slot windows in the current selection
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Select a different month, or clear the slot filter to include every window.
            </p>
          </div>
        )}

        {slots.length > 0 && totals && (
          <>
            <div>
              <p className={`mb-2 ${sectionLabel}`}>
                Selection totals ·{" "}
                {selectedMonths.length ? selectedMonths.join(", ") : "whole year"} · {slots.length}{" "}
                slot{slots.length === 1 ? "" : "s"}
              </p>
              <LagwadTotalsStrip totals={totals} />
            </div>

            <LagwadCharts slots={slots} totals={totals} onSelectMonth={openMonth} />

            <div>
              <p className={`mb-2 ${sectionLabel}`}>
                Months · click a card for its slot windows
              </p>
              <MonthCardsGrid months={monthRollups} onOpenMonth={setMonthDetail} />
            </div>

            <div className="lag-panel lag-rise flex flex-wrap gap-x-5 gap-y-2 rounded-2xl px-4 py-3 text-xs text-slate-500">
              <span>
                Gross lagwad{" "}
                <strong className="lag-readout text-slate-900">{fmt(totals.lagwadGross)}</strong>
              </span>
              <span>
                Lines <strong className="lag-readout text-slate-900">{totals.lineCount}</strong>{" "}
                across{" "}
                <strong className="lag-readout text-slate-900">{totals.batchCount}</strong> batches
              </span>
              {totals.overdueLineCount > 0 && (
                <span className="text-amber-600">
                  {totals.overdueLineCount} line{totals.overdueLineCount === 1 ? "" : "s"} past ready
                  date · avg {totals.avgOverdueDays}d · worst {totals.maxOverdueDays}d
                </span>
              )}
              {totals.pendingSlotSync > 0 && (
                <span className="text-rose-600">
                  {fmt(totals.pendingSlotSync)} in shed not yet synced to a slot
                </span>
              )}
              {totals.readyRolledIn > 0 && (
                <span className="text-emerald-600">
                  {fmt(totals.readyRolledIn)} ready rolled in
                </span>
              )}
            </div>

            <Section
              label={`Lagwad entries · ${totals.lineCount} line${
                totals.lineCount === 1 ? "" : "s"
              }`}
              open={openSection === "lines"}
              onToggle={() => setOpenSection(openSection === "lines" ? null : "lines")}>
              <LagwadLinesTable lines={data.lines} slotLabelById={slotLabelById} />
            </Section>

            <Section
              label="How the three pools work"
              open={openSection === "help"}
              onToggle={() => setOpenSection(openSection === "help" ? null : "help")}>
              <PoolsExplainer />
            </Section>
          </>
        )}
      </div>

      <MonthDetailModal
        open={Boolean(monthDetail)}
        month={monthDetail}
        lines={data?.lines}
        onClose={() => setMonthDetail(null)}
        onOpenRolls={(slot) => setRollLedger({ open: true, slot })}
        onTransferMortality={(slot) => setMortalitySlot(slot)}
      />

      <ReadyRollLedgerModal
        open={rollLedger.open}
        onClose={() => setRollLedger({ open: false, slot: null })}
        rolls={ledgerRolls}
        slotLabel={rollLedger.slot?.label}
      />

      <MortalityTransferDialog
        open={Boolean(mortalitySlot)}
        slot={mortalitySlot}
        onClose={() => setMortalitySlot(null)}
        onDone={refetch}
      />

      <RollExpiredAvailableModal
        open={Boolean(rollExpiredSlot)}
        slot={rollExpiredSlot}
        onClose={() => setRollExpiredSlot(null)}
        onSuccess={refetch}
      />
    </div>
  )
}

export default LagwadAnalysis
