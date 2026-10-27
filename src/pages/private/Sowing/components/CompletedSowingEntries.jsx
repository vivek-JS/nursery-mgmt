import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Popover,
  Divider,
  Autocomplete,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import RefreshIcon from "@mui/icons-material/Refresh"
import { NetworkManager, API } from "network/core"
import SowBatchDestroyDialog from "./SowBatchDestroyDialog"
import SowEntryCoverOrders from "./SowEntryCoverOrders"
import SowingEntryDetailDrawer from "./SowingEntryDetailDrawer"
import SowingEntryChangeLogDrawer from "./SowingEntryChangeLogDrawer"
import CompletedSowingEntriesGrid from "./CompletedSowingEntriesGrid"
import EditSowEntryDialog from "./EditSowEntryDialog"
import { printCompletionPdf } from "./sowingEntryPrint"
import {
  excessOf,
  expectedReadyOf,
  fmtPkt,
  mortalityOf,
  readyDateOf,
  sowDayKey,
  traysOf,
} from "./sowingEntryMeta"

const PAGE_SIZE = 40

function sortValue(row, key) {
  if (key === "orders") return row.linkedOrders?.length || 0
  if (key === "slot") return row.affectedSlot?.label || ""
  if (key === "batch") return row.batchNumber || ""
  if (key === "status") return `${row.requestCompleted ? 1 : 0} ${row.requestNumber || ""}`
  if (key === "labour") return (Number(row.laboursLadies) || 0) + (Number(row.laboursGents) || 0)
  if (key === "plants") return Number(row.sowedQuantity) || 0
  if (key === "expectedReady") return expectedReadyOf(row) ?? -1
  if (key === "excess") return excessOf(row)
  if (key === "cover") return row.linkedOrders?.length || 0
  if (key === "trays") return traysOf(row)
  if (key === "mortality") return mortalityOf(row) ?? -1
  if (key === "packets") return Number(row.packetsUsed) || 0
  if (key === "sowDate") return sowDayKey(row.sowingDate || row.sowingCompletedDate)
  if (key === "readyDate") return sowDayKey(readyDateOf(row))
  if (key === "added") return new Date(row.createdAt || 0).getTime()
  if (key === "addedBy") return row.addedByName || row.completedBy?.name || ""
  if (key === "plant") return `${row.plantName || ""} ${row.subtypeName || ""}`
  return ""
}

