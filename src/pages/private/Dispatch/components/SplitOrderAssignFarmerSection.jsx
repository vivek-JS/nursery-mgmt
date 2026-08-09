import React, { useState, useEffect } from "react"
import {
  Box,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material"
import { CheckCircle as CheckIcon } from "@mui/icons-material"
import { API, NetworkManager } from "network/core"
import { isApiErrorResponse } from "network/core/responseParser"
import useDebounce from "hooks/useDebounce"
import LocationSelector from "components/LocationSelector"
import {
  emptyOrderForEditShape,
  mapFarmerToOrderFor,
  bookForDraftFromBookingFarmer,
  resolveBookedByName,
  formatBookForLocationLine,
  validateSplitAssignMode,
} from "../../dashboard/orderEditUtils"

function locationFieldLabel(value) {
  if (value == null || value === "") return ""
  if (typeof value === "string" || typeof value === "number") return String(value).trim()
  if (typeof value === "object" && !Array.isArray(value)) {
    return String(value.stateName ?? value.state ?? value.label ?? value.name ?? "").trim()
  }
  return String(value).trim()
}

const silentReq = { silent: true }

async function searchFarmersByNameOrMobile(query) {
  const q = String(query || "").trim()
  if (q.length < 2) return []
  const instance = NetworkManager(API.ORDER.SEARCH_FARMERS_FOR_LEDGER_TRANSFER)
  const response = await instance.request({}, { q, limit: 10 }, silentReq)
  if (isApiErrorResponse(response)) return []
  return response?.data?.data?.items || []
}

async function fetchFarmerDetail(summary) {
  if (!summary) return null

  if (summary._id) {
    const inst = NetworkManager(API.FARMER.GET_FARMER_BY_ID)
    const res = await inst.request(null, [summary._id], silentReq)
    if (!isApiErrorResponse(res)) {
      const farmer = res?.data?.data || res?.data
      if (farmer?.name) return farmer
    }
  }

  const mob = String(summary.mobileNumber ?? "").replace(/\D/g, "").slice(-10)
  if (mob.length === 10) {
    const inst = NetworkManager(API.FARMER.GET_FARMER_BY_MOBILE)
    const res = await inst.request(null, [mob], silentReq)
    if (!isApiErrorResponse(res) && res?.data?.data) return res.data.data
  }

  return summary
}

const SplitOrderAssignFarmerSection = ({
  enabled,
  onEnabledChange,
  bookingFarmerName,
  bookingFarmer,
  draft,
  onDraftChange,
  assignMode,
  onAssignModeChange,
  disabled = false,
  error,
  onErrorClear,
}) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedFarmer, setSelectedFarmer] = useState(null)
  const [selectingId, setSelectingId] = useState(null)
  const debouncedSearch = useDebounce(searchQuery, 400)

  useEffect(() => {
    if (!enabled || assignMode !== "existing") {
      setSearchQuery("")
      setSearchResults([])
      setSelectedFarmer(null)
      return
    }
    const q = String(debouncedSearch || "").trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }

    let cancelled = false
    setSearchLoading(true)
    searchFarmersByNameOrMobile(q)
      .then((items) => {
        if (!cancelled) setSearchResults(Array.isArray(items) ? items : [])
      })
      .catch(() => {
        if (!cancelled) setSearchResults([])
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, enabled, assignMode])

  const resetExisting = () => {
    setSearchQuery("")
    setSearchResults([])
    setSelectedFarmer(null)
    setSelectingId(null)
  }

  const handleToggle = (e) => {
    const on = e.target.checked
    onEnabledChange(on)
    onErrorClear?.()
    if (on) {
      onAssignModeChange("existing")
    } else {
      onDraftChange({ ...emptyOrderForEditShape() })
      onAssignModeChange("existing")
      resetExisting()
    }
  }

  const handleModeChange = (_, next) => {
    if (!next) return
    onAssignModeChange(next)
    onErrorClear?.()
    onDraftChange(
      next === "bookfor"
        ? bookForDraftFromBookingFarmer(bookingFarmer)
        : { ...emptyOrderForEditShape() }
    )
    resetExisting()
  }

  const bookedByName = resolveBookedByName(bookingFarmer, bookingFarmerName)
  const bookForLocationLine = formatBookForLocationLine(draft)

  const handleSelectFarmer = async (summary) => {
    if (!summary?._id) return
    setSelectingId(summary._id)
    onErrorClear?.()
    try {
      const full = await fetchFarmerDetail(summary)
      if (full?.name) {
        setSelectedFarmer(full)
        onDraftChange(mapFarmerToOrderFor(full))
      }
    } finally {
      setSelectingId(null)
    }
  }

  return (
    <Box sx={{ mt: 2 }}>
      <FormControlLabel
        control={
          <Switch checked={enabled} onChange={handleToggle} disabled={disabled} size="small" />
        }
        label={
          <Typography variant="body2" fontWeight={600}>
            Assign split order to another farmer
          </Typography>
        }
      />

      {enabled && (
        <Box sx={{ mt: 1.5, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          {assignMode === "bookfor" && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Order stays under <strong>{bookedByName}</strong> — enter who this split is for (delivery)
            </Typography>
          )}

          {assignMode === "existing" && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Search and assign a full farmer record from the ledger
            </Typography>
          )}

          {assignMode === "new" && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Create a new farmer record for the split child order
            </Typography>
          )}

          <ToggleButtonGroup
            value={assignMode}
            exclusive
            onChange={handleModeChange}
            size="small"
            fullWidth
            sx={{ mb: 2, flexWrap: "wrap" }}
            disabled={disabled}>
            <ToggleButton value="existing" sx={{ flex: 1, minWidth: 90 }}>
              Existing
            </ToggleButton>
            <ToggleButton value="new" sx={{ flex: 1, minWidth: 90 }}>
              New farmer
            </ToggleButton>
            <ToggleButton value="bookfor" sx={{ flex: 1, minWidth: 90 }}>
              Book for
            </ToggleButton>
          </ToggleButtonGroup>

          {assignMode === "existing" && (
            <Box>
              <TextField
                label="Search by name or mobile"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedFarmer(null)
                  onDraftChange({ ...emptyOrderForEditShape() })
                  onErrorClear?.()
                }}
                fullWidth
                size="small"
                helperText="Type at least 2 characters"
                disabled={disabled}
              />
              {searchLoading && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">Searching…</Typography>
                </Box>
              )}
              {!searchLoading && searchResults.length > 0 && !selectedFarmer && (
                <List dense sx={{ mt: 1, maxHeight: 160, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                  {searchResults.map((f) => (
                    <ListItemButton
                      key={f._id}
                      onClick={() => handleSelectFarmer(f)}
                      disabled={disabled || selectingId === f._id}>
                      <ListItemText
                        primary={f.name}
                        secondary={[f.mobileNumber, f.village, f.taluka, f.district].filter(Boolean).join(" · ")}
                      />
                      {selectingId === f._id && <CircularProgress size={14} />}
                    </ListItemButton>
                  ))}
                </List>
              )}
              {!searchLoading && debouncedSearch.trim().length >= 2 && searchResults.length === 0 && !selectedFarmer && (
                <Alert severity="warning" sx={{ mt: 1 }}>No farmers found.</Alert>
              )}
              {selectedFarmer?.name && (
                <Box sx={{ mt: 1, p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
                  <Chip label="Selected" size="small" color="success" icon={<CheckIcon />} sx={{ mb: 0.5 }} />
                  <Typography variant="body2" fontWeight={600}>{selectedFarmer.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[selectedFarmer.village, selectedFarmer.talukaName || selectedFarmer.taluka, selectedFarmer.districtName || selectedFarmer.district]
                      .filter(Boolean)
                      .join(", ")}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {assignMode === "new" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <TextField
                label="Farmer name"
                value={draft.name ?? ""}
                onChange={(e) => {
                  onDraftChange({ ...draft, name: e.target.value })
                  onErrorClear?.()
                }}
                fullWidth
                size="small"
                required
                disabled={disabled}
              />
              <TextField
                label="Mobile"
                value={draft.mobileNumber ?? ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 10)
                  onDraftChange({ ...draft, mobileNumber: digits })
                  onErrorClear?.()
                }}
                fullWidth
                size="small"
                inputMode="numeric"
                required
                disabled={disabled}
                helperText="10-digit mobile required"
              />
              <Divider />
              <Typography variant="caption" color="text.secondary">
                Location required (state → village)
              </Typography>
              <LocationSelector
                selectedState={locationFieldLabel(draft.stateName || draft.state)}
                selectedDistrict={locationFieldLabel(draft.districtName || draft.district)}
                selectedTaluka={locationFieldLabel(draft.talukaName || draft.taluka)}
                selectedVillage={locationFieldLabel(draft.village)}
                onStateChange={(value) => {
                  const label = locationFieldLabel(value)
                  onDraftChange({
                    ...draft,
                    state: label,
                    stateName: label,
                    district: "",
                    districtName: "",
                    taluka: "",
                    talukaName: "",
                    village: "",
                  })
                }}
                onDistrictChange={(value) => {
                  const label = locationFieldLabel(value)
                  onDraftChange({
                    ...draft,
                    district: label,
                    districtName: label,
                    taluka: "",
                    talukaName: "",
                    village: "",
                  })
                }}
                onTalukaChange={(value) => {
                  const label = locationFieldLabel(value)
                  onDraftChange({ ...draft, taluka: label, talukaName: label, village: "" })
                }}
                onVillageChange={(value) => {
                  const label = locationFieldLabel(value)
                  onDraftChange({ ...draft, village: label })
                }}
                required
                showLabels={false}
                compact
                autoFill
              />
            </Box>
          )}

          {assignMode === "bookfor" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Divider>
                <Chip label="Book for (delivery)" size="small" color="primary" />
              </Divider>
              <TextField
                label="Name"
                value={draft.name ?? ""}
                onChange={(e) => {
                  onDraftChange({ ...draft, name: e.target.value })
                  onErrorClear?.()
                }}
                fullWidth
                size="small"
                required
                placeholder="Name of person order is for"
                disabled={disabled}
              />
              <TextField
                label="Mobile (optional)"
                value={draft.mobileNumber ?? ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 10)
                  onDraftChange({ ...draft, mobileNumber: digits })
                  onErrorClear?.()
                }}
                fullWidth
                size="small"
                inputMode="numeric"
                placeholder="10-digit mobile if known"
                disabled={disabled}
              />
              <TextField
                label="Address (optional)"
                value={draft.address ?? ""}
                onChange={(e) => {
                  onDraftChange({ ...draft, address: e.target.value })
                  onErrorClear?.()
                }}
                fullWidth
                size="small"
                multiline
                rows={2}
                placeholder="Extra address / landmark"
                disabled={disabled}
              />
              <Typography variant="caption" color="text.secondary">
                Location for beneficiary (optional)
              </Typography>
              <LocationSelector
                selectedState={locationFieldLabel(draft.stateName || draft.state)}
                selectedDistrict={locationFieldLabel(draft.districtName || draft.district)}
                selectedTaluka={locationFieldLabel(draft.talukaName || draft.taluka)}
                selectedVillage={locationFieldLabel(draft.village)}
                onStateChange={(value) => {
                  const label = locationFieldLabel(value)
                  onDraftChange({
                    ...draft,
                    state: label,
                    stateName: label,
                    district: "",
                    districtName: "",
                    taluka: "",
                    talukaName: "",
                    village: "",
                  })
                }}
                onDistrictChange={(value) => {
                  const label = locationFieldLabel(value)
                  onDraftChange({
                    ...draft,
                    district: label,
                    districtName: label,
                    taluka: "",
                    talukaName: "",
                    village: "",
                  })
                }}
                onTalukaChange={(value) => {
                  const label = locationFieldLabel(value)
                  onDraftChange({ ...draft, taluka: label, talukaName: label, village: "" })
                }}
                onVillageChange={(value) => {
                  const label = locationFieldLabel(value)
                  onDraftChange({ ...draft, village: label })
                }}
                showLabels={false}
                compact
                autoFill
                disabled={disabled}
              />
              <Alert severity="info" sx={{ py: 0.5, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
                Book-for name and location are stored on the order and used in lists and search.
              </Alert>
              {String(draft.name || "").trim() && (
                <Box sx={{ p: 1.5, bgcolor: "#e8f5e8", borderRadius: 1, border: "1px solid #4caf50" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#2e7d32", mb: 0.75 }}>
                    Book for
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Name:</strong> {draft.name}
                  </Typography>
                  {bookForLocationLine ? (
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Location:</strong> {bookForLocationLine}
                    </Typography>
                  ) : null}
                  {draft.mobileNumber ? (
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Mobile:</strong> {draft.mobileNumber}
                    </Typography>
                  ) : null}
                  {draft.address ? (
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Address:</strong> {draft.address}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                    In order list: {draft.name} · Booking: {bookedByName}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>
          )}
        </Box>
      )}
    </Box>
  )
}

export function validateSplitAssignDraft(enabled, assignMode, draft) {
  if (!enabled) return { ok: true }
  return validateSplitAssignMode(assignMode, draft)
}

export default SplitOrderAssignFarmerSection
