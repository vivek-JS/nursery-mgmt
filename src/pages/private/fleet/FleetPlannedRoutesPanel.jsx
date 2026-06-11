import React, { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CircularProgress } from "@mui/material"
import { NetworkManager, API } from "network/core"

const statusClass = (s) => {
  const m = {
    DRAFT: "bg-slate-100 text-slate-700",
    LOCKED: "bg-amber-100 text-amber-800",
    DISPATCHED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-red-100 text-red-700",
  }
  return m[s] || "bg-slate-100 text-slate-700"
}

export default function FleetPlannedRoutesPanel() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("active")

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const inst = NetworkManager(API.READY_DISPATCH_GROUP.GET_ALL)
      const params =
        statusFilter === "active"
          ? {}
          : statusFilter === "all"
            ? {}
            : { status: statusFilter }
      const res = await inst.request({}, params)
      let list = Array.isArray(res?.data?.data) ? res.data.data : []
      if (statusFilter === "active") {
        list = list.filter((g) => g.status === "DRAFT" || g.status === "LOCKED")
      }
      setGroups(list)
    } catch (e) {
      console.error(e)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <option value="active">Active (draft / locked)</option>
          <option value="DRAFT">Draft only</option>
          <option value="LOCKED">Locked only</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="all">All</option>
        </select>
        <button
          type="button"
          onClick={fetchGroups}
          className="text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          Refresh
        </button>
        <Link
          to="/u/dispatch-orders"
          className="text-sm text-indigo-600 hover:underline ml-auto">
          Plan routes on dispatch board →
        </Link>
      </div>

      <p className="text-sm text-slate-600">
        Routes assigned from the map planner before dispatch. Each group lists orders with vehicle and driver.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <CircularProgress size={32} />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-500 text-sm">
          No route groups for this filter. Use Dispatch Orders → map to assign vehicle and driver to ready orders.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <article
              key={g._id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-mono text-xs text-indigo-600">{g.groupCode}</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {g.totalPlants?.toLocaleString("en-IN")} plants · {(g.orderIds || []).length} orders
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusClass(g.status)}`}>
                  {g.status}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm mb-3">
                <div>
                  <dt className="text-xs text-slate-500">Owner</dt>
                  <dd>{g.ownerId?.name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Vehicle</dt>
                  <dd>
                    {[g.vehicleNumber, g.vehicleName].filter(Boolean).join(" · ") ||
                      g.vehicleId?.number ||
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Driver</dt>
                  <dd>{g.driverName || g.driverId?.name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Route</dt>
                  <dd className="truncate">{g.routeId || g.routeNotes || "—"}</dd>
                </div>
              </dl>

              {(g.orderIds || []).length > 0 && (
                <ul className="text-xs text-slate-600 border-t border-slate-100 pt-2 space-y-1 max-h-28 overflow-y-auto">
                  {g.orderIds.map((o) => (
                    <li key={o._id}>
                      <span className="font-mono font-medium">#{o.orderId}</span>
                      {o.farmer?.name ? ` — ${o.farmer.name}` : ""}
                      {o.farmer?.village ? ` (${o.farmer.village})` : ""}
                    </li>
                  ))}
                </ul>
              )}

              {g.convertedDispatchId?.transportId && (
                <p className="text-xs text-emerald-700 mt-2">
                  Dispatched as {g.convertedDispatchId.transportId}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
