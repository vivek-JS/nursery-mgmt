import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  Alert,
  Divider,
  Tabs,
  Tab,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import moment from "moment"
import { API, NetworkManager } from "network/core"
import { asDisplayLabel, coerceMongoId } from "./misConstants"

const PAGE_SIZE = 20
const SCROLL_LOAD_THRESHOLD_PX = 96
const TAB_REGULAR = "regular"
const TAB_PAST_DUE = "pastDue"

const BUCKET_LABELS = {
  booking: "Booking",
  deliveryTotal: "Delivery",
  accepted: "Accepted",
  farmReady: "Farm ready",
  readyForDispatch: "Ready for dispatch",
  dispatchProcess: "In dispatch",
  partiallyCompleted: "Partial",
  yetToDispatch: "Yet to dispatch",
  dispatched: "Dispatched",
  vehicleDispatched: "Vehicle out",
  completed: "Completed",
  other: "Other",
  unique: "Unique orders",
}

function formatIstDate(dateVal) {
  if (!dateVal) return "—"
  const d = moment(dateVal)
  if (!d.isValid()) return "—"
  return d.utcOffset(330).format("DD MMM YYYY")
}

function plantCount(order) {
  return (Number(order?.numberOfPlants) || 0) + (Number(order?.additionalPlants) || 0)
}

function farmerLabel(order) {
  return asDisplayLabel(order?.farmerName, asDisplayLabel(order?.orderFor?.name, "—"))
}

function farmerLocationLine(order) {
  const parts = [
    asDisplayLabel(order?.farmerVillage, ""),
    asDisplayLabel(order?.farmerTaluka, ""),
    asDisplayLabel(order?.farmerDistrict, ""),
  ].filter(Boolean)
  return parts.length ? parts.join(" · ") : null
}

function plantLabel(order) {
  const type = asDisplayLabel(order?.plantTypeName, "")
  const sub = asDisplayLabel(order?.plantSubtypeName, "")
  if (type && sub) return `${type} · ${sub}`
  if (type) return type
  if (sub) return sub
  return "—"
}

function dispatchVehicleLine(order) {
  const d = order?.dispatch
  if (!d) return null
  const parts = []
  if (d.vehicleName) parts.push(d.vehicleName)
  if (d.driverName) parts.push(`Driver: ${d.driverName}`)
  if (d.invoiceNumber) parts.push(`DC ${d.invoiceNumber}`)
  return parts.length ? parts.join(" · ") : null
}

function orderRowKey(order) {
  return String(order?.id || order?._id || order?.orderId || "")
}

