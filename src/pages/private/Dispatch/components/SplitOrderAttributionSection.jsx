import React, { useEffect, useState } from "react"
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
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
  }, [order?._id, order?.details?.orderid, order?.orderId])

  useEffect(() => {
    if (value?.attributionMode === "dealer") {
      void loadDealers()
    } else if (value?.attributionMode === "sales") {
      void loadSales()
    }
  }, [value?.attributionMode])

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

  if (!value) return null

  const options = value.attributionMode === "dealer" ? dealers : sales

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Booked by (child order)
      </Typography>
      <FormControl component="fieldset" sx={{ mb: 1 }}>
        <RadioGroup
          row
          value={value.attributionMode}
          onChange={(e) => {
            const mode = e.target.value
            onChange({
              ...value,
              attributionMode: mode,
              attributionId: "",
              dealerOrder: mode === "dealer",
            })
          }}
        >
          <FormControlLabel value="sales" control={<Radio size="small" />} label="Sales person" />
          <FormControlLabel value="dealer" control={<Radio size="small" />} label="Dealer" />
        </RadioGroup>
      </FormControl>
      <SearchableSelect
        label={value.attributionMode === "dealer" ? "Dealer" : "Sales person"}
        placeholder={value.attributionMode === "dealer" ? "Search dealer…" : "Search sales…"}
        options={options}
        value={value.attributionId || ""}
        onChange={(val) => onChange({ ...value, attributionId: val })}
        onOpen={() => {
          if (value.attributionMode === "dealer") void loadDealers()
          else void loadSales()
        }}
      />
    </Box>
  )
}
