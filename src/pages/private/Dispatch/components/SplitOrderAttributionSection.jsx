import React, { useEffect, useState } from "react"
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Switch,
  Alert,
} from "@mui/material"
import SearchableSelect from "components/FormField/SearchableSelect"
import { API, NetworkManager } from "network/core"
import { resolveSplitAttributionFromOrder } from "../../dashboard/orderEditUtils"

export default function SplitOrderAttributionSection({ order, value, onChange }) {
  const [dealers, setDealers] = useState([])
  const [sales, setSales] = useState([])

  useEffect(() => {
    if (!order) return
    onChange?.(resolveSplitAttributionFromOrder(order))
  }, [order?._id, order?.details?.orderid, order?.orderId, onChange])

  useEffect(() => {
    const mode = value?.childAttribution?.attributionMode || value?.attributionMode
    if (value?.useOriginalAttribution) return
    if (mode === "dealer") void loadDealers()
    else if (mode === "sales") void loadSales()
  }, [value?.useOriginalAttribution, value?.childAttribution?.attributionMode, value?.attributionMode])

  const loadDealers = async () => {
    try {
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE)
      const res = await instance.request(null, { jobTitle: "DEALER" })
      const list = res?.data?.data || []
      setDealers(
        (Array.isArray(list) ? list : []).map((d) => ({
          label: d.name || d.phoneNumber || String(d._id),
          value: String(d._id),
        }))
      )
    } catch {
      setDealers([])
    }
  }

  const loadSales = async () => {
    try {
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE)
      const res = await instance.request(null, { jobTitle: "SALES" })
      const list = res?.data?.data || []
      setSales(
        (Array.isArray(list) ? list : []).map((s) => ({
          label: s.name || s.phoneNumber || String(s._id),
          value: String(s._id),
        }))
      )
    } catch {
      setSales([])
    }
  }

  if (!value?.originalAttribution) return null

  const original = value.originalAttribution
  const child = value.childAttribution || original
  const useOriginal = value.useOriginalAttribution !== false
  const childMode = child.attributionMode || "sales"
  const options = childMode === "dealer" ? dealers : sales

  const updateChild = (patch) => {
    onChange({
      ...value,
      childAttribution: { ...child, ...patch },
      attributionMode: patch.attributionMode ?? child.attributionMode,
      attributionId: patch.attributionId ?? child.attributionId,
      attributionLabel: patch.attributionLabel ?? child.attributionLabel,
      dealerOrder: patch.dealerOrder ?? child.dealerOrder,
    })
  }

  const childSummaryLabel = useOriginal
    ? original.attributionLabel || "Same as parent"
    : child.attributionLabel || "Select sales or dealer"

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Booked by (child order)
      </Typography>

      <Box sx={{ mb: 1.5, p: 1.25, bgcolor: "grey.50", borderRadius: 1, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="caption" color="text.secondary">
          Original (parent order)
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {original.attributionLabel || "—"}
          {original.dealerOrder ? " · Dealer order" : " · Sales order"}
        </Typography>
      </Box>

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={useOriginal}
            onChange={(e) =>
              onChange({
                ...value,
                useOriginalAttribution: e.target.checked,
                ...(e.target.checked
                  ? {
                      childAttribution: { ...original },
                      attributionMode: original.attributionMode,
                      attributionId: original.attributionId,
                      attributionLabel: original.attributionLabel,
                      dealerOrder: original.dealerOrder,
                    }
                  : {}),
              })
            }
          />
        }
        label={
          <Typography variant="body2">
            Same as parent order
          </Typography>
        }
      />

      {!useOriginal && (
        <>
          <FormControl component="fieldset" sx={{ mb: 1, mt: 1 }}>
            <RadioGroup
              row
              value={childMode}
              onChange={(e) => {
                const mode = e.target.value
                updateChild({
                  attributionMode: mode,
                  attributionId: "",
                  attributionLabel: "",
                  dealerOrder: mode === "dealer",
                })
              }}
            >
              <FormControlLabel value="sales" control={<Radio size="small" />} label="Sales person" />
              <FormControlLabel value="dealer" control={<Radio size="small" />} label="Dealer" />
            </RadioGroup>
          </FormControl>
          <SearchableSelect
            label={childMode === "dealer" ? "Dealer for child order" : "Sales person for child order"}
            placeholder={childMode === "dealer" ? "Search dealer…" : "Search sales…"}
            items={options}
            value={child.attributionId || ""}
            onChange={(e) => {
              const val = e.target.value
              const opt = options.find((o) => o.value === val)
              updateChild({
                attributionId: val,
                attributionLabel: opt?.label || "",
              })
            }}
            onOpen={() => {
              if (childMode === "dealer") void loadDealers()
              else void loadSales()
            }}
          />
        </>
      )}

      <Alert severity="info" sx={{ mt: 1.5, py: 0.5, "& .MuiAlert-message": { fontSize: "0.8rem" } }}>
        Child will be booked under: <strong>{childSummaryLabel}</strong>
      </Alert>
    </Box>
  )
}
