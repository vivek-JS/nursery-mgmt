import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  MapPin,
  Search,
  Users,
  User,
  Loader2,
} from "lucide-react"
import moment from "moment"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`

const fmtK = (n) => {
  const v = Number(n || 0)
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`
  return fmt(v)
}

const statusChip = (status) => {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800"
    case "ACCEPTED":
      return "bg-green-100 text-green-800"
    case "DISPATCHED":
      return "bg-blue-100 text-blue-800"
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800"
    default:
      return "bg-gray-100 text-gray-600"
  }
}

const GeoTile = ({ label, title, amount, orders, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-brand-400 hover:shadow-md transition-all min-w-[140px]"
  >
    <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{label}</p>
    <p className="mt-1 text-sm font-semibold text-gray-900 break-words min-h-[40px]">{title || "Unknown"}</p>
    <p className="mt-2 text-lg font-bold text-red-600">{fmtK(amount)}</p>
    <p className="text-xs text-gray-500">{orders || 0} orders</p>
  </button>
)

/**
 * Ram Agri Input outstanding: Sales · Villages · Farmers
 */
export default function RamAgriOutstandingPanel({
  dateRange = {},
  canViewBySales = false,
  userId = null,
}) {
  const defaultMode = canViewBySales ? "sales" : "villages"
  const [mode, setMode] = useState(defaultMode)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [farmers, setFarmers] = useState([])
  const [geoView, setGeoView] = useState("total")
  const [selectedSalesman, setSelectedSalesman] = useState(null)
  const [expandedFarmer, setExpandedFarmer] = useState(null)
  const [farmerSearch, setFarmerSearch] = useState("")
  const [villageOrders, setVillageOrders] = useState(null)
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    if (!canViewBySales && mode === "sales") setMode("villages")
  }, [canViewBySales, mode])

  const dateParams = useMemo(() => {
    const params = { isOld: "false" }
    if (dateRange?.startDate && dateRange?.endDate) {
      params.startDate = dateRange.startDate
      params.endDate = dateRange.endDate
    }
    return params
  }, [dateRange?.startDate, dateRange?.endDate])

  const analysisParams = useCallback(
    (extra = {}) => {
      const params = { ...dateParams, ...extra }
      if (selectedSalesman?._id) params.createdBy = String(selectedSalesman._id)
      else if (!canViewBySales && userId) params.createdBy = String(userId)
      return params
    },
    [dateParams, selectedSalesman, canViewBySales, userId]
  )

  const fetchAnalysis = useCallback(async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_OUTSTANDING_ANALYSIS)
      const response = await instance.request({}, analysisParams())
      if (response?.data?.status === "Success" || response?.data?.success) {
        setData(response.data.data || null)
      } else {
        setData(null)
      }
    } catch (err) {
      console.error(err)
      Toast.error("Failed to load outstanding analysis")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [analysisParams])

  const fetchFarmers = useCallback(async () => {
    setLoading(true)
    try {
      if (canViewBySales) {
        const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_CUSTOMER_OUTSTANDING)
        const params = { ...dateParams }
        if (selectedSalesman?._id) params.createdBy = String(selectedSalesman._id)
        const response = await instance.request({}, params)
        const rows = response?.data?.data?.data || response?.data?.data || []
        const mapped = (Array.isArray(rows) ? rows : []).map((row) => ({
          customerName: row?._id?.customerName || row.customerName,
          customerMobile: row?._id?.customerMobile || row.customerMobile,
          customerVillage: row.customerVillage,
          customerTaluka: row.customerTaluka,
          customerDistrict: row.customerDistrict,
          totalOutstanding: row.totalOutstanding,
          totalOrders: row.totalOrders,
          orders: (row.orders || []).map((o) => ({
            ...o,
            _id: o._id || o.orderNumber,
          })),
        }))
        setFarmers(mapped.sort((a, b) => (b.totalOutstanding || 0) - (a.totalOutstanding || 0)))
      } else {
        const instance = NetworkManager(API.INVENTORY.GET_OUTSTANDING_AGRI_SALES_ORDERS)
        const params = { page: 1, limit: 1000, sortBy: "balanceAmount", sortOrder: "desc", isOld: "false" }
        if (userId) params.createdBy = String(userId)
        const response = await instance.request({}, params)
        const orders = response?.data?.data?.data || []
        const map = {}
        ;(Array.isArray(orders) ? orders : []).forEach((order) => {
          const bal =
            order.balanceAmount != null
              ? Number(order.balanceAmount)
              : Number(order.totalAmount || 0) - Number(order.totalPaidAmount || 0)
          if (bal <= 0) return
          const key = order.customerMobile || order.customerName
          if (!map[key]) {
            map[key] = {
              customerName: order.customerName,
              customerMobile: order.customerMobile,
              customerVillage: order.customerVillage,
              customerTaluka: order.customerTaluka,
              customerDistrict: order.customerDistrict,
              totalOutstanding: 0,
              totalOrders: 0,
              orders: [],
            }
          }
          map[key].totalOutstanding += bal
          map[key].totalOrders += 1
          map[key].orders.push({ ...order, balanceAmount: bal })
        })
        setFarmers(Object.values(map).sort((a, b) => b.totalOutstanding - a.totalOutstanding))
      }
    } catch (err) {
      console.error(err)
      Toast.error("Failed to load farmer outstanding")
      setFarmers([])
    } finally {
      setLoading(false)
    }
  }, [canViewBySales, dateParams, selectedSalesman, userId])

  useEffect(() => {
    setVillageOrders(null)
    if (mode === "farmers") fetchFarmers()
    else fetchAnalysis()
  }, [mode, fetchFarmers, fetchAnalysis])

  const loadVillageOrders = async (district, taluka, village) => {
    setOrdersLoading(true)
    try {
      const params = { page: 1, limit: 1000, ...dateParams }
      if (selectedSalesman?._id) params.createdBy = String(selectedSalesman._id)
      else if (!canViewBySales && userId) {
        params.myOrders = "true"
        params.createdBy = String(userId)
      }
      const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS)
      const response = await instance.request({}, params)
      const all = response?.data?.data?.data || []
      const filtered = (Array.isArray(all) ? all : []).filter(
        (o) =>
          o.customerDistrict === district &&
          o.customerTaluka === taluka &&
          o.customerVillage === village &&
          Number(o.balanceAmount || 0) > 0
      )
      setVillageOrders({
        label: `${district} → ${taluka} → ${village}`,
        rows: filtered.sort((a, b) => Number(b.balanceAmount || 0) - Number(a.balanceAmount || 0)),
      })
    } catch (err) {
      console.error(err)
      Toast.error("Failed to load village orders")
    } finally {
      setOrdersLoading(false)
    }
  }

  const total = data?.total || { totalOutstanding: 0, totalOrders: 0 }
  const salesmen = data?.bySalesmen || []
  const districts = data?.byDistrict || []
  const talukas = data?.byTaluka || []
  const villages = data?.byVillage || []

  const filteredFarmers = useMemo(() => {
    const q = farmerSearch.trim().toLowerCase()
    if (!q) return farmers
    return farmers.filter(
      (f) =>
        String(f.customerName || "")
          .toLowerCase()
          .includes(q) ||
        String(f.customerMobile || "").includes(q) ||
        String(f.customerVillage || "")
          .toLowerCase()
          .includes(q)
    )
  }, [farmers, farmerSearch])

  const farmerTotal = useMemo(
    () => filteredFarmers.reduce((s, f) => s + Number(f.totalOutstanding || 0), 0),
    [filteredFarmers]
  )

  const modes = [
    ...(canViewBySales ? [{ id: "sales", label: "By Sales", icon: Users }] : []),
    { id: "villages", label: "By Villages", icon: MapPin },
    { id: "farmers", label: "By Farmers", icon: User },
  ]

  const SummaryBanner = ({ amount, subtitle }) => (
    <div className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white p-5 mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-3xl font-bold">{fmt(amount)}</p>
        <p className="text-sm text-red-100 mt-1">{subtitle}</p>
      </div>
      {selectedSalesman && (
        <button
          type="button"
          onClick={() => {
            setSelectedSalesman(null)
            setGeoView("total")
            setVillageOrders(null)
          }}
          className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold hover:bg-white/30"
        >
          {selectedSalesman.salesmanName || "Sales"}
          <span className="opacity-80">×</span>
        </button>
      )}
    </div>
  )

  const renderSales = () => {
    if (!salesmen.length) {
      return (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          No salesman outstanding found for this period
        </div>
      )
    }
    return (
      <div>
        <SummaryBanner
          amount={total.totalOutstanding}
          subtitle={`${total.totalOrders || 0} orders · ${salesmen.length} sales people`}
        />
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales person</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesmen.map((s) => (
                <tr
                  key={String(s._id)}
                  className="hover:bg-orange-50/60 cursor-pointer"
                  onClick={() => {
                    setSelectedSalesman({
                      _id: s._id,
                      salesmanName: s.salesmanName,
                      salesmanPhone: s.salesmanPhone,
                    })
                    setGeoView("district")
                    setMode("villages")
                    setVillageOrders(null)
                  }}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {s.salesmanName || "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.salesmanPhone || "—"}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{s.totalOrders || 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                    {fmt(s.totalOutstanding)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                      Villages <ChevronRight className="w-4 h-4" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderVillages = () => {
    if (villageOrders) {
      return (
        <div>
          <button
            type="button"
            onClick={() => setVillageOrders(null)}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-brand-600"
          >
            <ArrowLeft className="w-4 h-4" /> Back to villages
          </button>
          <SummaryBanner
            amount={villageOrders.rows.reduce((s, o) => s + Number(o.balanceAmount || 0), 0)}
            subtitle={`${villageOrders.label} · ${villageOrders.rows.length} orders`}
          />
          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {villageOrders.rows.map((o) => (
                    <tr key={o._id || o.orderNumber}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.orderNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {o.customerName}
                        <div className="text-xs text-gray-400">{o.customerMobile}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusChip(o.orderStatus)}`}>
                          {o.orderStatus || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{fmt(o.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-700">{fmt(o.totalPaidAmount)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{fmt(o.balanceAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )
    }

    if (geoView === "total") {
      return (
        <div>
          <SummaryBanner
            amount={total.totalOutstanding}
            subtitle={`${total.totalOrders || 0} orders · tap to drill by geography`}
          />
          <button
            type="button"
            onClick={() => {
              if (districts.length) setGeoView("district")
              else Toast.info("No district data")
            }}
            className="w-full rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm hover:border-brand-400"
          >
            <MapPin className="w-8 h-8 text-brand-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-900">View by District → Taluka → Village</p>
            <p className="text-sm text-gray-500 mt-1">{districts.length} districts with outstanding</p>
          </button>
        </div>
      )
    }

    if (geoView === "district") {
      return (
        <div>
          <button
            type="button"
            onClick={() => setGeoView("total")}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-brand-600"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {districts.map((d, i) => (
              <GeoTile
                key={i}
                label="DISTRICT"
                title={d._id}
                amount={d.totalOutstanding}
                orders={d.totalOrders}
                onClick={() => {
                  const has = talukas.some((t) => t._id?.district === d._id)
                  if (has) setGeoView(`taluka-${d._id}`)
                  else Toast.info("No talukas")
                }}
              />
            ))}
          </div>
        </div>
      )
    }

    if (geoView.startsWith("taluka-")) {
      const districtId = geoView.replace("taluka-", "")
      const rows = talukas.filter((t) => t._id?.district === districtId)
      return (
        <div>
          <button
            type="button"
            onClick={() => setGeoView("district")}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-brand-600"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Districts
          </button>
          <p className="text-xs text-gray-500 mb-3">District: {districtId}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {rows.map((t, i) => (
              <GeoTile
                key={i}
                label="TALUKA"
                title={t._id?.taluka}
                amount={t.totalOutstanding}
                orders={t.totalOrders}
                onClick={() => {
                  const has = villages.some(
                    (v) => v._id?.district === districtId && v._id?.taluka === t._id?.taluka
                  )
                  if (has) setGeoView(`village-${districtId}-${t._id?.taluka}`)
                  else Toast.info("No villages")
                }}
              />
            ))}
          </div>
        </div>
      )
    }

    if (geoView.startsWith("village-")) {
      const rest = geoView.replace("village-", "")
      const dash = rest.indexOf("-")
      const districtId = dash >= 0 ? rest.slice(0, dash) : rest
      const talukaId = dash >= 0 ? rest.slice(dash + 1) : ""
      const rows = villages.filter((v) => v._id?.district === districtId && v._id?.taluka === talukaId)
      return (
        <div>
          <button
            type="button"
            onClick={() => setGeoView(`taluka-${districtId}`)}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-brand-600"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Talukas
          </button>
          <p className="text-xs text-gray-500 mb-3">
            {districtId} → {talukaId}
          </p>
          {ordersLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {rows.map((v, i) => (
              <GeoTile
                key={i}
                label="VILLAGE"
                title={v._id?.village}
                amount={v.totalOutstanding}
                orders={v.totalOrders}
                onClick={() => loadVillageOrders(districtId, talukaId, v._id?.village)}
              />
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  const renderFarmers = () => (
    <div>
      <SummaryBanner amount={farmerTotal} subtitle={`${filteredFarmers.length} farmers`} />
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={farmerSearch}
          onChange={(e) => setFarmerSearch(e.target.value)}
          placeholder="Search farmer / mobile / village"
          className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      {!filteredFarmers.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          No farmer outstanding found
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFarmers.map((farmer, idx) => {
            const key = farmer.customerMobile || farmer.customerName || idx
            const open = expandedFarmer === key
            return (
              <div key={key} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedFarmer(open ? null : key)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{farmer.customerName || "Unknown"}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {farmer.customerMobile || "—"}
                      {farmer.customerVillage ? ` · ${farmer.customerVillage}` : ""}
                      {farmer.customerTaluka ? `, ${farmer.customerTaluka}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-red-600">{fmt(farmer.totalOutstanding)}</p>
                    <p className="text-xs text-gray-500">{farmer.totalOrders} orders</p>
                  </div>
                  {open ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
                {open && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <table className="min-w-full">
                      <tbody className="divide-y divide-gray-100">
                        {(farmer.orders || []).map((order) => (
                          <tr key={order._id || order.orderNumber}>
                            <td className="px-4 py-2.5 text-sm text-gray-700">{order.orderNumber}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-500">
                              {order.orderDate ? moment(order.orderDate).format("DD MMM YYYY") : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusChip(order.orderStatus)}`}>
                                {order.orderStatus || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right font-semibold text-red-600">
                              {fmt(order.balanceAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Outstanding</h2>
          <p className="text-sm text-gray-500">
            {canViewBySales
              ? "Break down dues by sales person, village geography, or farmer"
              : "Your outstanding by villages and farmers"}
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id)
                if (id === "villages") setGeoView(selectedSalesman ? "district" : "total")
                setVillageOrders(null)
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                mode === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : mode === "sales" ? (
        renderSales()
      ) : mode === "villages" ? (
        renderVillages()
      ) : (
        renderFarmers()
      )}
    </div>
  )
}
