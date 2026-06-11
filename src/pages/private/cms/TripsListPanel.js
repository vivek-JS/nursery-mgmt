import React, { useState, useEffect, useCallback } from "react"
import { NetworkManager, API } from "network/core"
import { TablePagination } from "@mui/material"

const TripsListPanel = () => {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    try {
      const inst = NetworkManager(API.TRIP.GET_TRIPS)
      const res = await inst.request(
        {},
        { page: page + 1, limit: rowsPerPage, sortKey: "startDate", sortOrder: "desc" }
      )
      const payload = res?.data?.data
      const rows = Array.isArray(payload?.data) ? payload.data : []
      setTrips(rows)
      setTotal(Number(payload?.pagination?.total) || rows.length)
    } catch (e) {
      console.error("Error loading trips:", e)
      setTrips([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Recent trips</h3>
          <p className="text-xs text-slate-500 mt-0.5">Km, rent, and charges recorded at dispatch completion</p>
        </div>
        <button
          type="button"
          onClick={fetchTrips}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Trip #</th>
              <th className="px-4 py-2">Vehicle</th>
              <th className="px-4 py-2">Driver</th>
              <th className="px-4 py-2">KM</th>
              <th className="px-4 py-2">Rent</th>
              <th className="px-4 py-2">Other</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && trips.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : trips.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No trips recorded yet. Complete a dispatch with km/rent to see entries here.
                </td>
              </tr>
            ) : (
              trips.map((t) => (
                <tr key={t._id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2 font-mono text-xs">{t.tripNumber || "—"}</td>
                  <td className="px-4 py-2">
                    {[t.vehicleNumber, t.vehicleName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-2">{t.driverName || "—"}</td>
                  <td className="px-4 py-2">{t.kmRun != null ? `${t.kmRun} km` : "—"}</td>
                  <td className="px-4 py-2">{t.rent != null ? `₹${t.rent}` : "—"}</td>
                  <td className="px-4 py-2">{t.otherCharges != null ? `₹${t.otherCharges}` : "—"}</td>
                  <td className="px-4 py-2 capitalize">{t.status || "—"}</td>
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
        rowsPerPageOptions={[5, 10, 25]}
      />
    </div>
  )
}

export default TripsListPanel
