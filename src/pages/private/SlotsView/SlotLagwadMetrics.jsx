import React, { useEffect, useState } from "react"
import {
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material"
import { ArrowRightLeft } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import SlotActualReadyBreakdownModal from "./SlotActualReadyBreakdownModal"
import { summaryFromBreakdownPayload } from "./expectedReadyInSlot"
import { useSlotReadySold } from "./useSlotReadySold"
import {
  getActualReadyPlants,
  getExpectedMortality,
  isSlotExpiredByEndDay,
  isSlotSowingAllowed,
  slotHasRolledLagwadOnCurrent,
} from "./slotMetrics"
import { isSlotFutureWindow } from "./lagwadWindowDays"
import MetricDefinitionIcon from "./MetricDefinitionIcon"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const tileBase =
  "relative rounded-lg border text-left transition-all min-w-0"

/**
 * Lagwad-derived slot fields: 90% sellable, 10% mortality, dispatch ready (synced minus order dispatch).
 */
const SlotLagwadMetrics = ({
  slot,
  variant = "card",
  compact = false,
  onOpenActual,
  onSlotChanged,
  onOpenRolledLagwad,
  sowingAllowed = false,
  className = "",
}) => {
  const lagwadSowingMode = isSlotSowingAllowed(slot, sowingAllowed)
  const actualPlants = Number(slot?.actualPlants) || 0
  const mortality = getExpectedMortality(slot)
  /** Stored on slot (often pipeline for banana); may exceed shed calendar-ready today. */
  const storedReadyOnSlot = getActualReadyPlants(slot)
  const shedCalendarReady = Math.max(0, Number(slot?.shedRollupReadyPlants) || 0)
  const syncedReady = storedReadyOnSlot
  const { soldTotal, orderCount, loading: soldLoading } = useSlotReadySold(
    slot?._id,
    Boolean(slot?._id)
  )
  const dispatchReady = Math.max(0, syncedReady - soldTotal)

  const [expectedReady, setExpectedReady] = useState({
    total: 0,
    calendarReady: 0,
    awaitingMark: 0,
  })

  /** Expected-in-window pipeline (gross vs after order dispatch on this slot). */
  const forSellExpected = expectedReady.total
  const canSellExpected = Math.max(0, forSellExpected - soldTotal)

  const expiredNotCurrent =
    !slot?.isCurrentDateSlot && isSlotExpiredByEndDay(slot)
  const isFutureSlot = isSlotFutureWindow(slot)
  const isDispatchWindow =
    Boolean(slot?.isCurrentDateSlot) && !expiredNotCurrent && !isFutureSlot

  /**
   * Papaya/sowing: sow + ready + awaiting are separate pools (sum).
   * Banana / no sowing: same pipeline often mirrored on actual+ready — use max, not triple count.
   */
  const forSellLagwad = lagwadSowingMode
    ? actualPlants + syncedReady + (expectedReady.awaitingMark || 0)
    : isFutureSlot
      ? Math.max(actualPlants, forSellExpected)
      : Math.max(actualPlants, syncedReady, forSellExpected)

  /** Can dispatch/sell lagwad only on today's open window. */
  const canSellLagwad = isDispatchWindow ? dispatchReady : 0

  /** Future windows: only shed lines past expected ready date count as "ready" today. */
  const pipelineReadyToday = Math.max(shedCalendarReady, expectedReady.calendarReady || 0)
  const readyTileValue = isDispatchWindow
    ? dispatchReady
    : isFutureSlot
      ? pipelineReadyToday
      : syncedReady
  const expTileValue = lagwadSowingMode
    ? canSellExpected
    : expectedReady.awaitingMark > 0
      ? expectedReady.awaitingMark
      : forSellExpected
  const hasLagwad =
    actualPlants > 0 ||
    mortality > 0 ||
    syncedReady > 0 ||
    dispatchReady > 0 ||
    expectedReady.total > 0 ||
    expectedReady.awaitingMark > 0

  const [transferOpen, setTransferOpen] = useState(false)
  const [transferQty, setTransferQty] = useState("")
  const [transferring, setTransferring] = useState(false)
  const [readyBreakdownOpen, setReadyBreakdownOpen] = useState(false)
  const [readyBreakdownTab, setReadyBreakdownTab] = useState(0)

  const labelSize = variant === "detail" ? "text-xs" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-xl" : "text-sm"
  const pad = variant === "detail" ? "pl-3 pr-6 py-2" : "pl-2 pr-5 py-1.5"

  const openActual = (e) => {
    e?.stopPropagation?.()
    onOpenActual?.(slot)
  }

  const openReadyBreakdown = (e, tab = 0) => {
    e?.stopPropagation?.()
    setReadyBreakdownTab(tab)
    setReadyBreakdownOpen(true)
  }

  useEffect(() => {
    if (!slot?._id) {
      setExpectedReady({ total: 0, calendarReady: 0, awaitingMark: 0 })
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const inst = NetworkManager(API.slots.GET_SLOT_SECONDARY_SHED_BREAKDOWN)
        const res = await inst.request({}, [slot._id])
        const payload = res?.data?.data ?? res?.data ?? res
        if (cancelled) return
        const s = summaryFromBreakdownPayload(payload, slot)
        setExpectedReady({
          total: s.total,
          calendarReady: s.calendarReady,
          awaitingMark: s.awaitingMark,
        })
      } catch {
        if (!cancelled) setExpectedReady({ total: 0, calendarReady: 0, awaitingMark: 0 })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slot?._id, slot?.startDay, slot?.endDay])

  const refreshExpectedReady = async () => {
    if (!slot?._id) return
    try {
      const inst = NetworkManager(API.slots.GET_SLOT_SECONDARY_SHED_BREAKDOWN)
      const res = await inst.request({}, [slot._id])
      const payload = res?.data?.data ?? res?.data ?? res
      const s = summaryFromBreakdownPayload(payload, slot)
      setExpectedReady({
        total: s.total,
        calendarReady: s.calendarReady,
        awaitingMark: s.awaitingMark,
      })
    } catch {
      /* ignore */
    }
    onSlotChanged?.()
  }

  const openTransfer = (e) => {
    e?.stopPropagation?.()
    setTransferQty(String(mortality))
    setTransferOpen(true)
  }

  const submitTransfer = async (qtyOverride) => {
    if (!slot?._id) return
    const max = mortality
    const qty = Math.min(
      max,
      Math.max(1, Math.floor(Number(qtyOverride ?? transferQty) || 0))
    )
    if (qty < 1 || max < 1) {
      Toast.error("No mortality to transfer")
      return
    }
    setTransferring(true)
    try {
      const inst = NetworkManager(API.slots.TRANSFER_EXPECTED_MORTALITY)
      await inst.request({ quantity: qty }, [slot._id])
      Toast.success(`Transferred ${qty.toLocaleString()} to actual ready`)
      setTransferOpen(false)
      onSlotChanged?.()
    } catch (e) {
      Toast.error(
        e?.response?.data?.message || e?.message || "Transfer failed"
      )
    } finally {
      setTransferring(false)
    }
  }

  const showRolledLagwadPill =
    Boolean(slot?.isCurrentDateSlot) && slotHasRolledLagwadOnCurrent(slot) && onOpenRolledLagwad

  const readyLabel = lagwadSowingMode
    ? "Ready"
    : isFutureSlot
      ? "Calendar ready"
      : "Actual ready"

  const actualReadySub = isFutureSlot
    ? storedReadyOnSlot > pipelineReadyToday
      ? `today ${fmt(pipelineReadyToday)} · slot stores ${fmt(storedReadyOnSlot)}`
      : pipelineReadyToday > 0
        ? "ready date reached in shed"
        : "0 until ready date in window"
    : !isDispatchWindow && syncedReady > 0
      ? "not today's slot"
      : soldTotal > 0
        ? `${fmt(syncedReady)} − ${fmt(soldTotal)} orders = ${fmt(dispatchReady)}`
        : syncedReady > 0
          ? "tap → batch − order check"
          : "calendar / manual"
  const expReadySub =
    soldTotal > 0 && forSellExpected > 0
      ? `for sell ${fmt(forSellExpected)} − ${fmt(soldTotal)} orders`
      : expectedReady.awaitingMark > 0
        ? `${fmt(expectedReady.awaitingMark)} await mark`
        : forSellExpected > 0
          ? "in delivery window"
          : "awaiting in window"

  const sowLabel = lagwadSowingMode ? "Sow" : "Actual"
  const sowSub = lagwadSowingMode ? "90% sellable" : "on slot (no sow %)"
  const sowTitle = lagwadSowingMode
    ? "Sellable lagwad sowed on slot = 90% actual plants"
    : "Physical / booked actual on slot (banana-style — not 90% sow split)"

  const cells = compact
    ? [
        {
          key: "sow",
          definitionKey: lagwadSowingMode ? "lagwadSow" : "lagwadActual",
          label: sowLabel,
          sub: sowSub,
          value: actualPlants,
          className: "bg-teal-50 border-teal-200 hover:bg-teal-100",
          valueClass: "text-teal-900",
          title: sowTitle,
          clickable: Boolean(onOpenActual),
          onClick: openActual,
        },
        {
          key: "ready",
          definitionKey: "lagwadReady",
          label: readyLabel,
          sub: soldLoading && soldTotal === 0 && isDispatchWindow ? "…" : actualReadySub,
          value: readyTileValue,
          className: "bg-sky-50 border-sky-200 hover:bg-sky-100 cursor-pointer",
          valueClass: "text-sky-800",
          title:
            soldTotal > 0
              ? `Ready ${fmt(dispatchReady)} = synced ${fmt(syncedReady)} minus ${fmt(soldTotal)} order dispatch`
              : "Synced plants ready for dispatch — click for batch breakdown",
          clickable: true,
          onClick: (e) => openReadyBreakdown(e, 0),
        },
        {
          key: "expected",
          definitionKey: "lagwadExpected",
          label: "Exp. ready",
          sub: isFutureSlot ? "in window · await mark" : expReadySub,
          value: expTileValue,
          className: "bg-violet-50 border-violet-200 hover:bg-violet-100 cursor-pointer",
          valueClass: "text-violet-900",
          title: `Expected in window: for sell ${fmt(forSellExpected)} − order dispatch ${fmt(soldTotal)} = can sell ${fmt(canSellExpected)}`,
          clickable: true,
          onClick: (e) => openReadyBreakdown(e, 0),
        },
      ]
    : [
        {
          key: "sellable",
          definitionKey: lagwadSowingMode ? "lagwadSow" : "lagwadActual",
          label: lagwadSowingMode ? "Sellable" : "Actual",
          sub: lagwadSowingMode ? "90% actual" : "on slot",
          value: actualPlants,
          className: "bg-teal-50 border-teal-200 hover:bg-teal-100",
          valueClass: "text-teal-900",
          title: sowTitle,
          clickable: Boolean(onOpenActual),
          onClick: openActual,
        },
        {
          key: "mortality",
          definitionKey: "lagwadMortality",
          label: "Exp. mort.",
          sub: mortality > 0 ? "tap → transfer" : lagwadSowingMode ? "10% reserve" : "—",
          value: mortality,
          className:
            mortality > 0
              ? "bg-rose-50 border-rose-200 hover:bg-rose-100 cursor-pointer"
              : "bg-rose-50 border-rose-200",
          valueClass: "text-rose-800",
          title:
            mortality > 0
              ? "Transfer expected mortality → actual ready"
              : "10% lagwad expected mortality reserve",
          clickable: mortality > 0 && Boolean(onSlotChanged),
          onClick: openTransfer,
        },
        {
          key: "actualReady",
          definitionKey: "lagwadReady",
          label: readyLabel,
          sub: soldLoading && soldTotal === 0 ? "…" : actualReadySub,
          value: readyTileValue,
          className: "bg-sky-50 border-sky-200 hover:bg-sky-100 cursor-pointer",
          valueClass: "text-sky-800",
          title:
            soldTotal > 0 && isDispatchWindow
              ? `Actual ready ${fmt(dispatchReady)} = synced ${fmt(syncedReady)} minus ${fmt(soldTotal)} order dispatch`
              : isFutureSlot
                ? storedReadyOnSlot > pipelineReadyToday
                  ? `Calendar ready today ${fmt(pipelineReadyToday)}. Slot actualReadyPlants ${fmt(storedReadyOnSlot)} is pipeline/booking — not dispatch-ready until the delivery window is active.`
                  : "Plants in shed whose expected ready date has passed — click for batch breakdown"
                : "Synced plants ready — click for batch breakdown",
          clickable: true,
          onClick: (e) => openReadyBreakdown(e, 0),
        },
        {
          key: "expReady",
          definitionKey: "lagwadExpected",
          label: "Exp. ready",
          sub: isFutureSlot ? "expected in window" : expReadySub,
          value: expTileValue,
          className: "bg-violet-50 border-violet-200 hover:bg-violet-100 cursor-pointer",
          valueClass: "text-violet-900",
          title: `Expected in window: for sell ${fmt(forSellExpected)} − order dispatch ${fmt(soldTotal)} = can sell ${fmt(canSellExpected)}`,
          clickable: true,
          onClick: (e) => openReadyBreakdown(e, 0),
        },
      ]

  return (
    <div className={className} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      {variant === "detail" && (
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1 flex-wrap">
          Lagwad physical
          {mortality > 0 && onSlotChanged && (
            <span className="text-rose-600 normal-case font-normal text-[10px]">
              · mortality can transfer to ready
            </span>
          )}
          {showRolledLagwadPill ? (
            <button
              type="button"
              className="normal-case font-bold text-[10px] text-teal-800 underline-offset-2 hover:underline ml-auto"
              onClick={(e) => {
                e.stopPropagation()
                onOpenRolledLagwad(slot)
              }}>
              Rolled lagwad →
            </button>
          ) : null}
        </p>
      )}
      {expiredNotCurrent && (actualPlants > 0 || syncedReady > 0) && (
        <p
          className={`${labelSize} text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mb-2`}>
          {syncedReady > 0
            ? `Ready ${fmt(syncedReady)} on this expired window — not sellable here. Roll lagwad to today's slot.`
            : "Lagwad not sellable here — roll to today's slot"}
        </p>
      )}
      {variant === "card" && showRolledLagwadPill && (
        <button
          type="button"
          className="text-[10px] font-bold text-teal-800 mb-1 hover:underline"
          onClick={(e) => {
            e.stopPropagation()
            onOpenRolledLagwad(slot)
          }}>
          Rolled lagwad ({fmt(slot?.rolledInActualReadyPlants ?? 0)} ready in)
        </button>
      )}
      {!hasLagwad && variant === "card" && (
        <p className={`${labelSize} text-slate-400 mb-1`}>Lagwad: no stock on slot</p>
      )}
      {isFutureSlot && (forSellLagwad > 0 || forSellExpected > 0) && (
        <p
          className={`${labelSize} text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-1 mb-2`}>
          Future window — lagwad here is <strong>expected / pipeline</strong> (orders booked).{" "}
          <strong>Can sell = 0</strong> until this delivery window is active (today inside dates).
        </p>
      )}
      {(forSellLagwad > 0 || canSellLagwad > 0 || forSellExpected > 0) && (
        <div
          className={`mb-2 rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5 ${variant === "detail" ? "text-sm" : ""}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <div className="tabular-nums">
              <span className={`${labelSize} font-bold text-slate-600 uppercase`}>
                {lagwadSowingMode ? "For sell " : "Lagwad pool "}
              </span>
              <span className={`${valueSize} font-extrabold text-slate-900`}>{fmt(forSellLagwad)}</span>
            </div>
            <div className="tabular-nums">
              <span className={`${labelSize} font-bold text-emerald-800 uppercase`}>Can sell </span>
              <span className={`${valueSize} font-extrabold text-emerald-900`}>
                {isDispatchWindow ? fmt(canSellLagwad) : "0"}
              </span>
            </div>
          </div>
          <p className={`${labelSize} text-slate-500 leading-snug mt-0.5`}>
            {lagwadSowingMode
              ? "For sell = sow + synced + expected awaiting"
              : "Lagwad pool = max(actual, synced, expected in window) — not triple-counted"}
            {isDispatchWindow ? " · Can sell = ready − orders" : " · Can sell only on today's slot"}
            {soldTotal > 0 && isDispatchWindow
              ? ` (${fmt(soldTotal)} on ${orderCount || "?"} orders)`
              : ""}
            {forSellExpected > 0 ? (
              <>
                {" "}
                · Exp. in window: {fmt(forSellExpected)}
                {lagwadSowingMode && isDispatchWindow
                  ? `, can ${fmt(canSellExpected)} after orders`
                  : ""}
              </>
            ) : null}
          </p>
        </div>
      )}
      <div
        className={
          compact
            ? "grid grid-cols-3 gap-1"
            : variant === "detail"
              ? "grid grid-cols-2 md:grid-cols-4 gap-2"
              : "grid grid-cols-2 gap-1"
        }>
        {cells.map((c) => {
          const inner = (
            <>
              <p className={`${labelSize} text-gray-500 leading-tight flex items-center gap-0.5`}>
                {c.key === "mortality" && c.clickable && (
                  <ArrowRightLeft className="w-2.5 h-2.5 text-rose-500" />
                )}
                {c.label}
                <MetricDefinitionIcon definitionKey={c.definitionKey} />
              </p>
              {c.sub && (
                <p className={`${labelSize} text-gray-400 leading-tight`}>{c.sub}</p>
              )}
              <p className={`${valueSize} font-bold tabular-nums leading-tight ${c.valueClass}`}>
                {fmt(c.value)}
              </p>
            </>
          )
          if (c.clickable) {
            return (
              <Tooltip key={c.key} title={c.title} arrow>
                <button
                  type="button"
                  className={`${tileBase} ${pad} ${c.className} cursor-pointer hover:shadow-sm w-full`}
                  onClick={c.onClick}>
                  {inner}
                </button>
              </Tooltip>
            )
          }
          return (
            <Tooltip key={c.key} title={c.title} arrow>
              <div className={`${tileBase} ${pad} ${c.className}`}>{inner}</div>
            </Tooltip>
          )
        })}
      </div>

      <SlotActualReadyBreakdownModal
        open={readyBreakdownOpen}
        onClose={() => setReadyBreakdownOpen(false)}
        slot={slot}
        initialTab={readyBreakdownTab}
        onMarkedReady={refreshExpectedReady}
      />

      <Dialog
        open={transferOpen}
        onClose={() => !transferring && setTransferOpen(false)}
        onClick={(e) => e.stopPropagation()}
        maxWidth="xs"
        fullWidth>
        <DialogTitle className="text-base font-bold">
          Transfer expected mortality → ready
        </DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-600 mb-3">
            Moves plants from <strong>10% mortality reserve</strong> to{" "}
            <strong>actual ready</strong> when plants survived.
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Available to transfer: <strong>{fmt(mortality)}</strong>
          </p>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Plants to transfer"
            value={transferQty}
            onChange={(e) => setTransferQty(e.target.value)}
            inputProps={{ min: 1, max: mortality }}
          />
        </DialogContent>
        <DialogActions className="px-4 pb-3 gap-2">
          <Button onClick={() => setTransferOpen(false)} disabled={transferring}>
            Cancel
          </Button>
          <Button
            variant="outlined"
            disabled={transferring || mortality < 1}
            onClick={() => submitTransfer(mortality)}>
            Transfer all
          </Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={transferring}
            onClick={() => submitTransfer()}>
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default SlotLagwadMetrics
