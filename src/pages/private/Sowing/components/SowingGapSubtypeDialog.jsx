import React, { useMemo, useState } from "react"
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import { ExpandLess, ExpandMore, OpenInNew } from "@mui/icons-material"
import { Link as RouterLink } from "react-router-dom"
import { groupSlotsByMonth } from "./sowingGapMonthRollup"

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN")

function ExcessGapCells({ gap, excess }) {
  return (
    <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
      <Box sx={{ minWidth: 88, textAlign: "right" }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>Excess</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: excess > 0 ? "#047857" : "#94a3b8" }}>
          {excess > 0 ? fmt(excess) : "—"}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 88, textAlign: "right" }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>Gap</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: gap > 0 ? "#c2410c" : "#94a3b8" }}>
          {gap > 0 ? fmt(gap) : "—"}
        </Typography>
      </Box>
    </Box>
  )
}

export default function SowingGapSubtypeDialog({ open, onClose, selection, year }) {
  const months = useMemo(
    () => groupSlotsByMonth(selection?.slots || []),
    [selection?.slots]
  )
  const [openMonths, setOpenMonths] = useState(() => new Set())

  const toggleMonth = (key) => {
    setOpenMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (!selection) return null

  const slotsUrl = `/u/slots/${selection.plantId}/${selection.subtypeId}?year=${year}`

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionProps={{
        onEnter: () => {
          // Auto-expand months that have gap
          setOpenMonths(
            new Set(months.filter((m) => m.gap > 0).map((m) => m.key).slice(0, 3))
          )
        },
      }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="overline" color="text.secondary" display="block">
          {selection.plantName}
        </Typography>
        <Typography variant="h6" fontWeight={800}>
          {selection.subtypeName}
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mt={1}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Plant → Month → Slot
          </Typography>
          <ExcessGapCells gap={selection.gapToCover} excess={selection.excessAvailable} />
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {months.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
            No gap or sowed excess for this subtype right now.
          </Typography>
        ) : (
          <Box>
            {months.map((month) => {
              const isOpen = openMonths.has(month.key)
              return (
                <Box key={month.key} sx={{ borderBottom: "1px solid #e2e8f0" }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    sx={{
                      px: 2,
                      py: 1.25,
                      cursor: "pointer",
                      bgcolor: "#f8fafc",
                      "&:hover": { bgcolor: "#f1f5f9" },
                    }}
                    onClick={() => toggleMonth(month.key)}>
                    <Box flex={1}>
                      <Typography fontWeight={800} fontSize={14}>
                        {month.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {month.slots.length} slot{month.slots.length === 1 ? "" : "s"}
                      </Typography>
                    </Box>
                    <ExcessGapCells gap={month.gap} excess={month.excess} />
                    <IconButton size="small">
                      {isOpen ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>

                  <Collapse in={isOpen}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Slot</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            Excess
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            Gap
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            Booked
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            Sowed
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {month.slots.map((row) => (
                          <TableRow key={row.id} hover>
                            <TableCell>
                              <Typography fontWeight={600} fontSize={13}>
                                {row.label}
                              </Typography>
                              {row.overdue ? (
                                <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 700 }}>
                                  Overdue · sow by {row.sowByDate || "—"}
                                </Typography>
                              ) : row.sowByDate ? (
                                <Typography variant="caption" color="text.secondary">
                                  Sow by {row.sowByDate}
                                </Typography>
                              ) : null}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: row.excess > 0 ? 800 : 400,
                                color: row.excess > 0 ? "#047857" : "text.secondary",
                              }}>
                              {row.excess > 0 ? fmt(row.excess) : "—"}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: row.gap > 0 ? 800 : 400,
                                color: row.gap > 0 ? "#c2410c" : "text.secondary",
                              }}>
                              {row.gap > 0 ? fmt(row.gap) : "—"}
                            </TableCell>
                            <TableCell align="right">{fmt(row.booked)}</TableCell>
                            <TableCell align="right">{fmt(row.sowed)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Collapse>
                </Box>
              )
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button
          component={RouterLink}
          to={slotsUrl}
          variant="contained"
          endIcon={<OpenInNew />}
          sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#0f766e", "&:hover": { bgcolor: "#115e59" } }}
          onClick={onClose}>
          Open slots page
        </Button>
      </DialogActions>
    </Dialog>
  )
}
