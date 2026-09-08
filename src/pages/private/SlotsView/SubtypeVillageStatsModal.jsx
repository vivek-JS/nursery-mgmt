import React, { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  Tabs,
  Tab,
} from "@mui/material"
import { MapPin, ChevronRight, Truck, Users } from "lucide-react"
import { API, NetworkManager } from "network/core"

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN")

const splitLabel = (native, rolled) => {
  const n = Number(native) || 0
  const r = Number(rolled) || 0
  if (n > 0 && r > 0) return `Native ${fmt(n)} · Rollover ${fmt(r)}`
  if (r > 0) return `Rollover ${fmt(r)}`
  if (n > 0) return `Native ${fmt(n)}`
  return "—"
}

const StatsTable = ({
  rows,
  nameKey,
  nameHeader,
  totalHeader,
  emptyLabel,
  onSelectRow,
  showSplit = true,
}) => {
  if (!rows?.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
        {emptyLabel}
      </Typography>
    )
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>{nameHeader}</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>
            {totalHeader}
          </TableCell>
          {showSplit ? (
            <TableCell align="right" sx={{ fontWeight: 700, minWidth: 120 }}>
              Split
            </TableCell>
          ) : null}
          <TableCell align="right" sx={{ fontWeight: 700 }}>
            Orders
          </TableCell>
          {onSelectRow ? <TableCell sx={{ width: 28 }} /> : null}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, idx) => {
          const name = row[nameKey] || "—"
          return (
            <TableRow
              key={`${name}-${idx}`}
              hover={Boolean(onSelectRow)}
              onClick={() => onSelectRow?.(row)}
              sx={{ cursor: onSelectRow ? "pointer" : "default" }}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{name}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                {fmt(row.plants)}
              </TableCell>
              {showSplit ? (
                <TableCell align="right" sx={{ fontSize: 11, color: "text.secondary" }}>
                  {splitLabel(row.nativePlants, row.rolledPlants)}
                </TableCell>
              ) : null}
              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(row.orders)}
              </TableCell>
              {onSelectRow ? (
                <TableCell align="right" sx={{ color: "text.secondary" }}>
                  <ChevronRight className="w-4 h-4 inline" />
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export const VILLAGE_STATS_TAB = {
  REMAINING: 0,
  DISPATCHED: 1,
  SALES: 2,
}

const TAB_REMAINING = VILLAGE_STATS_TAB.REMAINING
const TAB_DISPATCHED = VILLAGE_STATS_TAB.DISPATCHED
const TAB_SALES = VILLAGE_STATS_TAB.SALES

const SubtypeVillageStatsModal = ({
  open,
  onClose,
  plantId,
  year,
  month,
  subtype,
  onSelectVillage,
  onSelectSales,
  initialTab = TAB_REMAINING,
}) => {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState(initialTab)

  const load = useCallback(async () => {
    if (!plantId || !year || !subtype?.subtypeId) return
    setLoading(true)
    try {
      const inst = NetworkManager(API.slots.GET_SUBTYPE_VILLAGE_STATS)
      const params = { plantId, year, subtypeId: subtype.subtypeId }
      if (month) params.month = month
      const res = await inst.request({}, params)
      const payload = res?.data?.data ?? res?.data ?? {}
      setStats(payload)
    } catch (e) {
      console.error(e)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [plantId, year, month, subtype?.subtypeId])

  useEffect(() => {
    if (!open) {
      setStats(null)
      return
    }
    setTab(initialTab)
    void load()
  }, [open, load, initialTab])

  const subtypeLabel = stats?.subtypeName || subtype?.subtypeName || "Subtype"
  const monthLabel = stats?.month || month || ""

  const remainingRows = stats?.topByRemaining?.length
    ? stats.topByRemaining
    : stats?.topByDispatch || []
  const dispatchedRows = stats?.topByDispatched || []
  const salesRows = stats?.topBySales || []

  const handleSelectVillage = (row) => {
    if (!onSelectVillage) return
    onSelectVillage({ ...row, mode: tab === TAB_DISPATCHED ? "dispatched" : "remaining" })
    onClose?.()
  }

  const handleSelectSales = (row) => {
    if (!onSelectSales) return
    onSelectSales({ ...row, mode: "remaining" })
    onClose?.()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5, pb: 0 }}>
        <MapPin className="w-5 h-5 text-violet-600" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Month dispatch breakdown
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {monthLabel ? `${monthLabel} · ` : ""}
            {subtypeLabel} · {year}
          </Typography>
        </Box>
      </DialogTitle>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          px: 2,
          minHeight: 42,
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": { minHeight: 42, textTransform: "none", fontWeight: 600, fontSize: 13 },
        }}>
        <Tab icon={<MapPin className="w-3.5 h-3.5" />} iconPosition="start" label="Villages · to dispatch" />
        <Tab icon={<Truck className="w-3.5 h-3.5" />} iconPosition="start" label="Villages · dispatched" />
        <Tab icon={<Users className="w-3.5 h-3.5" />} iconPosition="start" label="Sales · to dispatch" />
      </Tabs>

      <DialogContent dividers sx={{ p: 2, minHeight: 280 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            {tab === TAB_REMAINING ? (
              <>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  Top 5 villages by plants still to dispatch · native vs past-due rollover
                </Typography>
                <StatsTable
                  rows={remainingRows}
                  nameKey="village"
                  nameHeader="Village"
                  totalHeader="To dispatch"
                  emptyLabel={
                    month
                      ? `No orders to dispatch for ${month} in this subtype.`
                      : "No orders to dispatch for this subtype."
                  }
                  onSelectRow={onSelectVillage ? handleSelectVillage : undefined}
                />
              </>
            ) : null}

            {tab === TAB_DISPATCHED ? (
              <>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  Top 5 villages by dispatched & completed plants this month
                </Typography>
                <StatsTable
                  rows={dispatchedRows}
                  nameKey="village"
                  nameHeader="Village"
                  totalHeader="Dispatched"
                  emptyLabel={
                    month
                      ? `No dispatched orders for ${month} in this subtype.`
                      : "No dispatched orders for this subtype."
                  }
                />
              </>
            ) : null}

            {tab === TAB_SALES ? (
              <>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  Top 5 sales persons by plants still to dispatch · tap a row to open orders
                </Typography>
                <StatsTable
                  rows={salesRows}
                  nameKey="salesPersonName"
                  nameHeader="Sales person"
                  totalHeader="To dispatch"
                  emptyLabel={
                    month
                      ? `No sales backlog for ${month} in this subtype.`
                      : "No sales backlog for this subtype."
                  }
                  onSelectRow={onSelectSales ? handleSelectSales : undefined}
                />
              </>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default SubtypeVillageStatsModal
