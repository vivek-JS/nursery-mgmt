import React, { useEffect, useState } from "react"
import moment from "moment"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  CircularProgress,
  Box,
  Typography
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

const emptyForm = () => ({
  amount: "",
  paymentDate: moment().format("YYYY-MM-DD"),
  modeOfPayment: "",
  bankName: "",
  transactionId: "",
  remark: ""
})

/**
 * Credit a dealer's cash wallet without creating an order (accountant / super admin).
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} [props.onSuccess]
 * @param {{ _id: string, name?: string, phoneNumber?: string } | null} [props.initialDealer] — pre-select row from dealer table
 */
export default function DealerWalletCreditDialog({ open, onClose, onSuccess, initialDealer = null }) {
  const [dealers, setDealers] = useState([])
  const [loadingDealers, setLoadingDealers] = useState(false)
  const [selectedDealer, setSelectedDealer] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(emptyForm())
    setSelectedDealer(initialDealer || null)
  }, [open, initialDealer])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingDealers(true)
    const instance = NetworkManager(API.USER.GET_DEALERS)
    instance
      .request()
      .then((res) => {
        if (cancelled) return
        const list = res?.data?.data
        setDealers(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) {
          setDealers([])
          Toast.error("Failed to load dealers")
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDealers(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const handleSubmit = async () => {
    const dealerId = selectedDealer?._id
    if (!dealerId) {
      Toast.error("Select a dealer")
      return
    }
    const amt = Number(form.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      Toast.error("Enter a valid amount")
      return
    }
    if (!form.modeOfPayment) {
      Toast.error("Select payment mode")
      return
    }

    setSubmitting(true)
    try {
      const instance = NetworkManager(API.USER.POST_DEALER_WALLET_CREDIT)
      const res = await instance.request(
        {
          amount: amt,
          paymentDate: form.paymentDate || undefined,
          modeOfPayment: form.modeOfPayment,
          bankName: form.bankName || "",
          transactionId: form.transactionId || "",
          remark: form.remark || ""
        },
        { pathParams: [dealerId] }
      )
      const msg = res?.data?.message || "Wallet credited"
      Toast.success(msg)
      onSuccess?.()
      onClose()
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to credit wallet")
    } finally {
      setSubmitting(false)
    }
  }

  const lockDealer = Boolean(initialDealer?._id)

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Credit dealer wallet (no order)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Adds to the dealer cash balance immediately, same as a collected bulk payment, without linking to an order.
        </Typography>

        {loadingDealers && dealers.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Autocomplete
            options={
              selectedDealer && !dealers.some((d) => d._id === selectedDealer._id)
                ? [selectedDealer, ...dealers]
                : dealers
            }
            disabled={lockDealer}
            loading={loadingDealers}
            getOptionLabel={(o) =>
              o?.name ? `${o.name}${o.phoneNumber ? ` · ${o.phoneNumber}` : ""}` : ""
            }
            isOptionEqualToValue={(a, b) => a?._id === b?._id}
            value={selectedDealer}
            onChange={(_, v) => setSelectedDealer(v)}
            renderInput={(params) => (
              <TextField {...params} label="Dealer" margin="normal" required placeholder="Search by name" />
            )}
            sx={{ mb: 1 }}
          />
        )}

        <TextField
          fullWidth
          margin="normal"
          label="Amount (₹)"
          type="number"
          required
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          inputProps={{ min: 1, step: 1 }}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Payment date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={form.paymentDate}
          onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))}
        />
        <TextField
          fullWidth
          margin="normal"
          select
          label="Payment mode"
          required
          SelectProps={{ native: true }}
          value={form.modeOfPayment}
          onChange={(e) => setForm((p) => ({ ...p, modeOfPayment: e.target.value }))}>
          <option value="">Select mode</option>
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Cheque">Cheque</option>
          <option value="NEFT/RTGS">NEFT/RTGS</option>
          <option value="1341">1341</option>
          <option value="434">434</option>
        </TextField>
        <TextField
          fullWidth
          margin="normal"
          label="Bank name"
          value={form.bankName}
          onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
          disabled={form.modeOfPayment !== "Cheque" && form.modeOfPayment !== "NEFT/RTGS"}
          placeholder={
            form.modeOfPayment === "Cheque" || form.modeOfPayment === "NEFT/RTGS"
              ? "Bank name"
              : "N/A for this mode"
          }
        />
        <TextField
          fullWidth
          margin="normal"
          label="Transaction / UTR (optional)"
          value={form.transactionId}
          onChange={(e) => setForm((p) => ({ ...p, transactionId: e.target.value }))}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Remark (optional)"
          value={form.remark}
          onChange={(e) => setForm((p) => ({ ...p, remark: e.target.value }))}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <CircularProgress size={22} /> : "Credit wallet"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
