import React from "react"
import { Box, Button, Paper, Step, StepLabel, Stepper, Typography } from "@mui/material"
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import StepPlant from "./steps/StepPlant"
import StepSubtype from "./steps/StepSubtype"
import StepDateRange from "./steps/StepDateRange"
import StepCohorts from "./steps/StepCohorts"
import StepStatusPayment from "./steps/StepStatusPayment"
import StepAdvanceOnly from "./steps/StepAdvanceOnly"
import { STEP_LABELS, isValidMongoId } from "./deliveryReportConstants"

export default function DeliveryReportStepper({
  step,
  filters,
  plants,
  plantsLoading,
  subtypes,
  subtypesLoading,
  onStepChange,
  onFiltersChange,
  onRunReport,
  running,
}) {
  const set = (patch) => onFiltersChange({ ...filters, ...patch })

  const canNext = () => {
    if (step === 0) return isValidMongoId(filters.plantId)
    if (step === 2) return Boolean(filters.startDate && filters.endDate)
    if (step === 3) return (filters.cohorts || []).length > 0
    if (step === 4) return (filters.statuses || []).length > 0
    if (step === 5) return (filters.advancePayment || []).length > 0
    return true
  }

  const next = () => {
    if (step < STEP_LABELS.length - 1) onStepChange(step + 1)
    else onRunReport()
  }

  const prev = () => {
    if (step > 0) onStepChange(step - 1)
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Delivery Report
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Step-by-step filter — plant, date, delivery type, status, advance orders.
      </Typography>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {STEP_LABELS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ minHeight: 280, mb: 3 }}>
        {step === 0 ? (
          <StepPlant
            plants={plants}
            loading={plantsLoading}
            selectedId={filters.plantId}
            onSelect={(id, name) => set({ plantId: id, plantName: name, subtypeId: "", subtypeName: "" })}
          />
        ) : null}
        {step === 1 ? (
          <StepSubtype
            plantName={filters.plantName}
            subtypes={subtypes}
            loading={subtypesLoading}
            selectedId={filters.subtypeId}
            onSelect={(id, name) => set({ subtypeId: id, subtypeName: name })}
            onSkip={() => set({ subtypeId: "", subtypeName: "" })}
          />
        ) : null}
        {step === 2 ? (
          <StepDateRange
            startDate={filters.startDate}
            endDate={filters.endDate}
            includePastDueBeyondRange={filters.includePastDueBeyondRange}
            onStartChange={(v) => set({ startDate: v })}
            onEndChange={(v) => set({ endDate: v })}
            onBacklogToggle={(v) => set({ includePastDueBeyondRange: v })}
          />
        ) : null}
        {step === 3 ? (
          <StepCohorts
            cohorts={filters.cohorts}
            onToggle={(cohorts) => set({ cohorts })}
          />
        ) : null}
        {step === 4 ? (
          <StepStatusPayment
            statuses={filters.statuses}
            onStatusesChange={(statuses) => set({ statuses })}
          />
        ) : null}
        {step === 5 ? (
          <StepAdvanceOnly
            advancePayment={filters.advancePayment}
            onAdvanceChange={(advancePayment) => set({ advancePayment })}
          />
        ) : null}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button
          startIcon={<ChevronLeftIcon />}
          disabled={step === 0}
          onClick={prev}
        >
          Back
        </Button>
        <Button
          variant="contained"
          endIcon={step < STEP_LABELS.length - 1 ? <ChevronRightIcon /> : null}
          disabled={!canNext() || running}
          onClick={next}
        >
          {step < STEP_LABELS.length - 1 ? "Next" : running ? "Loading…" : "View report"}
        </Button>
      </Box>
    </Paper>
  )
}
