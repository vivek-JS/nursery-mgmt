import { useState } from "react"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import SowingPacketsWhatsAppDialog from "./SowingPacketsWhatsAppDialog"

export function useEasyRequestWhatsApp(sowHorizonDays) {
  const [waCtx, setWaCtx] = useState(null)

  const openWhatsApp = async (card) => {
    if (!card) return
    try {
      const slotIds = (card.slotIds || card.slots || [])
        .map((s) => (typeof s === "object" ? s._id || s.slotId : s))
        .filter(Boolean)
        .join(",")
      const instance = NetworkManager(API.sowing.GET_ORDER_WISE_SOWING)
      const res = await instance.request(
        {},
        {
          plantId: card.plantId,
          subtypeId: card.subtypeId,
          slotIds,
          days: sowHorizonDays,
        }
      )
      setWaCtx({ card, rows: res?.data?.data || [] })
    } catch {
      Toast.error("Could not load orders for WhatsApp")
    }
  }

  const waDialog = (
    <SowingPacketsWhatsAppDialog
      open={Boolean(waCtx)}
      onClose={() => setWaCtx(null)}
      card={waCtx?.card}
      orders={waCtx?.rows || []}
    />
  )

  return { openWhatsApp, waDialog }
}
