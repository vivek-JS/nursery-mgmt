import React, { useState } from "react"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import SowingPacketsWhatsAppDialog from "./SowingPacketsWhatsAppDialog"

function slotIdsOf(card) {
  return (card.slotIds || card.slots || [])
    .map((s) => (typeof s === "object" ? s._id || s.slotId : s))
    .filter(Boolean)
    .join(",")
}

async function fetchOrders(card, sowHorizonDays) {
  const instance = NetworkManager(API.sowing.GET_ORDER_WISE_SOWING)
  const res = await instance.request(
    {},
    {
      plantId: card.plantId,
      subtypeId: card.subtypeId,
      slotIds: slotIdsOf(card),
      days: sowHorizonDays,
    }
  )
  return res?.data?.data || []
}

async function loadBundles(cards, sowHorizonDays) {
  const list = (cards || []).filter(Boolean)
  const out = new Array(list.length)
  let i = 0
  const workers = Array.from({ length: Math.min(6, list.length) }, async () => {
    while (i < list.length) {
      const idx = i++
      const card = list[idx]
      try {
        out[idx] = { card, orders: await fetchOrders(card, sowHorizonDays) }
      } catch {
        out[idx] = { card, orders: [] }
      }
    }
  })
  await Promise.all(workers)
  return out.filter(Boolean)
}

export function useEasyRequestWhatsApp(sowHorizonDays) {
  const [waCtx, setWaCtx] = useState(null)

  const openBundles = async (cards) => {
    const list = (cards || []).filter(Boolean)
    if (!list.length) return
    setWaCtx({ bundles: [], loading: true })
    try {
      const bundles = await loadBundles(list, sowHorizonDays)
      setWaCtx({ bundles, loading: false })
    } catch {
      setWaCtx(null)
      Toast.error("Could not load orders for WhatsApp")
    }
  }

  const openWhatsApp = (card) => openBundles(card ? [card] : [])
  const openCropWhatsApp = (group) => openBundles(group?.cards || [])
  const openAllWhatsApp = (cards) => openBundles(cards)

  const waDialog = (
    <SowingPacketsWhatsAppDialog
      open={Boolean(waCtx)}
      onClose={() => setWaCtx(null)}
      bundles={waCtx?.bundles || []}
      loading={Boolean(waCtx?.loading)}
    />
  )

  return { openWhatsApp, openCropWhatsApp, openAllWhatsApp, waDialog }
}
