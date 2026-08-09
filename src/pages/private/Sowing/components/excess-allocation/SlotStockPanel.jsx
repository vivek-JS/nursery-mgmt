import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import SearchIcon from "@mui/icons-material/Search"
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded"
import { NetworkManager, API } from "network/core"
import SlotStockCard from "./SlotStockCard"
import SlotCoverSuggestions from "./SlotCoverSuggestions"
import {
  flattenStockBoardSlots,
  filterSlotRows,
  groupSlotsByPlant,
  buildCoverSuggestions,
  fmtNum,
  COVER_WINDOW_DAYS,
  isSlotEmpty,
} from "./slotStockUtils"

/**
 * All slots with sow / booking / available activity — full card per slot.
 */
export default function SlotStockPanel({
  refreshToken = 0,
  canAssign = false,
  onAssign,
  onOpenDetail,
  onCoverOrder,
  onSlotTransfer,
  onOpenCoverPicker,
  onLoaded,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [plants, setPlants] = useState([])
  const [summary, setSummary] = useState(null)
  const [search, setSearch] = useState("")
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [expandedPlants, setExpandedPlants] = useState(() => new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const instance = NetworkManager(API.sowing.GET_PLANTS_GAP_SUMMARY)
      const res = await instance.request({}, { board: "true", _t: Date.now() })
      if (!res?.data?.success) {
        throw new Error(res?.data?.message || "Failed to load slot board")
      }
      setPlants(res.data.plants || [])
      setSummary(res.data.summary || null)
      const rows = flattenStockBoardSlots(res.data.plants || [])
      onLoaded?.({
        slotCount: rows.length,
        totalAvailable: res.data.summary?.totalAvailableGap,
        totalGap: res.data.summary?.totalBookingGap,
      })
    } catch (e) {
      setError(e?.message || "Failed to load slot board")
      setPlants([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [refreshToken, load])

  const allRows = useMemo(() => flattenStockBoardSlots(plants), [plants])
  const displayRows = useMemo(() => {
    if (!showActiveOnly) return allRows
    return allRows.filter(
      (r) =>
        r.availablePlants > 0 ||
        r.gap > 0 ||
        r.totalBookedPlants > 0 ||
        r.primarySowed > 0
    )
  }, [allRows, showActiveOnly])
  const filteredRows = useMemo(() => filterSlotRows(displayRows, search), [displayRows, search])
  const grouped = useMemo(() => groupSlotsByPlant(filteredRows), [filteredRows])
  const coverSuggestions = useMemo(
    () => buildCoverSuggestions(allRows, COVER_WINDOW_DAYS),
    [allRows]
  )

  useEffect(() => {
    if (grouped.length === 0) return
    setExpandedPlants((prev) => {
      if (prev.size > 0) return prev
      return new Set(grouped.slice(0, 4).map((g) => g.plantId || g.plantName))
    })
  }, [grouped])

  const togglePlant = (key) => {
    setExpandedPlants((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const totalAvailable = summary?.totalAvailableGap ?? allRows.reduce((s, r) => s + r.availablePlants, 0)
  const totalGap = summary?.totalBookingGap ?? allRows.reduce((s, r) => s + r.gap, 0)
  const emptySlotCount = useMemo(() => allRows.filter(isSlotEmpty).length, [allRows])
  const activeSlotCount = Math.max(0, allRows.length - emptySlotCount)

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        spacing={2}
        mb={2}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
            <Inventory2RoundedIcon color="success" />
            <Typography variant="h5" fontWeight={800} color="#166534">
              Slots · stock & orders
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" maxWidth={620}>
            Every slot (including zero sow). Transfer surplus slot-to-slot, assign to pending
            orders, or cover via delivery −{COVER_WINDOW_DAYS}d…0 window. Full cover marks sow
            complete; partial leaves order pending.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
          {canAssign && onOpenCoverPicker && (
            <Button
              variant="outlined"
              color="primary"
              onClick={onOpenCoverPicker}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              Cover order (pick)
            </Button>
          )}
          <IconButton onClick={load} disabled={loading} color="success" aria-label="Refresh">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
        <Chip label={`${fmtNum(totalAvailable)} available`} sx={{ fontWeight: 800, bgcolor: "#dcfce7", color: "#166534" }} />
        <Chip label={`${fmtNum(totalGap)} gap`} sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e" }} />
        <Chip label={`${allRows.length} slots`} variant="outlined" />
        <Chip
          label={`${emptySlotCount} open · ${activeSlotCount} active`}
          variant="outlined"
          sx={{ fontWeight: 700, borderStyle: "dashed" }}
        />
        <Chip
          clickable
          label={showActiveOnly ? "Active only" : "All slots (incl. zero)"}
          onClick={() => setShowActiveOnly((v) => !v)}
          color={showActiveOnly ? "warning" : "default"}
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      {canAssign && coverSuggestions.length > 0 && (
        <SlotCoverSuggestions
          suggestions={coverSuggestions}
          canAct={canAssign}
          onTransfer={onSlotTransfer}
          onAssign={onAssign}
        />
      )}

      <TextField
        size="small"
        fullWidth
        placeholder="Search plant, subtype, or slot date…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 420 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={load}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {loading && !allRows.length ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress color="success" />
        </Box>
      ) : !loading && filteredRows.length === 0 ? (
        <Alert severity="info" icon={<Inventory2RoundedIcon />}>
          {search ? "No slots match your search." : "No slots found for sowing-allowed plants."}
        </Alert>
      ) : (
        <Stack spacing={2}>
          {grouped.map((plantGroup) => {
            const plantKey = plantGroup.plantId || plantGroup.plantName
            const open = expandedPlants.has(plantKey)
            return (
              <Box
                key={plantKey}
                sx={{ border: "1px solid #bbf7d0", borderRadius: 2, bgcolor: "#fff", overflow: "hidden" }}
              >
                <Box
                  onClick={() => togglePlant(plantKey)}
                  sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: "#f0fdf4",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography fontWeight={800}>{plantGroup.plantName}</Typography>
                  <Chip
                    size="small"
                    label={`${fmtNum(plantGroup.totalAvailable)} avail · ${fmtNum(plantGroup.totalGap)} gap · ${plantGroup.subtypes.length} subtype(s)`}
                    sx={{ fontWeight: 700, bgcolor: "#dcfce7", color: "#166534" }}
                  />
                </Box>
                <Collapse in={open}>
                  <Box sx={{ p: 2 }}>
                    {plantGroup.subtypes.map((st) => (
                      <Box key={st.subtypeId || st.subtypeName} mb={2.5}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1.25} flexWrap="wrap" useFlexGap>
                          <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
                            {st.subtypeName}
                          </Typography>
                          <Chip size="small" label={`${st.slots.length} slots`} variant="outlined" />
                          {(st.emptyCount || 0) > 0 && (
                            <Chip
                              size="small"
                              label={`${st.emptyCount} open (0/0/0/0)`}
                              sx={{
                                height: 22,
                                fontWeight: 700,
                                borderStyle: "dashed",
                                color: "#64748b",
                              }}
                            />
                          )}
                        </Stack>
                        <Grid container spacing={1.5}>
                          {st.slots.map((slot) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={slot.slotId}>
                              <SlotStockCard
                                slotId={slot.slotId}
                                slotStartDay={slot.slotStartDay}
                                slotEndDay={slot.slotEndDay}
                                availablePlants={slot.availablePlants}
                                totalBookedPlants={slot.totalBookedPlants}
                                primarySowed={slot.primarySowed}
                                gap={slot.gap}
                                plantName={slot.plantName}
                                subtypeName={slot.subtypeName}
                                plantId={slot.plantId}
                                subtypeId={slot.subtypeId}
                                canAssign={canAssign}
                                refreshKey={refreshToken}
                                onAssign={onAssign}
                                onCoverOrder={onCoverOrder}
                                onSlotTransfer={onSlotTransfer}
                                onOpenDetail={onOpenDetail}
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
