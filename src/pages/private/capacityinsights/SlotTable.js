import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip
} from "@mui/material"
import { format } from "date-fns"

/**
 * Table displaying slot-wise capacity information
 *
 * @param {Object} props - Component props
 * @param {Array} props.slots - Array of slot data to display
 * @returns {JSX.Element} Slot table component
 */
const SlotTable = ({ slots }) => {
  // Format date from DD-MM-YYYY to readable format
  const formatSlotDate = (dateString) => {
    if (!dateString) return ""
    const [day, month, year] = dateString.split("-")
    return format(new Date(`${year}-${month}-${day}`), "dd MMM yyyy")
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: "grey.50" }}>
          <TableRow>
            <TableCell>Slot Period</TableCell>
            <TableCell align="right">Capacity</TableCell>
            <TableCell align="right">Farm Ready</TableCell>
            <TableCell align="right">Utilization</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {slots.map((slot) => (
            <TableRow
              key={slot.slotKey}
              sx={{
                "&:last-child td, &:last-child th": { border: 0 },
                bgcolor: slot.status === "OVER_CAPACITY" ? "error.lightest" : "inherit"
              }}>
              <TableCell component="th" scope="row">
                {formatSlotDate(slot.startDay)} - {formatSlotDate(slot.endDay)}
              </TableCell>
              <TableCell align="right">{slot.totalCapacity.toLocaleString()}</TableCell>
              <TableCell align="right">
                <Typography
                  fontWeight={slot.status === "OVER_CAPACITY" ? "bold" : "regular"}
                  color={slot.status === "OVER_CAPACITY" ? "error.main" : "inherit"}>
                  {slot.farmReadyPlants.toLocaleString()}
                </Typography>
              </TableCell>
              <TableCell align="right">{slot.capacityUtilization}</TableCell>
              <TableCell>
                <Chip
                  label={slot.status === "UNDER_CAPACITY" ? "Under Capacity" : "Over Capacity"}
                  size="small"
                  color={slot.status === "UNDER_CAPACITY" ? "success" : "error"}
                />
              </TableCell>
            </TableRow>
          ))}

          {slots.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No slot data available
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default SlotTable
