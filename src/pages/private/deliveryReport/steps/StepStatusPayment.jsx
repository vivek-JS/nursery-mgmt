import React from "react"
import { Alert, Box, Button, Chip, Typography } from "@mui/material"
import { STATUS_OPTIONS, YET_TO_DISPATCH_STATUSES } from "../deliveryReportConstants"

export default function StepStatusPayment({ statuses, onStatusesChange }) {
  const toggleStatus = (id) => {
    const set = new Set(statuses || [])
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onStatusesChange([...set])
  }

  const applyYetToDispatch = () => onStatusesChange([...YET_TO_DISPATCH_STATUSES])

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Order status
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Default: Accepted only. Toggle अधिक status किंवा yet-to-dispatch preset.
      </Typography>

      {!statuses?.length ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          किमान एक status निवडा.
        </Alert>
      ) : null}

      <Button size="small" variant="outlined" onClick={applyYetToDispatch} sx={{ mb: 2 }}>
        Yet to dispatch (preset)
      </Button>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Order status
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
        {STATUS_OPTIONS.map((opt) => {
          const active = (statuses || []).includes(opt.id)
          return (
            <Chip
              key={opt.id}
              label={opt.label}
              onClick={() => toggleStatus(opt.id)}
              color={active ? "primary" : "default"}
              variant={active ? "filled" : "outlined"}
            />
          )
        })}
      </Box>
    </Box>
  )
}