function mergeOrderPages(prev, batch, append) {
  const merged = append ? [...prev, ...batch] : batch
  const seen = new Set()
  return merged.filter((order) => {
    const key = orderRowKey(order)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractMisOrdersPayload(res) {
  const root = res?.data
  const inner = root?.data ?? root
  const orders = Array.isArray(inner?.data) ? inner.data : Array.isArray(inner) ? inner : []
  return {
    orders,
    total: inner?.total ?? root?.total ?? null,
    totalPages: Number(inner?.totalPages ?? root?.totalPages ?? 1) || 1,
    currentPage: Number(inner?.currentPage ?? root?.currentPage ?? 1) || 1,
  }
}

function shouldSplitPastDueTabs(filter) {
  if (!filter?.includeAllPastDue || filter?.pastDueOnly) return false
  if (filter.bucket === "unique") return false
  return filter.bucket === "deliveryTotal"
}

/** Query params for GET /order/admin-mis-orders — mirrors MIS count rules on the server. */
function buildMisOrdersParams(filter, page, drawerTab = TAB_REGULAR) {
  const params = {
    page,
    limit: PAGE_SIZE,
    bucket: filter.bucket,
    mode: filter.mode || "delivery",
  }

  const split = shouldSplitPastDueTabs(filter)

  if (split && drawerTab === TAB_PAST_DUE) {
    params.pastDueOnly = "true"
    params.startDate = filter.rangeStart
    params.endDate = filter.rangeEnd
  } else if (filter.pastDueOnly) {
    params.pastDueOnly = "true"
    params.startDate = filter.rangeStart
    params.endDate = filter.rangeEnd
  } else if (filter.date && filter.date !== "past-due") {
    params.date = filter.date
  } else if (filter.rangeStart && filter.rangeEnd) {
    params.startDate = filter.rangeStart
    params.endDate = filter.rangeEnd
  }

  if (filter.dueOnly) params.dueOnly = "true"

  if (split) {
    if (drawerTab === TAB_REGULAR) {
      params.drawerSegment = "inRange"
    }
  } else if (filter.includeAllPastDue) {
    params.includeAllPastDue = "true"
  }

  const plantId = coerceMongoId(filter.plantId)
  const subtypeId = coerceMongoId(filter.subtypeId)
  if (plantId) params.plantId = plantId
  if (subtypeId) params.subtypeId = subtypeId

  const salesPersonId = coerceMongoId(
    filter.salesPersonId ?? (filter.scope === "sales" ? filter.personId : null)
  )
  if (salesPersonId && filter.scope === "sales") {
    params.salesPerson = salesPersonId
  }

  const dealerId = coerceMongoId(filter.dealerId ?? (filter.scope === "dealer" ? filter.personId : null))
  if (dealerId && filter.scope === "dealer") {
    params.orderDealer = dealerId
  }

  return params
}

function tabCountLabel(summaryPart) {
  const orders = summaryPart?.orders
  if (orders == null) return ""
  return ` (${Number(orders).toLocaleString()})`
}

export default function MisOrderDrawer({ open, onClose, filter }) {
  const splitTabs = shouldSplitPastDueTabs(filter)
  const [drawerTab, setDrawerTab] = useState(TAB_REGULAR)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [orders, setOrders] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [apiTotal, setApiTotal] = useState(null)

  const scrollRef = useRef(null)
  const loadMoreRef = useRef(null)
  const fetchGenRef = useRef(0)
  const loadMoreInFlightRef = useRef(false)
  const listStateRef = useRef({
    loading: false,
    loadingMore: false,
    hasMore: false,
    page: 1,
    drawerTab: TAB_REGULAR,
  })

  const title = (() => {
    if (!filter) return ""
    const parts = []
    if (
      (filter.scope === "variety" || filter.scope === "sales" || filter.scope === "dealer") &&
      filter.rangeStart &&
      filter.rangeEnd
    ) {
      parts.push(
        `${moment(filter.rangeStart).format("DD MMM")} – ${moment(filter.rangeEnd).format("DD MMM YYYY")}`
      )
    } else if (filter.date && filter.date !== "past-due") {
      parts.push(moment(filter.date, "YYYY-MM-DD").format("ddd, DD MMM YYYY"))
    } else if (filter.pastDueOnly) {
      parts.push("Past due (before range)")
    }
    const pn = asDisplayLabel(filter.plantName, "")
    const st = asDisplayLabel(filter.subtype, "")
    if (pn) parts.push(pn)
    if (st) parts.push(st)
    const person = asDisplayLabel(filter.personName, "")
    if (person && filter.scope !== "variety") parts.push(person)
    if (filter.bucket && filter.bucket !== "unique") {
      parts.push(BUCKET_LABELS[filter.bucket] || filter.bucket)
    }
    return parts.filter(Boolean).join(" · ")
  })()

  const fetchPage = useCallback(
    async (pageNum, { append = false, tab = drawerTab } = {}) => {
      if (!filter || filter.bucket === "unique") {
        setOrders([])
        setApiTotal(null)
        setHasMore(false)
        return
      }

      const hasDay = Boolean(filter.date && filter.date !== "past-due")
      const hasRange = Boolean(filter.rangeStart && filter.rangeEnd) || Boolean(filter.pastDueOnly)
      if (!hasDay && !hasRange) {
        setOrders([])
        setApiTotal(null)
        setHasMore(false)
        return
      }

      const gen = ++fetchGenRef.current
      if (append) setLoadingMore(true)
      else {
        setLoading(true)
        setError("")
      }

      try {
        const instance = NetworkManager(API.ORDER.ADMIN_MIS_ORDERS)
        const res = await instance.request({}, buildMisOrdersParams(filter, pageNum, tab))
        if (gen !== fetchGenRef.current) return

        if (!res?.success) {
          throw new Error(res?.message || "Failed to load orders")
        }

        const { orders: batch, total, totalPages, currentPage } = extractMisOrdersPayload(res)
        const morePages = currentPage < totalPages

        setOrders((prev) => mergeOrderPages(prev, batch, append))
        setApiTotal(total)
        setPage(currentPage)
        setHasMore(morePages)
      } catch (err) {
        if (gen !== fetchGenRef.current) return
        setError(err?.response?.data?.message || err?.message || "Failed to load orders")
        if (!append) {
          setOrders([])
          setApiTotal(null)
        }
        setHasMore(false)
      } finally {
        if (gen === fetchGenRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [filter, drawerTab]
  )

  listStateRef.current = {
    loading,
    loadingMore,
    hasMore,
    page,
    drawerTab,
  }

  const tryLoadMore = useCallback(() => {
    const s = listStateRef.current
    if (s.loading || s.loadingMore || !s.hasMore || loadMoreInFlightRef.current) return
    loadMoreInFlightRef.current = true
    fetchPage(s.page + 1, { append: true, tab: s.drawerTab }).finally(() => {
      loadMoreInFlightRef.current = false
    })
  }, [fetchPage])

  const isNearScrollEnd = useCallback((el) => {
    if (!el) return false
    return el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_LOAD_THRESHOLD_PX
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (isNearScrollEnd(el)) tryLoadMore()
  }, [isNearScrollEnd, tryLoadMore])

  useEffect(() => {
    if (!open || !filter) return
    setDrawerTab(TAB_REGULAR)
  }, [open, filter])

  useEffect(() => {
    if (!open || !filter) return
    setOrders([])
    setPage(1)
    setHasMore(false)
    setApiTotal(null)
    loadMoreInFlightRef.current = false
    fetchPage(1, { append: false, tab: drawerTab })
  }, [open, filter, drawerTab, fetchPage])

  /** Fill viewport when first page is shorter than drawer (sentinel stays visible). */
  useEffect(() => {
    if (!open || loading || loadingMore || !hasMore) return undefined
    const el = scrollRef.current
    if (!el) return undefined
    const id = requestAnimationFrame(() => {
      if (el.scrollHeight <= el.clientHeight + SCROLL_LOAD_THRESHOLD_PX) {
        tryLoadMore()
      }
    })
    return () => cancelAnimationFrame(id)
  }, [open, orders.length, hasMore, loading, loadingMore, tryLoadMore])

  useEffect(() => {
    if (!open || !hasMore) return undefined
    const root = scrollRef.current
    const target = loadMoreRef.current
    if (!root || !target) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) tryLoadMore()
      },
      { root, rootMargin: "160px 0px", threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [open, hasMore, tryLoadMore, orders.length])

  const countLabel = (() => {
    if (loading && !orders.length) return null
    const shown = orders.length
    if (apiTotal != null) {
      if (!hasMore && shown === apiTotal) {
        return `${shown.toLocaleString()} order${shown === 1 ? "" : "s"}`
      }
      return `${shown.toLocaleString()} of ${apiTotal.toLocaleString()}`
    }
    if (shown > 0) {
      return `${shown.toLocaleString()}${hasMore ? "+" : ""} order${shown === 1 ? "" : "s"}`
    }
    return null
  })()

  const showEmptyMessage =
    !loading && !loadingMore && !error && filter?.bucket !== "unique" && orders.length === 0

  const dueSummary = filter?.dueSummary
  const regularTabLabel = `In range${tabCountLabel(dueSummary?.inRange)}`
  const pastDueTabLabel = `Past due${tabCountLabel(dueSummary?.pastDue)}`

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 440 },
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #f1f8e9 0%, #fff 120px)",
        },
      }}>
      <Box sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 1, flexShrink: 0 }}>
        <Box flex={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          {countLabel && (
            <Typography variant="caption" color="text.secondary">
              {countLabel}
              {hasMore ? ` · ${PAGE_SIZE} per page · scroll for more` : ""}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </Box>

      {splitTabs && (
        <Tabs
          value={drawerTab}
          onChange={(_, v) => setDrawerTab(v)}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            flexShrink: 0,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "rgba(255,255,255,0.7)",
            "& .MuiTab-root": { minHeight: 40, fontSize: 12, fontWeight: 700, textTransform: "none" },
          }}>
          <Tab value={TAB_REGULAR} label={regularTabLabel} />
          <Tab value={TAB_PAST_DUE} label={pastDueTabLabel} />
        </Tabs>
      )}

      <Divider />

      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          p: 2,
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
          WebkitOverflowScrolling: "touch",
        }}>
        {splitTabs && drawerTab === TAB_PAST_DUE && (
          <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
            Delivery date is before {filter.rangeStart ? moment(filter.rangeStart).format("DD MMM YYYY") : "range start"}.
          </Alert>
        )}

        {filter?.bucket === "unique" && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Unique orders combine booking and delivery for that day. Open another cell to see order lists.
          </Alert>
        )}

        {loading && !orders.length && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} color="success" />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {showEmptyMessage && (
          <Typography color="text.secondary" variant="body2" py={2}>
            No orders match this filter.
          </Typography>
        )}

        {orders.length > 0 && (
          <List dense disablePadding>
            {orders.map((order) => (
              <ListItem
                key={`${drawerTab}-${orderRowKey(order)}`}
                alignItems="flex-start"
                sx={{
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: "#fff",
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {farmerLabel(order)}
                        </Typography>
                        {farmerLocationLine(order) && (
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>
                            {farmerLocationLine(order)}
                          </Typography>
                        )}
                        <Typography variant="caption" color="primary.main" fontWeight={700} display="block">
                          Order #{order.orderId || "—"}
                        </Typography>
                      </Box>
                      <Chip label={order.orderStatus || "—"} size="small" sx={{ height: 20, fontSize: 10 }} />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" fontWeight={700} color="success.dark" display="block" sx={{ mt: 0.5 }}>
                        {plantCount(order).toLocaleString()} plants
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {plantLabel(order)}
                      </Typography>
                      {dispatchVehicleLine(order) && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
                          {dispatchVehicleLine(order)}
                        </Typography>
                      )}
                      <Box
                        sx={{
                          mt: 0.75,
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          bgcolor: "grey.50",
                          border: "1px solid",
                          borderColor: "grey.200",
                        }}>
                        <Typography variant="caption" display="block" color="text.secondary" lineHeight={1.5}>
                          <Box component="span" fontWeight={600} color="text.primary">
                            Booked:{" "}
                          </Box>
                          {formatIstDate(order.orderBookingDate)}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary" lineHeight={1.5}>
                          <Box component="span" fontWeight={600} color="text.primary">
                            Delivery:{" "}
                          </Box>
                          {formatIstDate(order.deliveryDate)}
                        </Typography>
                        {order.dispatchedDate && (
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                            lineHeight={1.5}>
                            <Box component="span" fontWeight={600} color="text.primary">
                              Dispatched:{" "}
                            </Box>
                            {formatIstDate(order.dispatchedDate)}
                          </Typography>
                        )}
                        {order.completedDate && (
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                            lineHeight={1.5}>
                            <Box component="span" fontWeight={600} color="text.primary">
                              Completed:{" "}
                            </Box>
                            {formatIstDate(order.completedDate)}
                          </Typography>
                        )}
                      </Box>
                      {order.salesPersonName && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Sales: {order.salesPersonName}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {hasMore && (
          <Box
            ref={loadMoreRef}
            sx={{
              minHeight: 48,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 1,
            }}>
            {loadingMore ? (
              <CircularProgress size={24} color="success" />
            ) : (
              <Button size="small" variant="text" color="success" onClick={tryLoadMore}>
                Load more
              </Button>
            )}
          </Box>
        )}

        {!hasMore && orders.length > 0 && !loading && !loadingMore && (
          <Typography variant="caption" color="text.secondary" align="center" display="block" py={1}>
            End of list
          </Typography>
        )}
      </Box>
    </Drawer>
  )
}
