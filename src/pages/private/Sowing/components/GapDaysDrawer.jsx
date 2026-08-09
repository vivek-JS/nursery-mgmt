import React from "react"
import {
  Box,
  Drawer,
  Typography,
  Stack,
  Chip,
  IconButton,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import { fmt } from "./sowingPackingUtils"

/**
 * Date-wise GAP breakdown: overdue / today / upcoming sow windows.
 */
export default function GapDaysDrawer({ open, onClose, card }) {
  const slots = Array.isArray(card?.slots) ? card.slots : []
  const due = slots.filter((s) => Number(s.daysUntilSow) < 0)
  const today = slots.filter((s) => Number(s.daysUntilSow) === 0)
  const upcoming = slots.filter((s) => Number(s.daysUntilSow) > 0)
  const dueGap =
    Number(card?.dueGap) ||
    due.reduce((s, r) => s + (Number(r.plantsToSowWithBuffer) || 0), 0)
  const todayGap =
    Number(card?.todayGap) ||
    today.reduce((s, r) => s + (Number(r.plantsToSowWithBuffer) || 0), 0)
  const upcomingGap =
    Number(card?.upcomingGap) ||
    upcoming.reduce((s, r) => s + (Number(r.plantsToSowWithBuffer) || 0), 0)
  const total =
    Number(card?.totalPlantsToSowWithBuffer) ||
    Number(card?.totalGap) ||
    dueGap + todayGap + upcomingGap

  const renderTable = (rows, emptyLabel) => {
    if (!rows.length) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {emptyLabel}
        </Typography>
      )
    }
    return (
      <Box sx={{ overflowX: "auto", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 800 }}>Delivery slot</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Days
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Orders
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Booked
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Sowed
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Gap
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={String(r.slotId || r._id || r.startDay)}>
                <TableCell>
                  <Typography fontWeight={700} fontSize="0.8rem">
                    {r.startDay || "—"}
                    {r.endDay && r.endDay !== r.startDay ? ` → ${r.endDay}` : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.month || ""} {r.year || ""}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={
                      Number(r.daysUntilSow) < 0
                        ? `${Math.abs(Number(r.daysUntilSow))}d overdue`
                        : Number(r.daysUntilSow) === 0
                          ? "today"
                          : `+${Number(r.daysUntilSow)}d`
                    }
                    sx={{
                      height: 22,
                      fontWeight: 800,
                      fontSize: "0.65rem",
                      bgcolor:
                        Number(r.daysUntilSow) < 0
                          ? "#fee2e2"
                          : Number(r.daysUntilSow) === 0
                            ? "#dbeafe"
                            : "#dcfce7",
                      color:
                        Number(r.daysUntilSow) < 0
                          ? "#991b1b"
                          : Number(r.daysUntilSow) === 0
                            ? "#1d4ed8"
                            : "#166534",
                    }}
                  />
                </TableCell>
                <TableCell align="right">{fmt(r.orderCount || 0)}</TableCell>
                <TableCell align="right">{fmt(r.bookedPlants || 0)}</TableCell>
                <TableCell align="right">{fmt(r.sowedPlants || 0)}</TableCell>
                <TableCell align="right">
                  <Typography fontWeight={900} fontSize="0.85rem">
                    {fmt(r.plantsToSowWithBuffer || r.rawGap || 0)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    )
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 480 }, p: 0 } }}
    >
      <Box sx={{ p: 2, borderBottom: "1px solid #e2e8f0" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography fontWeight={900}>
              {card?.plantName || "Plant"} · {card?.subtypeName || "Subtype"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gap = order plants still to sow (unsown only) · overdue / today /
              upcoming
              {card?.sowingBuffer ? ` · +${card.sowingBuffer}% buffer` : ""}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={`Total ${fmt(total)}`}
            sx={{ fontWeight: 800, bgcolor: "#ffedd5", color: "#9a3412" }}
          />
          <Chip
            size="small"
            label={`Overdue ${fmt(dueGap)}`}
            sx={{ fontWeight: 800, bgcolor: "#fee2e2", color: "#991b1b" }}
          />
          <Chip
            size="small"
            label={`Today ${fmt(todayGap)}`}
            sx={{ fontWeight: 800, bgcolor: "#dbeafe", color: "#1d4ed8" }}
          />
          {upcomingGap > 0 && (
            <Chip
              size="small"
              label={`Upcoming ${fmt(upcomingGap)}`}
              sx={{ fontWeight: 800, bgcolor: "#dcfce7", color: "#166534" }}
            />
          )}
          <Chip
            size="small"
            label={`${card?.orderCount || 0} orders`}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </Box>

      <Box sx={{ p: 2, overflowY: "auto" }}>
        <Typography fontWeight={900} color="#991b1b" mb={1}>
          Overdue sowing ({due.length} days)
        </Typography>
        {renderTable(due, "No overdue sow windows.")}

        <Divider sx={{ my: 2 }} />

        <Typography fontWeight={900} color="#1d4ed8" mb={1}>
          On-time / today ({today.length} days)
        </Typography>
        {renderTable(today, "No today sow windows.")}

        {upcoming.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography fontWeight={900} color="#166534" mb={1}>
              Upcoming sow-by ({upcoming.length} days)
            </Typography>
            {renderTable(upcoming, "No upcoming sow windows.")}
          </>
        )}
      </Box>
    </Drawer>
  )
}