export default function CompletedSowingEntries({ refreshToken = 0 }) {
  const [q, setQ] = useState("")
  const [qDebounced, setQDebounced] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState("sowDate")
  const [sortDir, setSortDir] = useState("desc")
  const [sowFrom, setSowFrom] = useState("")
  const [sowTo, setSowTo] = useState("")
  const [addedFrom, setAddedFrom] = useState("")
  const [addedTo, setAddedTo] = useState("")
  const [plants, setPlants] = useState([])
  const [plantId, setPlantId] = useState("")
  const [subtypeId, setSubtypeId] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [detail, setDetail] = useState(null)
  const [coverPop, setCoverPop] = useState(null)
  const [destroyBatch, setDestroyBatch] = useState(null)
  const [changeLogRow, setChangeLogRow] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [slotPop, setSlotPop] = useState({ anchor: null, slot: null, row: null })
  const scrollRef = useRef(null)
  const sentinelRef = useRef(null)
  const requestSeq = useRef(0)
  const busyRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 350)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    let alive = true
    NetworkManager(API.plantCms.GET_PLANTS)
      .request()
      .then((res) => {
        const body = res?.data
        const list = body?.data || (Array.isArray(body) ? body : [])
        if (!alive || !Array.isArray(list)) return
        setPlants(
          [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
        )
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const selectedPlant = useMemo(
    () => plants.find((p) => String(p._id) === String(plantId)) || null,
    [plants, plantId]
  )
  const subtypes = useMemo(
    () =>
      [...(selectedPlant?.subtypes || [])].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      ),
    [selectedPlant]
  )
  const selectedSubtype = subtypes.find((s) => String(s._id) === String(subtypeId)) || null

  const openSlotPop = (e, row) => {
    e.stopPropagation()
    if (!row?.affectedSlot) return
    setSlotPop({ anchor: e.currentTarget, slot: row.affectedSlot, row })
  }
  const closeSlotPop = () => setSlotPop({ anchor: null, slot: null, row: null })

  const load = useCallback(
    async (nextPage, replace) => {
      if (!replace && busyRef.current) return
      const seq = ++requestSeq.current
      busyRef.current = true
      if (replace) {
        setLoading(true)
        setItems([])
      } else {
        setLoadingMore(true)
      }
      setError("")
      try {
        const instance = NetworkManager(API.sowing.GET_SOWING_COMPLETIONS)
        const res = await instance.request(
          {},
          {
            view: "entries",
            page: nextPage,
            limit: PAGE_SIZE,
            sort: sortKey,
            dir: sortDir,
            ...(qDebounced ? { q: qDebounced } : {}),
            ...(sowFrom ? { sowFrom } : {}),
            ...(sowTo ? { sowTo } : {}),
            ...(addedFrom ? { addedFrom } : {}),
            ...(addedTo ? { addedTo } : {}),
            ...(plantId ? { plantId } : {}),
            ...(plantId && subtypeId ? { subtypeId } : {}),
          }
        )
        if (seq !== requestSeq.current) return
        const body = res?.data
        if (body?.success) {
          const next = body.items || []
          setItems((prev) => (replace ? next : [...prev, ...next]))
          setTotal(body.total || 0)
          setPage(nextPage)
        } else if (replace) {
          setItems([])
          setTotal(0)
          setError(body?.message || "Failed to load")
        } else {
          setError(body?.message || "Failed to load more")
        }
      } catch (e) {
        if (seq !== requestSeq.current) return
        if (replace) {
          setItems([])
          setTotal(0)
        }
        setError(e?.message || "Failed to load completions")
      } finally {
        if (seq === requestSeq.current) {
          busyRef.current = false
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [qDebounced, sortKey, sortDir, sowFrom, sowTo, addedFrom, addedTo, plantId, subtypeId]
  )

  useEffect(() => {
    load(1, true)
  }, [load, refreshToken])

  const hasMore = items.length < total

  useEffect(() => {
    const root = scrollRef.current
    const target = sentinelRef.current
    if (!root || !target || !hasMore) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && !loadingMore) {
          load(page + 1, false)
        }
      },
      { root, rootMargin: "160px" }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, page, load])

  const rows = useMemo(() => {
    const pageOnly =
      sortKey === "orders" ||
      sortKey === "slot" ||
      sortKey === "batch" ||
      sortKey === "status" ||
      sortKey === "addedBy" ||
      sortKey === "excess" ||
      sortKey === "expectedReady" ||
      sortKey === "cover" ||
      sortKey === "readyDate"
    if (!pageOnly) return items
    const dir = sortDir === "asc" ? 1 : -1
    return [...items].sort((a, b) => {
      const va = sortValue(a, sortKey)
      const vb = sortValue(b, sortKey)
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [items, sortKey, sortDir])

  const toggleSort = (id) => {
    if (sortKey === id) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(id)
      setSortDir(
        id === "plant" || id === "slot" || id === "batch" || id === "status" || id === "addedBy"
          ? "asc"
          : "desc"
      )
    }
  }

  return (
    <Box
      sx={{
        mb: 3,
        borderRadius: 3,
        border: "1px solid #bfdbfe",
        overflow: "hidden",
        bgcolor: "#fff",
        boxShadow: "0 8px 24px rgba(37,99,235,0.08)",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: "linear-gradient(120deg, #1d4ed8 0%, #2563eb 60%, #0ea5e9 120%)",
          color: "#fff",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={1}
        >
          <Box>
            <Typography fontWeight={900}>Sowing entries</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Click a row for the rest · dates are IST
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder="Order / request / farmer…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{
                minWidth: 220,
                bgcolor: "rgba(255,255,255,0.95)",
                borderRadius: 1.5,
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton onClick={() => load(1, true)} sx={{ color: "#fff" }} size="small">
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
          <TextField
            size="small"
            type="date"
            label="Sow from"
            value={sowFrom}
            onChange={(e) => setSowFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            type="date"
            label="Sow to"
            value={sowTo}
            onChange={(e) => setSowTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            type="date"
            label="Added from"
            value={addedFrom}
            onChange={(e) => setAddedFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            type="date"
            label="Added to"
            value={addedTo}
            onChange={(e) => setAddedTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <Autocomplete
            size="small"
            options={plants}
            value={selectedPlant}
            onChange={(_, p) => {
              setPlantId(p?._id || "")
              setSubtypeId("")
            }}
            getOptionLabel={(p) => p?.name || ""}
            isOptionEqualToValue={(a, b) => String(a._id) === String(b._id)}
            renderInput={(params) => <TextField {...params} label="Plant" />}
            sx={{ width: 190 }}
          />
          <Autocomplete
            size="small"
            options={subtypes}
            value={selectedSubtype}
            onChange={(_, s) => setSubtypeId(s?._id || "")}
            getOptionLabel={(s) => s?.name || ""}
            isOptionEqualToValue={(a, b) => String(a._id) === String(b._id)}
            disabled={!selectedPlant}
            renderInput={(params) => (
              <TextField {...params} label="Subtype" placeholder={selectedPlant ? "All" : "Pick plant"} />
            )}
            sx={{ width: 190 }}
          />
          <Button
            size="small"
            onClick={() => {
              setSowFrom("")
              setSowTo("")
              setAddedFrom("")
              setAddedTo("")
              setPlantId("")
              setSubtypeId("")
            }}
            sx={{ textTransform: "none" }}
          >
            Clear filters
          </Button>
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : items.length === 0 ? (
          <Alert severity="info">No sowing entries yet.</Alert>
        ) : (
          <CompletedSowingEntriesGrid
            scrollRef={scrollRef}
            sentinelRef={sentinelRef}
            rows={rows}
            itemsLength={items.length}
            total={total}
            hasMore={hasMore}
            loadingMore={loadingMore}
            sortKey={sortKey}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            onOpenDetail={setDetail}
            onOpenCover={setCoverPop}
            onOpenLog={setChangeLogRow}
            onEdit={setEditRow}
            onMortalityDone={() => load(1, true)}
          />
        )}
      </Box>

      <Popover
        open={Boolean(slotPop.anchor)}
        anchorEl={slotPop.anchor}
        onClose={closeSlotPop}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              p: 1.5,
              width: 280,
              borderRadius: 2,
              border: "1px solid #bfdbfe",
            },
          },
        }}
      >
        {slotPop.slot && (
          <Box>
            <Typography fontWeight={800} fontSize="0.9rem" mb={0.5}>
              Slot details
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {slotPop.row?.requestNumber} · {slotPop.row?.plantName} ·{" "}
              {slotPop.row?.subtypeName}
            </Typography>
            <Stack spacing={0.5} sx={{ fontSize: "0.8rem" }}>
              <Box>
                <strong>Range:</strong> {slotPop.slot.label}
              </Box>
              <Box>
                <strong>Sow date:</strong> {slotPop.slot.sowingDate || "—"}
              </Box>
              <Box>
                <strong>Ready date:</strong> {slotPop.slot.plantReadyDate || "—"}
                {slotPop.slot.plantReadyDays != null
                  ? ` (+${slotPop.slot.plantReadyDays}d)`
                  : ""}
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <Box>
                <strong>This sow:</strong>{" "}
                {slotPop.slot.batchPlantsSowed || slotPop.row?.sowedQuantity || 0}{" "}
                plants
                {slotPop.slot.batchPacketsUsed
                  ? ` · ${fmtPkt(slotPop.slot.batchPacketsUsed)} pkt`
                  : ""}
              </Box>
              <Box>
                <strong>Slot sowed:</strong>{" "}
                {(Number(slotPop.slot.primarySowed) || 0) +
                  (Number(slotPop.slot.officeSowed) || 0)}
              </Box>
              <Box>
                <strong>Available (sale):</strong> {slotPop.slot.availablePlants ?? 0}
                {" · "}
                <strong>Reserved:</strong> {slotPop.slot.orderReservedPlants ?? 0}
              </Box>
              <Box>
                <strong>Booked:</strong> {slotPop.slot.totalBookedPlants ?? 0}
              </Box>
              {slotPop.slot.excessivePlants > 0 ? (
                <Box>
                  <strong>Excess:</strong> {slotPop.slot.excessivePlants}
                </Box>
              ) : null}
              {slotPop.slot.shedName ? (
                <Box>
                  <strong>Shed:</strong> {slotPop.slot.shedName}
                </Box>
              ) : null}
            </Stack>
          </Box>
        )}
      </Popover>

      {detail ? (
        <SowingEntryDetailDrawer
          detail={detail}
          onClose={() => setDetail(null)}
          onPrint={printCompletionPdf}
          onOpenSlot={openSlotPop}
          onDestroy={setDestroyBatch}
          onEdit={setEditRow}
          onMortalityDone={() => {
            setDetail(null)
            load(1, true)
          }}
          onOpenLog={(row) => setChangeLogRow(row)}
        />
      ) : null}
      <EditSowEntryDialog
        open={Boolean(editRow)}
        row={editRow}
        onClose={() => setEditRow(null)}
        onDone={() => {
          setEditRow(null)
          setDetail(null)
          load(1, true)
        }}
      />
      <SowingEntryChangeLogDrawer row={changeLogRow} onClose={() => setChangeLogRow(null)} />
      <SowEntryCoverOrders
        anchor={coverPop?.anchor}
        title={coverPop?.title}
        orders={coverPop?.orders || []}
        onClose={() => setCoverPop(null)}
      />
      <SowBatchDestroyDialog
        batch={destroyBatch}
        open={Boolean(destroyBatch)}
        onClose={() => setDestroyBatch(null)}
        onDone={() => {
          setDetail(null)
          load(1, true)
        }}
      />
    </Box>
  )
}
