import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import DirectSowCardGrid from "./DirectSowCardGrid"
import {
  fmtNum,
  addDaysToYmd,
  daysBetweenYmd,
  groupDeliveryDays,
  todayYmd,
  calcDefaultPacketsUsed,
} from "./directSowUtils"

function defaultPlantReadyDays(dg, group) {
  const rd = Math.max(0, Number(dg.slotReadyDays) || Number(group?.plantReadyDays) || 0)
  return rd ? String(rd) : ""
}

function readyDateFromSow(sow, plantReadyDays) {
  const rd = Math.max(0, Number(plantReadyDays) || 0)
  return rd ? addDaysToYmd(sow, rd) : sow
}

function buildDrafts(dayCards, group, defaultSowDate) {
  const sow = defaultSowDate || todayYmd()
  const cf = Number(group?.conversionFactor) || 1
  const drafts = {}
  for (const dg of dayCards) {
    const key = dg.deliveryKey
    const plantReadyDays = defaultPlantReadyDays(dg, group)
    const qty = dg.orders?.length ? String(dg.plants || "") : ""
    drafts[key] = {
      sowDate: sow,
      plantReadyDays,
      readyDate: readyDateFromSow(sow, plantReadyDays),
      quantity: qty,
      packetsUsed: calcDefaultPacketsUsed(qty, cf),
      batchNumber: "",
    }
  }
  return drafts
}

export default function SubtypeDirectSowPanel({ group, sowDate: defaultSowDate, onSowed }) {
  const slots = group?.slots || group?.slotDays || []
  const ordersLen = group?.orders?.length ?? 0

  const dayCards = useMemo(
    () => groupDeliveryDays(group?.orders || [], slots),
    [group?.orders, ordersLen, slots]
  )

  const [cardDrafts, setCardDrafts] = useState({})
  const [savingKey, setSavingKey] = useState(null)
  const prevSowDateRef = useRef(defaultSowDate)
  const subtypeKey = `${group?.plantId}-${group?.subtypeId}`

  useEffect(() => {
    setCardDrafts(buildDrafts(dayCards, group, defaultSowDate))
    prevSowDateRef.current = defaultSowDate
  }, [subtypeKey, group?.plantReadyDays, dayCards.length, ordersLen])

  useEffect(() => {
    if (!defaultSowDate || defaultSowDate === prevSowDateRef.current) return
    prevSowDateRef.current = defaultSowDate
    setCardDrafts((prev) => {
      if (!Object.keys(prev).length) return prev
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        const cur = next[key]
        const rd = Math.max(0, Number(cur.plantReadyDays) || Number(group?.plantReadyDays) || 0)
        next[key] = {
          ...cur,
          sowDate: defaultSowDate,
          readyDate: readyDateFromSow(defaultSowDate, rd),
        }
      }
      return next
    })
  }, [defaultSowDate, group?.plantReadyDays])

  const onDraftChange = useCallback((deliveryKey, patch) => {
    setCardDrafts((prev) => ({
      ...prev,
      [deliveryKey]:
        typeof patch === "object" ? { ...(prev[deliveryKey] || {}), ...patch } : prev[deliveryKey],
    }))
  }, [])

  const applyMonthReadyDays = useCallback(
    (_monthKey, rawVal, daysInMonth) => {
      const n = Math.max(0, Number(rawVal) || 0)
      if (!n) return
      setCardDrafts((prev) => {
        const next = { ...prev }
        for (const dg of daysInMonth || []) {
          const key = dg.deliveryKey
          const cur = next[key] || {}
          const sow = cur.sowDate || defaultSowDate || todayYmd()
          next[key] = {
            ...cur,
            plantReadyDays: String(n),
            readyDate: addDaysToYmd(sow, n),
          }
        }
        return next
      })
    },
    [defaultSowDate]
  )

  const handleSow = async (dayGroup, draft) => {
    const qtyNum = Number(draft.quantity) || 0
    const pktNum = Math.max(0, Number(draft.packetsUsed) || 0)
    const days =
      draft.readyDate && draft.sowDate
        ? daysBetweenYmd(draft.sowDate, draft.readyDate)
        : Math.max(0, Number(draft.plantReadyDays) || 0)

    if (qtyNum <= 0 || !draft.sowDate || !draft.readyDate || days == null || days < 0) {
      Toast.error("Enter qty, sow date, and ready date on/after sow date")
      return
    }

    const orderIds = (dayGroup.orders || []).map((o) => String(o.orderId))
    const cardKey = dayGroup.deliveryKey

    setSavingKey(cardKey)
    try {
      const instance = NetworkManager(API.sowing.SUBMIT_ADMIN_DIRECT_SOW)
      const payload = {
        date: draft.sowDate,
        sowDate: draft.sowDate,
        readyDate: draft.readyDate,
        plantsSowed: qtyNum,
        packetsUsed: pktNum,
        plantReadyDays: days,
        batchNumber: String(draft.batchNumber || "").trim(),
        shedName: "Office",
        notes: orderIds.length
          ? `Direct sow · delivery ${dayGroup.label}`
          : `Excess sow · ready ${draft.readyDate}`,
        plantId: group.plantId,
        subtypeId: group.subtypeId,
      }
      if (orderIds.length) payload.orderIds = orderIds
      else if (dayGroup.slotId) payload.slotId = String(dayGroup.slotId)

      const res = await instance.request(payload)
      if (res?.data?.success) {
        const d = res.data.data || {}
        Toast.success(
          `Sow card ${dayGroup.label}: ${fmtNum(qtyNum)} plants · ${fmtNum(pktNum)} pkt · res ${fmtNum(d.orderCoveredPlants || 0)} · sale ${fmtNum(d.excessPlants || 0)}`
        )
        onSowed?.(res.data)
      } else {
        Toast.error(res?.data?.message || "Failed to sow")
      }
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to sow")
    } finally {
      setSavingKey(null)
    }
  }

  if (!group) return null

  return (
    <DirectSowCardGrid
      group={group}
      dayCards={dayCards}
      cardDrafts={cardDrafts}
      savingKey={savingKey}
      onDraftChange={onDraftChange}
      onSow={handleSow}
      onApplyMonthReadyDays={applyMonthReadyDays}
      conversionFactor={group?.conversionFactor || 1}
      hasSeedProduct={group?.hasSeedProduct}
    />
  )
}
