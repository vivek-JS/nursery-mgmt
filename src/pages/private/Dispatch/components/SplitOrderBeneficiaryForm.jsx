import React, { useState, useEffect, useCallback } from "react"
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material"
import { CheckCircle as CheckIcon } from "@mui/icons-material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import useDebounce from "hooks/useDebounce"
import LocationSelector from "components/LocationSelector"
import {
  emptyOrderForEditShape,
  normalizeOrderFor,
  mapFarmerToOrderFor,
  buildOrderForPatchForSplitBeneficiary,
  newFarmerRequiresLocation,
} from "../../dashboard/orderEditUtils"

function locationFieldLabel(value) {
  if (value == null || value === "") return ""
  if (typeof value === "string" || typeof value === "number") return String(value).trim()
  if (typeof value === "object" && !Array.isArray(value)) {
    return String(value.stateName ?? value.state ?? value.label ?? value.name ?? "").trim()
  }
  return String(value).trim()
}

/**
 * Beneficiary (orderFor) form for split child orders.
 * Booking farmer stays unchanged.
 */
const SplitOrderBeneficiaryForm = ({
  childOrder,
  parentOrder,
  onSkip,
  onSaved,
  saving: savingProp,
  setSaving: setSavingProp,
  showActions = true,
  showSplitBanner = true,
}) => {
  const [mode, setMode] = useState("existing")
  const [mobile, setMobile] = useState("")
  const [farmerData, setFarmerData] = useState(null)
  const [lookupState, setLookupState] = useState("idle")
  const [draft, setDraft] = useState(() => ({ ...emptyOrderForEditShape() }))
  const [error, setError] = useState("")
  const [savingLocal, setSavingLocal] = useState(false)

  const saving = savingProp ?? savingLocal
  const setSaving = setSavingProp ?? setSavingLocal

  const debouncedMobile = useDebounce(mobile, 500)
  const bookingFarmerName =
    parentOrder?.farmer?.name ||
    childOrder?.farmer?.name ||
    "—"
  const childOrderNumber = childOrder?.orderId ?? childOrder?.order ?? "—"
  const prevOrderFor = normalizeOrderFor(childOrder?.orderFor)

  const resetForm = useCallback(() => {
    setMode("existing")
    setMobile("")
    setFarmerData(null)
    setLookupState("idle")
    setDraft({ ...emptyOrderForEditShape(), ...prevOrderFor })
    setError("")
  }, [prevOrderFor])

  useEffect(() => {
    if (childOrder) resetForm()
  }, [childOrder?._id, resetForm])

  useEffect(() => {
    if (!childOrder || mode !== "existing") return
    const digits = String(debouncedMobile || "").replace(/\D/g, "")
    if (digits.length !== 10) {
      setFarmerData(null)
      setLookupState("idle")
      return
    }

    let cancelled = false
    setLookupState("loading")
    setFarmerData(null)

    ;(async () => {
      try {
        const instance = NetworkManager(API.FARMER.GET_FARMER_BY_MOBILE)
        const response = await instance.request(null, [digits])
        if (cancelled) return
        const farmer = response?.data?.data
        if (farmer?.name) {
          setFarmerData(farmer)
          setDraft(mapFarmerToOrderFor(farmer))
          setLookupState("found")
        } else {
          setFarmerData(null)
          setLookupState("not_found")
        }
      } catch {
        if (!cancelled) {
          setFarmerData(null)
          setLookupState("not_found")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debouncedMobile, mode, childOrder])

  const showLocationFields =
    mode === "new" && newFarmerRequiresLocation(draft, prevOrderFor)

  const handleModeChange = (_, nextMode) => {
    if (!nextMode) return
    setMode(nextMode)
    setError("")
    if (nextMode === "existing") {
      setDraft({ ...emptyOrderForEditShape() })
      setFarmerData(null)
      setLookupState("idle")
    } else {
      setDraft({ ...emptyOrderForEditShape(), ...prevOrderFor })
      setMobile("")
      setFarmerData(null)
      setLookupState("idle")
    }
  }

  const canSaveExisting =
    mode === "existing" &&
    lookupState === "found" &&
    farmerData?._id &&
    buildOrderForPatchForSplitBeneficiary(prevOrderFor, draft, { mode: "existing" }).ok

  const canSaveNew =
    mode === "new" &&
    buildOrderForPatchForSplitBeneficiary(prevOrderFor, draft, { mode: "new" }).ok

  const handleSave = async () => {
    setError("")
    const patchResult = buildOrderForPatchForSplitBeneficiary(prevOrderFor, draft, { mode })
    if (!patchResult.ok) {
      setError(patchResult.message || "Invalid beneficiary details")
      return
    }

    const orderId = childOrder?._id || childOrder?.id
    if (!orderId) {
      setError("Child order id missing")
      return
    }

    setSaving(true)
    try {
      const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
      await instance.request({
        id: orderId,
        orderFor: patchResult.orderFor,
      })
      Toast.success(`Beneficiary set for order #${childOrderNumber}`)
      onSaved?.()
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save beneficiary"
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!childOrder) return null

  return (
    <Box>
      {showSplitBanner && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Split complete — new order <strong>#{childOrderNumber}</strong>. Who is this order for?
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        Booking farmer stays: <strong>{bookingFarmerName}</strong>
      </Alert>

      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleModeChange}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
        disabled={saving}>
        <ToggleButton value="existing">Existing farmer</ToggleButton>
        <ToggleButton value="new">New farmer</ToggleButton>
      </ToggleButtonGroup>

      {mode === "existing" && (
        <Box>
          <TextField
            label="Mobile number"
            value={mobile}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 10)
              setMobile(digits)
              setError("")
            }}
            fullWidth
            size="small"
            inputMode="numeric"
            helperText="Enter 10-digit mobile to look up farmer"
            disabled={saving}
            sx={{ mb: 2 }}
          />

          {lookupState === "loading" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Looking up farmer…
              </Typography>
            </Box>
          )}

          {lookupState === "not_found" && String(mobile).replace(/\D/g, "").length === 10 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No farmer found — switch to New farmer or check the mobile number.
            </Alert>
          )}

          {farmerData?.name && (
            <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
              <Chip
                label="Existing Farmer"
                size="small"
                color="success"
                icon={<CheckIcon />}
                sx={{ mb: 1 }}
              />
              <Typography variant="subtitle2" fontWeight={600}>
                {farmerData.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {[
                  farmerData.village,
                  farmerData.talukaName || farmerData.taluka,
                  farmerData.districtName || farmerData.district,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Typography>
              {farmerData.mobileNumber && (
                <Typography variant="body2" color="text.secondary">
                  {farmerData.mobileNumber}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}

      {mode === "new" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Name"
            value={draft.name ?? ""}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
            size="small"
            required
            disabled={saving}
          />
          <TextField
            label="Mobile (optional)"
            value={draft.mobileNumber ?? ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 10)
              setDraft((prev) => ({ ...prev, mobileNumber: digits }))
              setError("")
            }}
            fullWidth
            size="small"
            inputMode="numeric"
            disabled={saving}
          />
          {!showLocationFields && (
            <Typography variant="caption" color="text.secondary">
              Name only is enough — plants will show as &quot;{draft.name || "Name"} · Booking: {bookingFarmerName}&quot;
            </Typography>
          )}
          {showLocationFields && (
            <>
              <Divider />
              <Typography variant="caption" color="text.secondary">
                Location required when mobile is set (state → village)
              </Typography>
              <LocationSelector
                selectedState={locationFieldLabel(draft.stateName || draft.state)}
                selectedDistrict={locationFieldLabel(draft.districtName || draft.district)}
                selectedTaluka={locationFieldLabel(draft.talukaName || draft.taluka)}
                selectedVillage={locationFieldLabel(draft.village)}
                onStateChange={(value) => {
                  const label = locationFieldLabel(value)
                  setDraft((prev) => ({
                    ...prev,
                    state: label,
                    stateName: label,
                    district: "",
                    districtName: "",
                    taluka: "",
                    talukaName: "",
                    village: "",
                  }))
                }}
                onDistrictChange={(value) => {
                  const label = locationFieldLabel(value)
                  setDraft((prev) => ({
                    ...prev,
                    district: label,
                    districtName: label,
                    taluka: "",
                    talukaName: "",
                    village: "",
                  }))
                }}
                onTalukaChange={(value) => {
                  const label = locationFieldLabel(value)
                  setDraft((prev) => ({
                    ...prev,
                    taluka: label,
                    talukaName: label,
                    village: "",
                  }))
                }}
                onVillageChange={(value) => {
                  const label = locationFieldLabel(value)
                  setDraft((prev) => ({ ...prev, village: label }))
                }}
                required
                showLabels={false}
                compact
                autoFill
              />
            </>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {showActions && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
          <Button onClick={onSkip} disabled={saving} color="inherit">
            Skip
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !(canSaveExisting || canSaveNew)}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}>
            {saving ? "Saving…" : "Save beneficiary"}
          </Button>
        </Box>
      )}
    </Box>
  )
}

export default SplitOrderBeneficiaryForm
