import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  Paper,
  Stack,
  IconButton,
  Tooltip
} from "@mui/material"
import {
  RefreshCw,
  RotateCcw,
  Save,
  Sprout,
  IndianRupee,
  Truck,
  Users,
  UserPlus,
  Calendar
} from "lucide-react"
import moment from "moment"
import LocationSelector from "components/LocationSelector"
import { Toast } from "helpers/toasts/toastHelper"
import { getCavityDisplayLabel } from "utils/cavityDisplay"
import {
  ORDER_DATE_DISPLAY,
  emptyOrderForEditShape,
  normalizeOrderFor,
  getTrayOptionId,
  getTrayOptionLabel,
  computeOrderEditChangeItems,
  validateOrderEditSave,
  initialDeliveryDateFromSlotStart,
  isSlotEndOnOrAfterToday,
  startOfTodayMoment
} from "./orderEditUtils"

function locationFieldLabel(value) {
  if (value == null || value === "") return ""
  if (typeof value === "string" || typeof value === "number") return String(value).trim()
  if (typeof value === "object" && !Array.isArray(value)) {
    return String(value.stateName ?? value.state ?? value.label ?? value.name ?? "").trim()
  }
  return String(value).trim()
}

function FieldCard({ title, subtitle, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
      {title ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.primary">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      ) : null}
      {children}
    </Paper>
  )
}

function SlotDatePicker({ slot, selectedDate, onSelectDate }) {
  if (!slot?.startDay || !slot?.endDay) return null
  const slotStart = moment(slot.startDay, "DD-MM-YYYY")
  const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
  const today = startOfTodayMoment()
  const dates = []
  let cur = slotStart.clone()
  while (cur.isSameOrBefore(slotEnd, "day")) {
    if (cur.isSameOrAfter(today, "day")) dates.push(cur.clone())
    cur.add(1, "day")
  }
  if (dates.length === 0) return null

  return (
    <Box
      sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }}
      onClick={(e) => e.stopPropagation()}>
      {dates.map((d) => {
        const key = d.format("YYYY-MM-DD")
        const isSelected =
          selectedDate && moment(selectedDate).format("YYYY-MM-DD") === key
        return (
          <Chip
            key={key}
            size="small"
            label={d.format("DD MMM")}
            onClick={(e) => {
              e.stopPropagation()
              onSelectDate(d.toDate(), slot.value)
            }}
            color={isSelected ? "primary" : "default"}
            variant={isSelected ? "filled" : "outlined"}
            sx={{ fontWeight: isSelected ? 700 : 500 }}
          />
        )
      })}
    </Box>
  )
}

