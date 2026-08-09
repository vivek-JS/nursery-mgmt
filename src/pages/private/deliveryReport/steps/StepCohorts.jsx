import React from "react"
import { Alert, Box, Chip, Typography } from "@mui/material"
import { COHORT_OPTIONS } from "../deliveryReportConstants"

export default function StepCohorts({ cohorts, onToggle }) {
  const toggle = (id) => {
    const set = new Set(cohorts || [])
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onToggle([...set])
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Delivery प्रकार (multi-select)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Native, rolled-in, किंवा delivery change — एकापेक्षा जास्त निवडा.
      </Typography>

      {!cohorts?.length ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          किमान एक प्रकार निवडा.
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {COHORT_OPTIONS.map((opt) => {
          const active = (cohorts || []).includes(opt.id)
          return (
            <Chip
              key={opt.id}
              label={opt.label}
              onClick={() => toggle(opt.id)}
              color={active ? "primary" : "default"}
              variant={active ? "filled" : "outlined"}
              sx={{ height: "auto", py: 1, "& .MuiChip-label": { whiteSpace: "normal" } }}
              title={opt.hint}
            />
          )
        })}
      </Box>
    </Box>
  )
}
