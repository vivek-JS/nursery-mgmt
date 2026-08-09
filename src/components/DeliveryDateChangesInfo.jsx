import React, { useState } from "react"
import { Info } from "lucide-react"
import { Popover, Typography, Box, Chip } from "@mui/material"
import moment from "moment"
import { collectDeliveryDateChanges, hasDeliveryDateChanges } from "utils/deliveryDateChanges"

const DATETIME_FORMAT = "D-MMMM YYYY HH:mm"

export function DeliveryDateChangesInfo({
  order,
  dateFormat,
  datetimeFormat = DATETIME_FORMAT,
  className = "",
}) {
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)

  if (!hasDeliveryDateChanges(order, dateFormat)) return null

  const changes = collectDeliveryDateChanges(order, dateFormat)

  const handleClick = (e) => {
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }

  const handleClose = (e) => {
    e?.stopPropagation?.()
    setAnchorEl(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="View delivery date change history"
        aria-label="View delivery date change history"
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-amber-700 hover:bg-amber-100 hover:text-amber-900 ${className}`}>
        <Info className="h-3 w-3" aria-hidden />
      </button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: { maxWidth: 320, p: 1.5 },
            onClick: (e) => e.stopPropagation(),
          },
        }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
          Delivery date changes ({changes.length})
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 280, overflowY: "auto" }}>
          {changes.map((change, index) => (
            <Box
              key={`${change.source}-${index}`}
              sx={{
                p: 1,
                borderRadius: 1,
                border: "1px solid",
                borderColor: change.automatic ? "warning.light" : "divider",
                bgcolor: change.automatic ? "warning.50" : "grey.50",
              }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5, mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {change.automatic ? "Auto" : "Manual"}
                </Typography>
                {change.automatic && (
                  <Chip label="Automatic" size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: "9px" }} />
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                <Typography variant="caption" sx={{ color: "error.main", textDecoration: "line-through" }}>
                  {change.previous || "—"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  →
                </Typography>
                <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 600 }}>
                  {change.next || "—"}
                </Typography>
              </Box>
              {change.reason && (
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
                  {change.reason}
                </Typography>
              )}
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5, gap: 1 }}>
                {change.changedAt && (
                  <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px" }}>
                    {moment(change.changedAt).format(datetimeFormat)}
                  </Typography>
                )}
                {change.changedBy && (
                  <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px" }}>
                    {change.changedBy}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  )
}

export default DeliveryDateChangesInfo
