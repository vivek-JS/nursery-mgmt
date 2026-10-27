import React from "react"
import {
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material"
import AccessTimeIcon from "@mui/icons-material/AccessTime"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import SowBatchMortalityButton from "./SowBatchMortalityButton"
import { SowEntryCoverCell } from "./SowEntryCoverOrders"
import {
  addedByOf,
  coverOf,
  excessOf,
  expectedReadyOf,
  fmtAdded,
  fmtDate,
  fmtDay,
  fmtNum,
  fmtTime,
  mortalityOf,
  readyDateOf,
  reserveOf,
} from "./sowingEntryMeta"

export const COLUMNS = [
  { id: "plant", label: "Plant", align: "left" },
  { id: "added", label: "Date added", align: "left" },
  { id: "sowDate", label: "Sow date", align: "left" },
  { id: "readyDate", label: "Ready date", align: "left" },
  { id: "plants", label: "Sowed", align: "right" },
  { id: "expectedReady", label: "Exp. ready", align: "right", title: "Sowed − mortality" },
  { id: "cover", label: "Cover", align: "right" },
  { id: "excess", label: "Excess", align: "right", title: "Sowed − mortality − cover" },
  { id: "mortality", label: "Exp. mortality", align: "right" },
  { id: "addedBy", label: "Added by", align: "left" },
]

const gridCell = {
  borderRight: "1px solid #d1fae5",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 12.5,
  py: 0.85,
  px: 1.15,
  whiteSpace: "nowrap",
  color: "#134e4a",
}

const COL_TINT = {
  sowDate: "#ecfdf5",
  readyDate: "#f0fdf4",
  added: "#eff6ff",
  addedBy: "#f5f3ff",
  plants: "#fffbeb",
  expectedReady: "#eef2ff",
  cover: "#ecfdf5",
  excess: "#fff7ed",
  mortality: "#fff1f2",
}

const headCell = {
  ...gridCell,
  fontWeight: 800,
  letterSpacing: 0.2,
  color: "#ecfeff",
  bgcolor: "#0f766e",
  borderBottom: "2px solid #115e59",
  borderRight: "1px solid rgba(255,255,255,0.12)",
  position: "sticky",
  top: 0,
  zIndex: 2,
  "& .MuiTableSortLabel-root": { color: "#ecfeff" },
  "& .MuiTableSortLabel-root.Mui-active": { color: "#fff" },
  "& .MuiTableSortLabel-icon": { color: "#99f6e4 !important" },
}

export default function CompletedSowingEntriesGrid({
  scrollRef,
  sentinelRef,
  rows,
  itemsLength,
  total,
  hasMore,
  loadingMore,
  sortKey,
  sortDir,
  onToggleSort,
  onOpenDetail,
  onOpenCover,
  onOpenLog,
  onEdit,
  onMortalityDone,
}) {
  return (
    <TableContainer
      ref={scrollRef}
      sx={{
        maxHeight: "68vh",
        borderRadius: 2,
        border: "1px solid #99f6e4",
        boxShadow: "inset 0 0 0 1px rgba(15,118,110,0.06)",
        background: "linear-gradient(180deg, #f0fdfa 0%, #ffffff 80px)",
      }}
    >
      <Table size="small" stickyHeader sx={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <TableHead>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableCell
                key={col.id}
                align={col.align}
                title={col.title || undefined}
                sortDirection={sortKey === col.id ? sortDir : false}
                sx={headCell}
              >
                <TableSortLabel
                  active={sortKey === col.id}
                  direction={sortKey === col.id ? sortDir : "asc"}
                  onClick={() => onToggleSort(col.id)}
                >
                  {col.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell align="center" sx={{ ...headCell, width: 96 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => {
            const readyQty = expectedReadyOf(row)
            return (
            <TableRow
              key={row._id || row.requestNumber}
              hover
              sx={{
                cursor: "pointer",
                bgcolor: idx % 2 === 0 ? "#ffffff" : "#f0fdfa",
                transition: "background 0.15s ease",
                "&:hover": { bgcolor: "#ccfbf1" },
              }}
              onClick={() => onOpenDetail(row)}
            >
              <TableCell sx={{ ...gridCell, bgcolor: idx % 2 === 0 ? "#fff" : "#f7fee7", fontWeight: 800 }}>
                {row.plantName}
                <Typography component="span" sx={{ color: "#64748b", fontWeight: 600 }}>
                  {" "}
                  · {row.subtypeName}
                </Typography>
                {row.isIrrelevant || row.affectedSlot?.isIrrelevant ? (
                  <Typography component="span" sx={{ ml: 0.75, color: "#be123c", fontSize: 11, fontWeight: 800 }}>
                    Old
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell sx={{ ...gridCell, bgcolor: COL_TINT.added, whiteSpace: "normal", minWidth: 118 }}>
                <Typography fontSize="0.8rem" fontWeight={800} color="#1d4ed8" lineHeight={1.2}>
                  {fmtAdded(row.createdAt)}
                </Typography>
                <Typography fontSize="0.7rem" fontWeight={700} color="#64748b" lineHeight={1.3}>
                  {fmtTime(row.createdAt) || "—"}
                </Typography>
              </TableCell>
              <TableCell sx={{ ...gridCell, bgcolor: COL_TINT.sowDate, fontWeight: 800, color: "#047857" }}>
                {fmtDay(row.sowingDate || row.sowingCompletedDate)}
              </TableCell>
              <TableCell sx={{ ...gridCell, bgcolor: COL_TINT.readyDate, fontWeight: 800, color: "#166534" }}>
                {fmtDay(readyDateOf(row))}
              </TableCell>
              <TableCell sx={{ ...gridCell, bgcolor: COL_TINT.plants, fontWeight: 900, color: "#b45309" }} align="right">
                {row.sowedQuantity ?? "—"}
              </TableCell>
              <TableCell
                sx={{
                  ...gridCell,
                  bgcolor: COL_TINT.expectedReady,
                  fontWeight: 900,
                  color: readyQty != null ? "#3730a3" : "#94a3b8",
                  fontVariantNumeric: "tabular-nums",
                }}
                align="right"
                title="Sowed − mortality"
              >
                {readyQty == null ? "—" : fmtNum(readyQty)}
              </TableCell>
              <TableCell
                sx={{
                  ...gridCell,
                  bgcolor: COL_TINT.cover,
                  whiteSpace: "normal",
                  cursor: (row.linkedOrders || []).length ? "pointer" : "default",
                }}
                align="right"
                onClick={(e) => {
                  e.stopPropagation()
                  const orders = row.linkedOrders || []
                  if (!orders.length) return
                  onOpenCover({ anchor: e.currentTarget, orders, title: row.requestNumber || "" })
                }}
              >
                <SowEntryCoverCell
                  orders={row.linkedOrders || []}
                  coverPlants={coverOf(row)}
                />
              </TableCell>
              <TableCell
                sx={{
                  ...gridCell,
                  bgcolor: COL_TINT.excess,
                  fontWeight: 900,
                  color: excessOf(row) > 0 ? "#c2410c" : "#94a3b8",
                }}
                align="right"
              >
                {excessOf(row) > 0 ? fmtNum(excessOf(row)) : "—"}
              </TableCell>
              <TableCell
                sx={{ ...gridCell, bgcolor: COL_TINT.mortality, fontWeight: 800, color: "#be123c", fontVariantNumeric: "tabular-nums" }}
                align="right"
              >
                {mortalityOf(row) == null ? "—" : fmtNum(mortalityOf(row))}
              </TableCell>
              <TableCell sx={{ ...gridCell, bgcolor: COL_TINT.addedBy, whiteSpace: "normal", minWidth: 128 }}>
                <Typography fontSize="0.8rem" fontWeight={800} color="#5b21b6" lineHeight={1.2}>
                  {addedByOf(row) || "—"}
                </Typography>
                <Typography fontSize="0.7rem" fontWeight={700} color="#64748b" lineHeight={1.3}>
                  {fmtDate(row.createdAt)}
                </Typography>
              </TableCell>
              <TableCell sx={{ ...gridCell, px: 0.25 }} align="center" onClick={(e) => e.stopPropagation()}>
                <Stack direction="row" spacing={0} justifyContent="center" alignItems="center">
                  <Tooltip title="Edit entry">
                    <IconButton
                      size="small"
                      onClick={() => onEdit?.(row)}
                      sx={{ p: 0.25, color: "#0f766e" }}
                      aria-label="Edit entry"
                    >
                      <EditOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Change log">
                    <IconButton
                      size="small"
                      onClick={() => onOpenLog(row)}
                      sx={{ p: 0.25, color: "#0f766e" }}
                      aria-label="Change log"
                    >
                      <AccessTimeIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <SowBatchMortalityButton
                    slotId={row.affectedSlot?.slotId}
                    batchId={row.affectedSlot?.batchId}
                    mortality={reserveOf(row)}
                    released={Boolean(row.affectedSlot?.noMortalityReserve)}
                    irrelevant={Boolean(row.isIrrelevant || row.affectedSlot?.isIrrelevant)}
                    onDone={onMortalityDone}
                  />
                </Stack>
              </TableCell>
            </TableRow>
            )
          })}
          <TableRow ref={sentinelRef}>
            <TableCell colSpan={COLUMNS.length + 1} sx={{ border: 0, py: 1.5, textAlign: "center", bgcolor: "#f8fffc" }}>
              {loadingMore ? (
                <CircularProgress size={22} sx={{ color: "#0f766e" }} />
              ) : hasMore ? (
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Scroll for more · {itemsLength} of {total}
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: "#0f766e", fontWeight: 800 }}>
                  {total} entries
                </Typography>
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}
