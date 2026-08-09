import React, { useCallback, useEffect, useState } from "react"
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { useUserData, useHasAgriPaymentCollectAccess } from "utils/roleUtils"
import { fetchAgriOrderPayments } from "features/accountant-dashboard/paymentsApi"

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`
}

function paymentIndexFromRow(row) {
  const raw = row.__raw || row
  if (raw.paymentIndex !== undefined) return raw.paymentIndex
  if (row.paymentIndex !== undefined) return row.paymentIndex
  return 0
}

function orderMongoIdFromRow(row) {
  const raw = row.__raw || row
  return raw._id || row._id
}

/**
 * Ram Agri Input pending + collected payments — collect / cancel collect for Master / accountant / super.
 */
export default function AgriPendingPaymentsTab() {
  const user = useUserData()
  const canCollect = useHasAgriPaymentCollectAccess()
  const [tab, setTab] = useState("pending")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const paymentStatusFilter = tab === "collected" ? "COLLECTED" : "PENDING"
      const { rows: list } = await fetchAgriOrderPayments({
        debouncedSearchTerm: "",
        page: 1,
        rowsPerPage: 100,
        startDate: null,
        endDate: null,
        paymentStatusFilter,
        isOld: "false",
      })
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      setRows([])
      Toast.error(e?.message || "Failed to load agri payments")
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const patchPaymentStatus = async (row, paymentStatus) => {
    if (!canCollect) return
    const orderMongoId = orderMongoIdFromRow(row)
    const paymentIndex = paymentIndexFromRow(row)
    const key = `${orderMongoId}:${paymentIndex}`
    setBusyKey(key)
    try {
      const instance = NetworkManager(
        API.INVENTORY.UPDATE_AGRI_SALES_ORDER_PAYMENT_STATUS
      )
      await instance.request(
        { paymentStatus },
        [`${orderMongoId}/payment/${paymentIndex}/status`]
      )
      Toast.success(
        paymentStatus === "COLLECTED"
          ? "Payment marked collected"
          : "Collection cancelled — payment pending again"
      )
      await load()
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to update payment")
    } finally {
      setBusyKey("")
    }
  }

  if (!canCollect) {
    return (
      <Typography color="text.secondary">
        Only Ram Agri Input Master (or accountant/super admin) can collect agri
        payments.
      </Typography>
    )
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Ram Agri Input order payments only. Signed in as{" "}
        {user?.jobTitle || user?.role || "user"}.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 700 } }}
      >
        <Tab value="pending" label="Pending" />
        <Tab value="collected" label="Collected" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : !rows.length ? (
        <Typography color="text.secondary">
          {tab === "pending"
            ? "No pending Ram Agri Input payments."
            : "No collected Ram Agri Input payments."}
        </Typography>
      ) : (
        rows.map((row, idx) => {
          const raw = row.__raw || row
          const orderMongoId = orderMongoIdFromRow(row)
          const paymentIndex = paymentIndexFromRow(row)
          const key = row.id || `${orderMongoId}:${paymentIndex}`
          const amount = row.payment?.paidAmount ?? raw.payment?.paidAmount
          const name = row.farmer?.name || raw.customerName || "Customer"
          const mobile = row.farmer?.mobileNumber || raw.customerMobile || ""
          const isPending = tab === "pending"
          return (
            <Paper key={`${key}-${idx}`} variant="outlined" sx={{ p: 1.5 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                gap={1}
                alignItems={{ sm: "center" }}
              >
                <Box minWidth={0}>
                  <Typography fontWeight={800} noWrap>
                    #{row.orderId || raw.orderNumber || orderMongoId} · {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {mobile} · {fmtMoney(amount)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    label={isPending ? "PENDING" : "COLLECTED"}
                    color={isPending ? "warning" : "success"}
                  />
                  {isPending ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={busyKey === key}
                      onClick={() => patchPaymentStatus(row, "COLLECTED")}
                      sx={{ textTransform: "none", fontWeight: 800 }}
                    >
                      {busyKey === key ? "Saving…" : "Collect"}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      disabled={busyKey === key}
                      onClick={() => patchPaymentStatus(row, "PENDING")}
                      sx={{ textTransform: "none", fontWeight: 800 }}
                    >
                      {busyKey === key ? "Saving…" : "Cancel collect"}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          )
        })
      )}
    </Stack>
  )
}
