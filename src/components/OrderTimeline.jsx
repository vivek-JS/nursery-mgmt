import React, { useEffect, useState } from "react"
import moment from "moment"
import { CircularProgress, Chip } from "@mui/material"
import { API, NetworkManager } from "network/core"

const EVENT_LABELS = {
  ORDER_CREATED: "Order created",
  ORDER_STATUS_CHANGED: "Status changed",
  ORDER_RATE_CHANGED: "Rate changed",
  ORDER_QUANTITY_CHANGED: "Quantity changed",
  DISPATCH_COMPLETED: "Dispatch completed",
  PAYMENT_ADDED: "Payment added",
  PAYMENT_RECEIVED: "Payment received",
  RATE_CHANGE_REQUESTED: "Rate change requested",
  RATE_CHANGE_APPROVED: "Rate change approved",
  RATE_CHANGE_REJECTED: "Rate change rejected",
}

function formatValue(val) {
  if (val == null || val === "") return "—"
  if (typeof val === "object") {
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  }
  return String(val)
}

export default function OrderTimeline({
  orderId,
  orderDomain = "PLANT",
  limit = 100,
  showFallbackHint = true,
}) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orderId) {
      setEvents([])
      return undefined
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const endpoint =
          orderDomain === "AGRI"
            ? API.INVENTORY.GET_AGRI_ORDER_TIMELINE
            : API.ORDER.GET_ORDER_TIMELINE
        const instance = NetworkManager(endpoint)
        // urlBuilder replaces :orderId / :id only via pathParams array (not query keys)
        const res = await instance.request({}, {
          pathParams: [orderId],
          limit: String(limit),
        })
        const body = res?.data || {}
        const payload = body.data || body
        const list = payload.events || []
        if (!cancelled) setEvents(Array.isArray(list) ? list : [])
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Failed to load timeline")
          setEvents([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [orderId, orderDomain, limit])

  if (!orderId) return null

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-500 text-sm">
        <CircularProgress size={18} />
        Loading activity timeline…
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        {error}
        {showFallbackHint && (
          <div className="text-xs mt-1 text-amber-600">
            Showing embedded history below if available.
          </div>
        )}
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
        No unified timeline events yet.
        {showFallbackHint && (
          <span className="block text-xs mt-1">
            Run backfill or perform an action to populate OrderEvent history.
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-3 border-b bg-indigo-50 flex items-center justify-between">
        <h4 className="font-medium text-indigo-900 text-sm">Activity timeline</h4>
        <span className="text-xs text-indigo-600">{events.length} events</span>
      </div>
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {events.map((ev) => (
          <div key={ev._id} className="flex gap-3 text-sm border-l-2 border-indigo-200 pl-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">
                {EVENT_LABELS[ev.eventType] || ev.eventType?.replace(/_/g, " ") || "Event"}
              </div>
              {ev.description && (
                <div className="text-gray-600 mt-0.5">{ev.description}</div>
              )}
              {(ev.previousValue != null || ev.newValue != null) && (
                <div className="text-xs text-gray-500 mt-1">
                  {formatValue(ev.previousValue)} → {formatValue(ev.newValue)}
                </div>
              )}
              {ev.reason && (
                <div className="text-xs text-amber-800 mt-1">Reason: {ev.reason}</div>
              )}
              {ev.approval?.required && (
                <Chip
                  size="small"
                  label={`Approval: ${ev.approval.status || "PENDING"}`}
                  className="mt-1"
                  color={ev.approval.status === "APPROVED" ? "success" : "default"}
                />
              )}
              <div className="text-xs text-gray-400 mt-1">
                {ev.actorName ? `by ${ev.actorName}` : ""}
                {ev.occurredAt
                  ? ` · ${moment(ev.occurredAt).format("DD MMM YYYY, hh:mm A")}`
                  : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