const OrderEditPanel = ({
  selectedOrder,
  selectedOrderCounts,
  updatedObject,
  setUpdatedObject,
  quantityDeltaInput,
  setQuantityDeltaInput,
  editBaseQuantity,
  editFinalQuantity,
  quantityDeltaParsed,
  orderEditHasChanges,
  isPlantOrderEdit,
  canEditPlantSubtype,
  canReassignSalesPerson,
  canEditOrderPlantQuantity,
  isSuperAdmin,
  pendingRateRequest,
  orderEditSubtypes,
  orderEditSubtypesLoading,
  orderEditTrays,
  orderEditTraysLoading,
  nurserySiteEditOptions,
  salesPeople,
  slots,
  slotsLoading,
  getSlotDetailsForDate,
  handleOrderEditPlantSubtypeChange,
  handleInputChange,
  modalContextRefreshing,
  patchLoading,
  onRefresh,
  onDiscard,
  onSaveValidated,
  editBookForExpanded,
  setEditBookForExpanded
}) => {
  const [section, setSection] = useState("pricing")

  useEffect(() => {
    setSection(isPlantOrderEdit ? "plant" : "pricing")
  }, [selectedOrder?.details?.orderid, isPlantOrderEdit])

  const changeItems = useMemo(
    () =>
      computeOrderEditChangeItems({
        selectedOrder,
        updatedObject,
        quantityDeltaInput,
        editBaseQuantity,
        editFinalQuantity,
        orderEditSubtypes,
        orderEditTrays,
        salesPeople,
        canEditPlantSubtype,
        canReassignSalesPerson,
        getSlotDetailsForDate
      }),
    [
      selectedOrder,
      updatedObject,
      quantityDeltaInput,
      editBaseQuantity,
      editFinalQuantity,
      orderEditSubtypes,
      orderEditTrays,
      salesPeople,
      canEditPlantSubtype,
      canReassignSalesPerson,
      getSlotDetailsForDate
    ]
  )

  const selectedSlotId =
    updatedObject?.bookingSlot != null
      ? String(updatedObject.bookingSlot)
      : String(selectedOrder?.details?.bookingSlot?.slotId || "")
  const slotCapacityBlock = useMemo(() => {
    if (!updatedObject?.deliveryDate || !getSlotDetailsForDate) return null
    const slotDetails = getSlotDetailsForDate(updatedObject.deliveryDate)
    if (!slotDetails) return { type: "error", text: "Date is outside available slots" }
    const requested = quantityDeltaParsed.valid
      ? Number(editFinalQuantity || 0)
      : Number(selectedOrder?.quantity || 0)
    const currentQuantity = Number(selectedOrder?.quantity || 0)
    const adjustedAvailable = slotDetails.available + currentQuantity
    if (requested > adjustedAvailable) {
      return {
        type: "error",
        text: `Insufficient capacity — only ${adjustedAvailable.toLocaleString("en-IN")} available`
      }
    }
    return {
      type: "ok",
      text: `${adjustedAvailable.toLocaleString("en-IN")} capacity · requesting ${requested.toLocaleString("en-IN")}`
    }
  }, [
    updatedObject?.deliveryDate,
    getSlotDetailsForDate,
    quantityDeltaParsed,
    editFinalQuantity,
    selectedOrder?.quantity
  ])

  const handleSave = () => {
    const result = validateOrderEditSave({
      selectedOrder,
      updatedObject,
      quantityDeltaInput,
      editBaseQuantity,
      canEditOrderPlantQuantity,
      canEditPlantSubtype,
      canReassignSalesPerson,
      orderEditSubtypes,
      orderEditTrays,
      salesPeople,
      getSlotDetailsForDate
    })
    if (!result.ok) {
      if (result.noChanges) Toast.info(result.message)
      else Toast.error(result.message)
      return
    }
    onSaveValidated(result.payload, result.changeLines)
  }

  const tabs = useMemo(() => {
    const list = [
      { id: "pricing", label: "Pricing & qty", icon: IndianRupee },
      { id: "delivery", label: "Delivery", icon: Truck }
    ]
    if (isPlantOrderEdit) {
      list.unshift({ id: "plant", label: "Plant & tray", icon: Sprout })
    }
    if (canReassignSalesPerson) {
      list.push({ id: "sales", label: "Sales", icon: Users })
    }
    if (isPlantOrderEdit) {
      list.push({ id: "beneficiary", label: "Book-for", icon: UserPlus })
    }
    return list
  }, [isPlantOrderEdit, canReassignSalesPerson])

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        gap: 2,
        minHeight: 420
      }}>
      {/* Sidebar: preview + snapshot */}
      <Box
        sx={{
          width: { xs: "100%", lg: 280 },
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 1.5
        }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: orderEditHasChanges ? "primary.50" : "grey.50",
            border: "1px solid",
            borderColor: orderEditHasChanges ? "primary.200" : "grey.200"
          }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
            Pending changes
          </Typography>
          {changeItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No edits yet — adjust fields on the right.
            </Typography>
          ) : (
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              {changeItems.map((item) => (
                <Box key={item.key}>
                  <Typography variant="caption" fontWeight={700} color="primary.dark">
                    {item.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                    <Box component="span" sx={{ color: "text.secondary", textDecoration: "line-through" }}>
                      {item.from}
                    </Box>
                    {" → "}
                    <Box component="span" fontWeight={600}>
                      {item.to}
                    </Box>
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        {isPlantOrderEdit && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
              Saved on order
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Plant:</strong> {selectedOrder.plantType}
              </Typography>
              <Typography variant="body2">
                <strong>Tray:</strong>{" "}
                {getCavityDisplayLabel(selectedOrder.details?.cavity) || "Not set"}
              </Typography>
              <Typography variant="body2">
                <strong>Delivery:</strong>{" "}
                {selectedOrder.deliveryDate || selectedOrder.Delivery || "—"}
              </Typography>
              <Typography variant="body2">
                <strong>Qty:</strong> {selectedOrderCounts.base?.toLocaleString("en-IN")}
              </Typography>
            </Stack>
          </Paper>
        )}
      </Box>

      {/* Main editor */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.5,
            mb: 1.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            bgcolor: "grey.900",
            color: "common.white"
          }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Edit order #{selectedOrder.order}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {selectedOrder.farmerName} · {selectedOrder.orderStatus}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Reload order, slots & trays">
              <span>
                <IconButton
                  size="small"
                  onClick={onRefresh}
                  disabled={modalContextRefreshing}
                  sx={{ color: "inherit" }}>
                  {modalContextRefreshing ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <RefreshCw size={18} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<RotateCcw size={16} />}
              onClick={onDiscard}
              sx={{ borderColor: "rgba(255,255,255,0.4)" }}>
              Discard
            </Button>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              startIcon={patchLoading ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
              disabled={!orderEditHasChanges || patchLoading}
              onClick={handleSave}
              sx={{ fontWeight: 700 }}>
              Save
            </Button>
          </Stack>
        </Paper>

        <Tabs
          value={section}
          onChange={(_, v) => setSection(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 1.5,
            minHeight: 40,
            "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600 }
          }}>
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <Tab
                key={t.id}
                value={t.id}
                label={t.label}
                icon={<Icon size={16} />}
                iconPosition="start"
              />
            )
          })}
        </Tabs>

        <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
          {section === "plant" && isPlantOrderEdit && (
            <Stack spacing={2}>
              <FieldCard title="Plant subtype" subtitle="Changing subtype requires a new delivery slot">
                {orderEditSubtypesLoading ? (
                  <CircularProgress size={22} />
                ) : (
                  <FormControl fullWidth size="small">
                    <InputLabel>Subtype</InputLabel>
                    <Select
                      label="Subtype"
                      value={
                        updatedObject?.plantSubtype != null
                          ? String(updatedObject.plantSubtype)
                          : String(selectedOrder?.details?.plantSubtypeID || "")
                      }
                      onChange={(e) => handleOrderEditPlantSubtypeChange(e.target.value)}>
                      {(orderEditSubtypes || []).map((st) => (
                        <MenuItem key={st.value} value={st.value}>
                          {st.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </FieldCard>

              <FieldCard title="Tray / cavity">
                {orderEditTraysLoading ? (
                  <CircularProgress size={22} />
                ) : (
                  <FormControl fullWidth size="small">
                    <InputLabel>Tray</InputLabel>
                    <Select
                      label="Tray"
                      value={updatedObject?.cavity ?? ""}
                      onChange={(e) => handleInputChange(0, "cavity", e.target.value)}>
                      <MenuItem value="">
                        <em>Not set</em>
                      </MenuItem>
                      {(orderEditTrays || []).map((tray) => {
                        const tid = getTrayOptionId(tray)
                        if (!tid) return null
                        return (
                          <MenuItem key={tid} value={tid}>
                            {getTrayOptionLabel(tray)}
                          </MenuItem>
                        )
                      })}
                    </Select>
                  </FormControl>
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Tray can be updated at any active stage (including farm ready and ready for dispatch).
                  Quantity may stay locked after ready for dispatch.
                </Typography>
              </FieldCard>

              <FieldCard title="Expected nursery">
                <FormControl fullWidth size="small">
                  <InputLabel>Nursery site</InputLabel>
                  <Select
                    label="Nursery site"
                    value={updatedObject?.expectedNursery ?? "RB"}
                    onChange={(e) =>
                      setUpdatedObject((prev) => ({
                        ...prev,
                        expectedNursery: String(e.target.value || "").toUpperCase()
                      }))
                    }>
                    {nurserySiteEditOptions.length === 0 ? (
                      <MenuItem value="RB">RB</MenuItem>
                    ) : (
                      nurserySiteEditOptions.map((s) => (
                        <MenuItem key={s._id} value={String(s.code || "").toUpperCase()}>
                          {s.name} ({String(s.code || "").toUpperCase()})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </FieldCard>
            </Stack>
          )}

          {section === "pricing" && (
            <Stack spacing={2}>
              <FieldCard title="Rate per plant">
                {pendingRateRequest?.status === "PENDING" ? (
                  <Alert severity="warning" icon={false}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Rate approval pending
                    </Typography>
                    <Typography variant="body2">
                      ₹{pendingRateRequest.previousRate} → ₹{pendingRateRequest.requestedRate}
                    </Typography>
                    {pendingRateRequest.requestedBy?.name && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        By {pendingRateRequest.requestedBy.name}
                      </Typography>
                    )}
                  </Alert>
                ) : (
                  <>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Rate (₹)"
                      value={
                        updatedObject?.rate !== undefined ? updatedObject.rate : selectedOrder?.rate
                      }
                      onChange={(e) => handleInputChange(0, "rate", e.target.value)}
                    />
                    {updatedObject?.rate !== undefined &&
                      Number(updatedObject.rate) !== Number(selectedOrder?.rate) &&
                      !isSuperAdmin && (
                        <Alert severity="warning" sx={{ mt: 1.5 }}>
                          Super Admin approval required for this rate change.
                        </Alert>
                      )}
                  </>
                )}
              </FieldCard>

              <FieldCard
                title="Quantity adjustment"
                subtitle="Enter +500 or -300 — base quantity stays on the order until you save">
                {!canEditOrderPlantQuantity(selectedOrder?.orderStatus) ? (
                  <Alert severity="info">
                    Quantity is locked after Ready for dispatch or on completed/cancelled orders.
                  </Alert>
                ) : (
                  <>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="+500 or -300"
                      value={quantityDeltaInput}
                      onChange={(e) => setQuantityDeltaInput(e.target.value)}
                      error={quantityDeltaInput.length > 0 && !quantityDeltaParsed.valid}
                      helperText={
                        quantityDeltaInput && !quantityDeltaParsed.valid
                          ? quantityDeltaParsed.error
                          : " "
                      }
                    />
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 1,
                        mt: 1.5,
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "grey.50"
                      }}>
                      {[
                        ["Base", editBaseQuantity.toLocaleString("en-IN")],
                        ["Delta", quantityDeltaParsed.valid ? quantityDeltaParsed.display : "—"],
                        ["Final", Number.isFinite(editFinalQuantity) ? editFinalQuantity.toLocaleString("en-IN") : "—"]
                      ].map(([label, val]) => (
                        <Box key={label} textAlign="center">
                          <Typography variant="caption" color="text.secondary">
                            {label}
                          </Typography>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {val}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </FieldCard>
            </Stack>
          )}

          {section === "delivery" && (
            <Stack spacing={2}>
              <FieldCard
                title="Delivery period"
                subtitle="Pick a slot, then choose a date within that period">
                {slotsLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading slots…</Typography>
                  </Box>
                ) : slots.length === 0 ? (
                  <Alert severity="error">No slots available for this plant/subtype.</Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {slots.filter(isSlotEndOnOrAfterToday).map((slot) => {
                      const selected = String(slot.value) === selectedSlotId
                      return (
                        <Paper
                          key={slot.value}
                          variant="outlined"
                          onClick={() => {
                            const initialDate = initialDeliveryDateFromSlotStart(slot.startDay)
                            if (!initialDate) return
                            setUpdatedObject((prev) => {
                              const prevSlot =
                                prev?.bookingSlot != null
                                  ? String(prev.bookingSlot)
                                  : String(selectedOrder?.details?.bookingSlot?.slotId || "")
                              const nextSlot = String(slot.value)
                              const isSameSlot = prevSlot !== "" && prevSlot === nextSlot
                              return {
                                ...(prev || {}),
                                bookingSlot: slot.value,
                                deliveryDate: isSameSlot
                                  ? prev?.deliveryDate ?? initialDate
                                  : initialDate
                              }
                            })
                          }}
                          sx={{
                            p: 1.5,
                            cursor: "pointer",
                            borderWidth: 2,
                            borderColor: selected ? "primary.main" : "divider",
                            bgcolor: selected ? "primary.50" : "background.paper",
                            transition: "border-color 0.15s"
                          }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {slot.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {slot.available?.toLocaleString("en-IN")} plants available
                          </Typography>
                          {selected && (
                            <SlotDatePicker
                              slot={slot}
                              selectedDate={updatedObject?.deliveryDate}
                              onSelectDate={(date, slotId) =>
                                setUpdatedObject((prev) => ({
                                  ...(prev || {}),
                                  deliveryDate: date,
                                  bookingSlot: slotId
                                }))
                              }
                            />
                          )}
                        </Paper>
                      )
                    })}
                  </Stack>
                )}
              </FieldCard>

              {updatedObject?.deliveryDate && (
                <FieldCard title="Selected delivery">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Calendar size={18} />
                    <Typography variant="body1" fontWeight={600}>
                      {moment(updatedObject.deliveryDate).format(ORDER_DATE_DISPLAY)}
                    </Typography>
                  </Stack>
                  {slotCapacityBlock && (
                    <Alert severity={slotCapacityBlock.type === "ok" ? "success" : "error"} sx={{ mt: 1.5 }}>
                      {slotCapacityBlock.text}
                    </Alert>
                  )}
                </FieldCard>
              )}
            </Stack>
          )}

          {section === "sales" && canReassignSalesPerson && (
            <FieldCard title="Sales person / dealer">
              <FormControl fullWidth size="small">
                <InputLabel>Booked by</InputLabel>
                <Select
                  label="Booked by"
                  value={updatedObject?.salesPerson ?? ""}
                  onChange={(e) => handleInputChange(0, "salesPerson", e.target.value)}>
                  {(salesPeople || []).map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Booked-by can be changed after dispatch (office admin).
              </Typography>
            </FieldCard>
          )}

          {section === "beneficiary" && isPlantOrderEdit && (
            <Stack spacing={2}>
              {!editBookForExpanded && !normalizeOrderFor(updatedObject?.orderFor)?.name && (
                <Alert severity="info">
                  Leave empty if plants are for the booking farmer:{" "}
                  <strong>{selectedOrder?.details?.farmer?.name}</strong>
                </Alert>
              )}
              <FieldCard title="Beneficiary details">
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Name"
                    value={updatedObject?.orderFor?.name ?? ""}
                    onChange={(e) =>
                      setUpdatedObject((prev) => ({
                        ...prev,
                        orderFor: {
                          ...emptyOrderForEditShape(),
                          ...(prev?.orderFor || {}),
                          name: e.target.value
                        }
                      }))
                    }
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="Mobile"
                    inputMode="numeric"
                    value={updatedObject?.orderFor?.mobileNumber ?? ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 10)
                      setUpdatedObject((prev) => ({
                        ...prev,
                        orderFor: {
                          ...emptyOrderForEditShape(),
                          ...(prev?.orderFor || {}),
                          mobileNumber: digits
                        }
                      }))
                    }}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    label="Address (optional)"
                    value={updatedObject?.orderFor?.address ?? ""}
                    onChange={(e) =>
                      setUpdatedObject((prev) => ({
                        ...prev,
                        orderFor: {
                          ...emptyOrderForEditShape(),
                          ...(prev?.orderFor || {}),
                          address: e.target.value
                        }
                      }))
                    }
                  />
                  <Divider />
                  <Typography variant="caption" color="text.secondary">
                    Location (state → village)
                  </Typography>
                  <LocationSelector
                    selectedState={locationFieldLabel(
                      updatedObject?.orderFor?.stateName || updatedObject?.orderFor?.state
                    )}
                    selectedDistrict={locationFieldLabel(
                      updatedObject?.orderFor?.districtName || updatedObject?.orderFor?.district
                    )}
                    selectedTaluka={locationFieldLabel(
                      updatedObject?.orderFor?.talukaName || updatedObject?.orderFor?.taluka
                    )}
                    selectedVillage={locationFieldLabel(updatedObject?.orderFor?.village)}
                    onStateChange={(value) => {
                      const stateLabel = locationFieldLabel(value)
                      setUpdatedObject((prev) => ({
                        ...prev,
                        orderFor: {
                          ...emptyOrderForEditShape(),
                          ...(prev?.orderFor || {}),
                          state: stateLabel,
                          stateName: stateLabel,
                          district: "",
                          districtName: "",
                          taluka: "",
                          talukaName: "",
                          village: ""
                        }
                      }))
                    }}
                    onDistrictChange={(value) => {
                      const districtLabel = locationFieldLabel(value)
                      setUpdatedObject((prev) => ({
                        ...prev,
                        orderFor: {
                          ...emptyOrderForEditShape(),
                          ...(prev?.orderFor || {}),
                          district: districtLabel,
                          districtName: districtLabel,
                          taluka: "",
                          talukaName: "",
                          village: ""
                        }
                      }))
                    }}
                    onTalukaChange={(value) => {
                      const talukaLabel = locationFieldLabel(value)
                      setUpdatedObject((prev) => ({
                        ...prev,
                        orderFor: {
                          ...emptyOrderForEditShape(),
                          ...(prev?.orderFor || {}),
                          taluka: talukaLabel,
                          talukaName: talukaLabel,
                          village: ""
                        }
                      }))
                    }}
                    onVillageChange={(value) => {
                      const villageLabel = locationFieldLabel(value)
                      setUpdatedObject((prev) => ({
                        ...prev,
                        orderFor: {
                          ...emptyOrderForEditShape(),
                          ...(prev?.orderFor || {}),
                          village: villageLabel
                        }
                      }))
                    }}
                    required={false}
                    showLabels={false}
                    compact
                    autoFill
                  />
                </Stack>
              </FieldCard>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default OrderEditPanel
