import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Autocomplete,
  Paper,
  Alert,
  Collapse,
} from "@mui/material"
import {
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  Payments as PaymentsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material"
import moment from "moment"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { useHasPaymentAccess } from "utils/roleUtils"
import CommissionSettleDialog from "components/Modals/CommissionSettleDialog"
import {
  bulkDefaultCommissionRates,
  fetchCommissionRates,
  fetchDealerCommissionAnalysis,
  fetchDealerCommissionSettlements,
  formatInr,
  patchCommissionRate,
  syncCommissionRatesFromPlants,
} from "features/commission-management/commissionApi"

const C = {
  primary: "#5B5FC7",
  gradient: "linear-gradient(135deg, #5B5FC7 0%, #8B5CF6 100%)",
  green: "#22C55E",
  red: "#EF4444",
  orange: "#F59E0B",
  textSecondary: "#6B7185",
}

function SummaryCard({ label, value, color }) {
  return (
    <Card elevation={0} sx={{ border: "1px solid #E8EBF0", borderRadius: 2 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography sx={{ fontSize: "0.72rem", color: C.textSecondary, fontWeight: 600, mb: 0.5 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: color || "#1A1D2E" }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default function CommissionManagementPage() {
  const hasAccess = useHasPaymentAccess()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedDealerId = searchParams.get("dealerId")

  const [tab, setTab] = useState(preselectedDealerId ? 1 : 0)

  // Rates tab
  const [rates, setRates] = useState([])
  const [ratesLoading, setRatesLoading] = useState(false)
  const [rateDrafts, setRateDrafts] = useState({})
  const [ratesActionLoading, setRatesActionLoading] = useState(false)

  // Settlement tab
  const [dealers, setDealers] = useState([])
  const [selectedDealer, setSelectedDealer] = useState(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [analysis, setAnalysis] = useState(null)
  const [settlements, setSettlements] = useState([])
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)
  const [showPlants, setShowPlants] = useState(true)
  const [showVillages, setShowVillages] = useState(true)

  const loadRates = useCallback(async () => {
    setRatesLoading(true)
    try {
      const rows = await fetchCommissionRates()
      setRates(rows)
      const drafts = {}
      rows.forEach((r) => {
        drafts[r._id] = String(r.ratePerPlant ?? 1)
      })
      setRateDrafts(drafts)
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to load rates")
    } finally {
      setRatesLoading(false)
    }
  }, [])

  const loadDealers = useCallback(async () => {
    try {
      const res = await NetworkManager(API.USER.GET_DEALERS).request()
      const list = res?.data?.data
      setDealers(Array.isArray(list) ? list : [])
    } catch {
      setDealers([])
    }
  }, [])

  const loadAnalysis = useCallback(async () => {
    if (!selectedDealer?._id) return
    setAnalysisLoading(true)
    try {
      const [a, s] = await Promise.all([
        fetchDealerCommissionAnalysis(selectedDealer._id, { startDate, endDate }),
        fetchDealerCommissionSettlements(selectedDealer._id),
      ])
      setAnalysis(a)
      setSettlements(s)
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to load analysis")
      setAnalysis(null)
    } finally {
      setAnalysisLoading(false)
    }
  }, [selectedDealer, startDate, endDate])

  useEffect(() => {
    if (hasAccess) loadRates()
  }, [hasAccess, loadRates])

  useEffect(() => {
    if (hasAccess) loadDealers()
  }, [hasAccess, loadDealers])

  useEffect(() => {
    if (preselectedDealerId && dealers.length) {
      const match = dealers.find((d) => String(d._id) === String(preselectedDealerId))
      if (match) setSelectedDealer(match)
    }
  }, [preselectedDealerId, dealers])

  useEffect(() => {
    if (tab === 1 && selectedDealer?._id) loadAnalysis()
  }, [tab, selectedDealer, loadAnalysis])

  const handleSaveRate = async (row) => {
    const val = Number(rateDrafts[row._id])
    if (!Number.isFinite(val) || val < 0) {
      Toast.error("Invalid rate")
      return
    }
    try {
      await patchCommissionRate(row._id, { ratePerPlant: val })
      Toast.success("Rate updated")
      loadRates()
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Update failed")
    }
  }

  const handleSyncRates = async () => {
    setRatesActionLoading(true)
    try {
      const result = await syncCommissionRatesFromPlants()
      Toast.success(`Synced — ${result?.created || 0} new, ${result?.existing || 0} existing`)
      loadRates()
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Sync failed")
    } finally {
      setRatesActionLoading(false)
    }
  }

  const handleBulkDefault = async () => {
    setRatesActionLoading(true)
    try {
      const result = await bulkDefaultCommissionRates()
      Toast.success(`Set to ₹1 — updated ${result?.updated || 0}, skipped ${result?.skipped || 0}`)
      loadRates()
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Bulk update failed")
    } finally {
      setRatesActionLoading(false)
    }
  }

  const summary = analysis?.summary || {}
  const unsettled = analysis?.unsettled ?? 0
  const actualColor = summary.actualCommission < 0 ? C.red : C.green

  const groupedRates = useMemo(() => {
    const map = new Map()
    for (const row of rates) {
      const key = row.plantName || "Plant"
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(row)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [rates])

  if (!hasAccess) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">You do not have access to commission management.</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          background: C.gradient,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Commission Management
          </Typography>
          <Typography sx={{ opacity: 0.9, fontSize: "0.85rem" }}>
            Configure rates per plant/subtype and settle dealer commission to cash wallet
          </Typography>
        </Box>
        <IconButton color="inherit" onClick={() => (tab === 0 ? loadRates() : loadAnalysis())}>
          <RefreshIcon />
        </IconButton>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Commission rates" />
        <Tab label="Dealer settlement" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={ratesActionLoading ? <CircularProgress size={16} /> : <SyncIcon />}
              onClick={handleSyncRates}
              disabled={ratesActionLoading}
            >
              Sync from plants
            </Button>
            <Button
              variant="contained"
              onClick={handleBulkDefault}
              disabled={ratesActionLoading}
            >
              Set all to ₹1 (except Papaya 15 NOA / 15 R15)
            </Button>
          </Box>

          {ratesLoading ? (
            <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : rates.length === 0 ? (
            <Alert severity="info">No rates yet. Click &quot;Sync from plants&quot; to seed.</Alert>
          ) : (
            groupedRates.map(([plantName, rows]) => (
              <Card key={plantName} elevation={0} sx={{ mb: 2, border: "1px solid #E8EBF0" }}>
                <CardContent>
                  <Typography fontWeight={800} sx={{ mb: 1.5 }}>
                    {plantName}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Subtype</TableCell>
                          <TableCell align="right">₹/plant</TableCell>
                          <TableCell align="center">Active</TableCell>
                          <TableCell align="right">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row._id}>
                            <TableCell>{row.subtypeName}</TableCell>
                            <TableCell align="right" sx={{ width: 120 }}>
                              <TextField
                                size="small"
                                type="number"
                                inputProps={{ min: 0, step: 0.5 }}
                                value={rateDrafts[row._id] ?? ""}
                                onChange={(e) =>
                                  setRateDrafts((d) => ({ ...d, [row._id]: e.target.value }))
                                }
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={row.isActive !== false ? "Yes" : "No"}
                                color={row.isActive !== false ? "success" : "default"}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Button size="small" onClick={() => handleSaveRate(row)}>
                                Save
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <Autocomplete
                  options={dealers}
                  getOptionLabel={(o) => `${o.name || "Dealer"} (${o.phoneNumber || ""})`}
                  value={selectedDealer}
                  onChange={(_, v) => setSelectedDealer(v)}
                  renderInput={(params) => (
                    <TextField {...params} label="Dealer" size="small" />
                  )}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="From"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="To"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button variant="outlined" onClick={loadAnalysis} disabled={!selectedDealer || analysisLoading}>
                  Refresh analysis
                </Button>
                <Button
                  variant="contained"
                  sx={{ ml: 1 }}
                  startIcon={<PaymentsIcon />}
                  disabled={!selectedDealer || unsettled <= 0 || analysisLoading}
                  onClick={() => setSettleOpen(true)}
                >
                  Settle commission
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {analysisLoading ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : analysis ? (
            <>
              {summary.actualCommission < 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Completed orders stay negative until farmer payment is fully collected
                  (outstanding zero). Settlement is blocked until net unsettled amount is positive.
                </Alert>
              )}

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} md={3}>
                  <SummaryCard label="Expected" value={formatInr(summary.expectedCommission)} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <SummaryCard
                    label="Actual"
                    value={formatInr(summary.actualCommission)}
                    color={actualColor}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <SummaryCard label="Gap" value={formatInr(summary.gap)} color={C.orange} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <SummaryCard
                    label="Unsettled (payable)"
                    value={formatInr(unsettled)}
                    color={unsettled > 0 ? C.green : C.textSecondary}
                  />
                </Grid>
              </Grid>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                Already settled: {formatInr(analysis.alreadySettled || 0)} · Farmer payment outstanding:{" "}
                {formatInr(summary.totalPaymentOutstanding || 0)} · Accepted orders:{" "}
                {summary.acceptedOrders || 0} · Dispatched plants:{" "}
                {(summary.dispatchedPlants || 0).toLocaleString()}
              </Typography>

              <Card elevation={0} sx={{ mb: 2, border: "1px solid #E8EBF0" }}>
                <CardContent>
                  <Box
                    sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                    onClick={() => setShowPlants((v) => !v)}
                  >
                    <Typography fontWeight={700} sx={{ flex: 1 }}>
                      Plant summary
                    </Typography>
                    {showPlants ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                  <Collapse in={showPlants}>
                    <TableContainer sx={{ mt: 1 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Plant / Subtype</TableCell>
                            <TableCell align="right">Booked</TableCell>
                            <TableCell align="right">Baki</TableCell>
                            <TableCell align="right">Dispatched</TableCell>
                            <TableCell align="right">Rate</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(analysis.byPlantType || []).flatMap((p) =>
                            (p.subtypes || []).map((st) => (
                              <TableRow key={`${p.plantId}-${st.subtypeId}`}>
                                <TableCell>
                                  {p.plantName} · {st.subtypeName}
                                </TableCell>
                                <TableCell align="right">{st.booked?.toLocaleString()}</TableCell>
                                <TableCell align="right">{st.baki?.toLocaleString()}</TableCell>
                                <TableCell align="right">{st.dispatched?.toLocaleString()}</TableCell>
                                <TableCell align="right">₹{st.ratePerPlant}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ mb: 2, border: "1px solid #E8EBF0" }}>
                <CardContent>
                  <Box
                    sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                    onClick={() => setShowVillages((v) => !v)}
                  >
                    <Typography fontWeight={700} sx={{ flex: 1 }}>
                      By village
                    </Typography>
                    {showVillages ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                  <Collapse in={showVillages}>
                    <TableContainer sx={{ mt: 1 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Village</TableCell>
                            <TableCell align="right">Booked</TableCell>
                            <TableCell align="right">Dispatched</TableCell>
                            <TableCell align="right">Expected ₹</TableCell>
                            <TableCell align="right">Actual ₹</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(analysis.byVillage || []).map((v) => (
                            <TableRow key={v.village}>
                              <TableCell>{v.village}</TableCell>
                              <TableCell align="right">{v.booked?.toLocaleString()}</TableCell>
                              <TableCell align="right">{v.dispatched?.toLocaleString()}</TableCell>
                              <TableCell align="right">{formatInr(v.expectedCommission)}</TableCell>
                              <TableCell
                                align="right"
                                sx={{ color: v.actualCommission < 0 ? C.red : undefined }}
                              >
                                {formatInr(v.actualCommission)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </CardContent>
              </Card>

              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Settlement history
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Remark</TableCell>
                      <TableCell align="right">Wallet after</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {settlements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No settlements yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      settlements.map((s) => (
                        <TableRow key={s._id}>
                          <TableCell>
                            {s.createdAt ? moment(s.createdAt).format("DD MMM YYYY, hh:mm A") : "—"}
                          </TableCell>
                          <TableCell align="right">{formatInr(s.settledAmount ?? s.amount)}</TableCell>
                          <TableCell>{s.remark || "—"}</TableCell>
                          <TableCell align="right">
                            {formatInr(s.walletBalanceAfter)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedDealer?._id && (
                <Button
                  sx={{ mt: 2 }}
                  size="small"
                  onClick={() => navigate(`/u/dealers/${selectedDealer._id}?tab=ledger`)}
                >
                  Open dealer wallet & ledger
                </Button>
              )}
            </>
          ) : selectedDealer ? (
            <Alert severity="info">No analysis data. Click Refresh analysis.</Alert>
          ) : (
            <Alert severity="info">Select a dealer to view commission analysis.</Alert>
          )}
        </Box>
      )}

      <CommissionSettleDialog
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        onSuccess={loadAnalysis}
        dealer={selectedDealer}
        unsettled={unsettled}
        totalPaymentOutstanding={analysis?.summary?.totalPaymentOutstanding ?? 0}
        actualCommission={summary.actualCommission ?? 0}
        alreadySettled={analysis?.alreadySettled ?? 0}
        startDate={startDate}
        endDate={endDate}
      />
    </Container>
  )
}
