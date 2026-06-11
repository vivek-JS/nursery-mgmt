import React, { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Drawer,
  TablePagination,
  TextField,
  MenuItem,
  IconButton,
  CircularProgress,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
]

const statusClass = (s) => {
  const m = {
    PENDING: "bg-amber-100 text-amber-800",
    IN_TRANSIT: "bg-sky-100 text-sky-800",
    DELIVERED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-slate-100 text-slate-600",
  }
  return m[s] || "bg-slate-100 text-slate-700"
}

const fmtMoney = (n) =>
  n == null || Number.isNaN(Number(n)) ? "—" : `₹${Number(n).toLocaleString("en-IN")}`

const fmtDate = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—")

export default function FleetLedgerTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(15)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")
  const [transportStatus, setTransportStatus] = useState("")

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tripForm, setTripForm] = useState({ kmRun: "", rent: "", otherCharges: "", tripRemark: "" })
  const [savingTrip, setSavingTrip] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchLedger = useCallback(async () => {
    setLoading(true)
    try {
      const inst = NetworkManager(API.FLEET.GET_LEDGER)
      const res = await inst.request(
        {},
        {
          page: page + 1,
          limit: rowsPerPage,
          search: searchDebounced || undefined,
          transportStatus: transportStatus || undefined,
        }
      )
      const payload = res?.data?.data
      setRows(Array.isArray(payload?.data) ? payload.data : [])
      setTotal(Number(payload?.pagination?.total) || 0)
    } catch (e) {
      console.error(e)
      Toast.error(e?.message || "Could not load fleet ledger")
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, searchDebounced, transportStatus])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  const openDetail = async (dispatchId) => {
    setDrawerOpen(true)
    setDetailLoading(true)
    setDetail(null)
    try {
      const inst = NetworkManager(API.FLEET.GET_LEDGER_DETAIL)
      const res = await inst.request({}, { pathParams: [String(dispatchId)] })
      const d = res?.data?.data
      setDetail(d)
      const trip = d?.trip
      setTripForm({
        kmRun: trip?.kmRun != null ? String(trip.kmRun) : "",
        rent: trip?.rent != null ? String(trip.rent) : "",
        otherCharges: trip?.otherCharges != null ? String(trip.otherCharges) : "",
        tripRemark: trip?.tripRemark || "",
      })
    } catch (e) {
      Toast.error(e?.message || "Could not load dispatch details")
      setDrawerOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const saveTripCosts = async () => {
    if (!detail?.trip?._id) {
      Toast.error("No trip record for this dispatch yet. Complete dispatch with km/rent first.")
      return
    }
    setSavingTrip(true)
    try {
      const inst = NetworkManager(API.TRIP.UPDATE_TRIP)
      await inst.request(
        {
          kmRun: tripForm.kmRun !== "" ? Number(tripForm.kmRun) : null,
          rent: tripForm.rent !== "" ? Number(tripForm.rent) : null,
          otherCharges: tripForm.otherCharges !== "" ? Number(tripForm.otherCharges) : null,
          tripRemark: tripForm.tripRemark || "",
        },
        { pathParams: [String(detail.trip._id)] }
      )
      Toast.success("Trip costs updated")
      await openDetail(detail.dispatchId)
      fetchLedger()
    } catch (e) {
      Toast.error(e?.message || "Failed to update trip")
    } finally {
      setSavingTrip(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <TextField
          size="small"
          label="Search transport, vehicle, driver…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="min-w-[220px] flex-1"
        />
        <TextField
          select
          size="small"
          label="Status"
          value={transportStatus}
          onChange={(e) => {
            setTransportStatus(e.target.value)
            setPage(0)
          }}
          className="min-w-[160px]">
          {STATUS_OPTIONS.map((o) => (
            <MenuItem key={o.value || "all"} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <button
          type="button"
          onClick={fetchLedger}
          disabled={loading}
          className="text-sm px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Transport</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Vehicle</th>
                <th className="px-4 py-2.5">Driver</th>
                <th className="px-4 py-2.5">Orders</th>
                <th className="px-4 py-2.5">KM</th>
                <th className="px-4 py-2.5">Vehicle cost</th>
                <th className="px-4 py-2.5">Customer freight</th>
                <th className="px-4 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <CircularProgress size={28} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    No dispatches found. Assign vehicles when dispatching or from the map planner.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.dispatchId}
                    className="hover:bg-indigo-50/40 cursor-pointer"
                    onClick={() => openDetail(r.dispatchId)}>
                    <td className="px-4 py-2.5 font-mono text-xs font-medium text-indigo-700">
                      {r.transportId || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(r.transportStatus)}`}>
                        {r.transportStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{r.owner?.name || "—"}</td>
                    <td className="px-4 py-2.5">
                      {[r.vehicle?.number, r.vehicle?.name].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2.5">{r.driver?.name || "—"}</td>
                    <td className="px-4 py-2.5">{r.orderCount}</td>
                    <td className="px-4 py-2.5">
                      {r.trip?.kmRun != null ? `${r.trip.kmRun} km` : "—"}
                    </td>
                    <td className="px-4 py-2.5">{fmtMoney(r.vehicleCostTotal)}</td>
                    <td className="px-4 py-2.5">{fmtMoney(r.freightTotal)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(r.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={[10, 15, 25, 50]}
        />
      </div>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="w-full sm:w-[480px] max-w-[100vw] h-full flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Dispatch & trip</h2>
              {detail?.transportId && (
                <p className="text-xs font-mono text-indigo-600 mt-0.5">{detail.transportId}</p>
              )}
            </div>
            <IconButton onClick={() => setDrawerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {detailLoading ? (
              <div className="flex justify-center py-16">
                <CircularProgress />
              </div>
            ) : detail ? (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(detail.transportStatus)}`}>
                    {detail.transportStatus}
                  </span>
                  {detail.trip?.tripNumber && (
                    <span className="text-xs text-slate-500">Trip {detail.trip.tripNumber}</span>
                  )}
                  <Link
                    to="/u/dispatch-orders"
                    className="ml-auto text-xs text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                    onClick={() => setDrawerOpen(false)}>
                    Dispatch board <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Link>
                </div>

                <section className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">Fleet assignment</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-slate-500 text-xs">Owner</dt>
                      <dd>{detail.owner?.name || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-xs">Owner mobile</dt>
                      <dd>{detail.owner?.mobile || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-xs">Vehicle</dt>
                      <dd>
                        {[detail.vehicle?.number, detail.vehicle?.name].filter(Boolean).join(" — ") || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-xs">Driver</dt>
                      <dd>
                        {detail.driver?.name || "—"}
                        {detail.driver?.mobile ? ` (${detail.driver.mobile})` : ""}
                      </dd>
                    </div>
                  </dl>
                  {detail.routeNotes && (
                    <p className="text-sm text-slate-600">
                      <span className="text-slate-500">Route notes:</span> {detail.routeNotes}
                    </p>
                  )}
                  {(detail.driverRemark || detail.vehicleRemark) && (
                    <div className="text-xs text-slate-500 space-y-1">
                      {detail.driverRemark && <p>Driver remark: {detail.driverRemark}</p>}
                      {detail.vehicleRemark && <p>Vehicle remark: {detail.vehicleRemark}</p>}
                    </div>
                  )}
                </section>

                <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-violet-800">Trip settlement (vehicle cost)</h3>
                  {detail.trip ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <TextField
                          size="small"
                          label="KM run"
                          type="number"
                          value={tripForm.kmRun}
                          onChange={(e) => setTripForm((p) => ({ ...p, kmRun: e.target.value }))}
                        />
                        <TextField
                          size="small"
                          label="Rent (₹)"
                          type="number"
                          value={tripForm.rent}
                          onChange={(e) => setTripForm((p) => ({ ...p, rent: e.target.value }))}
                        />
                        <TextField
                          size="small"
                          label="Other charges (₹)"
                          type="number"
                          value={tripForm.otherCharges}
                          onChange={(e) => setTripForm((p) => ({ ...p, otherCharges: e.target.value }))}
                          className="col-span-2"
                        />
                        <TextField
                          size="small"
                          label="Remark"
                          value={tripForm.tripRemark}
                          onChange={(e) => setTripForm((p) => ({ ...p, tripRemark: e.target.value }))}
                          className="col-span-2"
                          multiline
                          minRows={2}
                        />
                      </div>
                      <p className="text-sm font-medium text-violet-900">
                        Total vehicle cost: {fmtMoney(detail.trip.vehicleCostTotal)}
                      </p>
                      <button
                        type="button"
                        disabled={savingTrip}
                        onClick={saveTripCosts}
                        className="text-sm px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                        {savingTrip ? "Saving…" : "Save trip costs"}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-violet-800/80">
                      No trip record yet. Enter km/rent when completing dispatch on the orders screen, or they will
                      appear here after delivery complete.
                    </p>
                  )}
                </section>

                <section className="rounded-lg border border-slate-200 p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-semibold uppercase text-slate-500">Orders on this transport</h3>
                    <span className="text-xs text-slate-500">
                      Freight total: {fmtMoney(detail.freightTotal)}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {(detail.orders || []).map((o) => (
                      <li key={o._id} className="py-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="font-mono font-medium text-slate-800">#{o.orderId}</span>
                          <span className="text-xs text-slate-500">{o.orderStatus}</span>
                        </div>
                        <div className="text-slate-600 text-xs mt-0.5">
                          {o.farmerName}
                          {o.village ? ` · ${o.village}` : ""} · {o.numberOfPlants} plants
                        </div>
                        <div className="text-xs text-emerald-700 mt-0.5">
                          Customer freight: {fmtMoney(o.freightCharges)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : null}
          </div>
        </div>
      </Drawer>
    </div>
  )
}
