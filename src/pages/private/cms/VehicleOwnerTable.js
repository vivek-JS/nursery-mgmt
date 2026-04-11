import React, { useState, useEffect, useCallback, useRef } from "react"
import { NetworkManager, API } from "network/core"
import { Edit2Icon, Trash2Icon, Plus, Truck, Users, X } from "lucide-react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
} from "@mui/material"
import { PageLoader } from "components"

const emptyOwnerForm = () => ({ name: "", mobile: "", notes: "" })

const VehicleOwnerTable = () => {
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [listVersion, setListVersion] = useState(0)
  const tableSectionRef = useRef(null)
  const skipScrollIntoViewOnce = useRef(true)

  /** Saved owner id for the open modal (after create or when editing). */
  const [activeOwnerId, setActiveOwnerId] = useState(null)
  const [ownerFormOpen, setOwnerFormOpen] = useState(false)
  const [editingOwner, setEditingOwner] = useState(null)
  const [ownerForm, setOwnerForm] = useState(emptyOwnerForm())

  const [drivers, setDrivers] = useState([])
  const [driverForm, setDriverForm] = useState({
    name: "",
    mobile: "",
    licenseNumber: ""
  })
  const [editingDriver, setEditingDriver] = useState(null)

  const [vehicles, setVehicles] = useState([])
  const [vehicleForm, setVehicleForm] = useState({
    name: "",
    number: "",
    capacity: "",
    defaultDriverId: ""
  })
  const [editingVehicle, setEditingVehicle] = useState(null)

  const fetchOwners = useCallback(async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.VEHICLE_OWNER.GET_ALL)
      const response = await instance.request(
        {},
        {
          page: page + 1,
          limit: rowsPerPage
        }
      )
      if (!response?.success || response?.data == null) {
        setOwners([])
        setTotalCount(0)
        return
      }
      const payload = response.data.data
      setOwners(Array.isArray(payload?.data) ? payload.data : [])
      setTotalCount(Number(payload?.pagination?.total) || 0)
    } catch (e) {
      console.error("Error fetching owners:", e)
      setOwners([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, listVersion])

  useEffect(() => {
    fetchOwners()
  }, [fetchOwners])

  useEffect(() => {
    if (skipScrollIntoViewOnce.current) {
      skipScrollIntoViewOnce.current = false
      return
    }
    tableSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [page, rowsPerPage])

  const fetchDriversForOwner = async (ownerId) => {
    if (!ownerId) {
      setDrivers([])
      return
    }
    setLoading(true)
    try {
      const instance = NetworkManager(API.VEHICLE_DRIVER.GET_BY_OWNER)
      const response = await instance.request({}, [ownerId])
      const raw = response?.data?.data
      setDrivers(Array.isArray(raw) ? raw : [])
    } catch (e) {
      console.error("Error fetching drivers:", e)
      setDrivers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchVehiclesForOwner = async (ownerId) => {
    if (!ownerId) {
      setVehicles([])
      return
    }
    setLoading(true)
    try {
      const instance = NetworkManager(API.VEHICLE.GET_VEHICLES)
      const response = await instance.request(
        {},
        { page: 1, limit: 100, ownerId }
      )
      const payload = response?.data?.data
      setVehicles(Array.isArray(payload?.data) ? payload.data : [])
    } catch (e) {
      console.error("Error fetching vehicles:", e)
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }

  const resetModalChildren = () => {
    setDrivers([])
    setDriverForm({ name: "", mobile: "", licenseNumber: "" })
    setEditingDriver(null)
    setVehicles([])
    setVehicleForm({ name: "", number: "", capacity: "", defaultDriverId: "" })
    setEditingVehicle(null)
  }

  const openAddOwner = () => {
    setEditingOwner(null)
    setActiveOwnerId(null)
    setOwnerForm(emptyOwnerForm())
    resetModalChildren()
    setOwnerFormOpen(true)
  }

  const openEditOwner = (o) => {
    setEditingOwner(o)
    setActiveOwnerId(o._id)
    setOwnerForm({
      name: o.name || "",
      mobile: o.mobile || "",
      notes: o.notes || ""
    })
    resetModalChildren()
    fetchDriversForOwner(o._id)
    fetchVehiclesForOwner(o._id)
    setOwnerFormOpen(true)
  }

  const closeOwnerModal = () => {
    setOwnerFormOpen(false)
    setEditingOwner(null)
    setActiveOwnerId(null)
    setOwnerForm(emptyOwnerForm())
    resetModalChildren()
  }

  /** Save owner only — keeps dialog open and unlocks drivers & vehicles for new owners. */
  const handleSaveOwner = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const instance = NetworkManager(
        editingOwner ? API.VEHICLE_OWNER.UPDATE : API.VEHICLE_OWNER.CREATE
      )
      const payload = editingOwner
        ? { ...ownerForm, id: editingOwner._id }
        : { ...ownerForm }
      const response = await instance.request(payload)
      if (!response?.success) {
        setLoading(false)
        return
      }
      const saved = response.data?.data
      const id = saved?._id || editingOwner?._id
      if (id) {
        setActiveOwnerId(id)
        if (!editingOwner && saved) {
          setEditingOwner(saved)
        } else if (editingOwner) {
          setEditingOwner({ ...editingOwner, ...ownerForm })
        }
        await fetchDriversForOwner(id)
        await fetchVehiclesForOwner(id)
      }
      setPage(0)
      setListVersion((v) => v + 1)
    } catch (err) {
      console.error("Error saving owner:", err)
    }
    setLoading(false)
  }

  const handleDeleteOwner = async (id) => {
    if (!window.confirm("Deactivate this owner? (Only allowed if no active vehicles use them.)")) {
      return
    }
    setLoading(true)
    try {
      const instance = NetworkManager(API.VEHICLE_OWNER.DELETE)
      await instance.request({ id })
      setListVersion((v) => v + 1)
    } catch (err) {
      console.error("Error deleting owner:", err)
    }
    setLoading(false)
  }

  const ownerIdForChildren = activeOwnerId || editingOwner?._id

  const applyDriverSameAsOwner = () => {
    setDriverForm({
      name: ownerForm.name || "",
      mobile: ownerForm.mobile || "",
      licenseNumber: driverForm.licenseNumber || ""
    })
  }

  const handleDriverSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!ownerIdForChildren) {
      window.alert("Save the owner (name & mobile) first, then add drivers.")
      return
    }
    setLoading(true)
    try {
      const instance = NetworkManager(
        editingDriver ? API.VEHICLE_DRIVER.UPDATE : API.VEHICLE_DRIVER.CREATE
      )
      const payload = editingDriver
        ? {
            ...driverForm,
            id: editingDriver._id,
            ownerId: ownerIdForChildren
          }
        : {
            ...driverForm,
            ownerId: ownerIdForChildren
          }
      const response = await instance.request(payload)
      if (response?.data != null) {
        setEditingDriver(null)
        setDriverForm({ name: "", mobile: "", licenseNumber: "" })
        await fetchDriversForOwner(ownerIdForChildren)
        setListVersion((v) => v + 1)
      }
    } catch (err) {
      console.error("Error saving driver:", err)
    }
    setLoading(false)
  }

  const handleDeleteDriver = async (id) => {
    if (!window.confirm("Deactivate this driver?")) return
    if (!ownerIdForChildren) return
    setLoading(true)
    try {
      const instance = NetworkManager(API.VEHICLE_DRIVER.DELETE)
      await instance.request({ id })
      await fetchDriversForOwner(ownerIdForChildren)
      setListVersion((v) => v + 1)
    } catch (err) {
      console.error("Error deleting driver:", err)
    }
    setLoading(false)
  }

  const handleVehicleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!ownerIdForChildren) {
      window.alert("Save the owner first, then add vehicles.")
      return
    }
    setLoading(true)
    try {
      const instance = NetworkManager(
        editingVehicle ? API.VEHICLE.UPDATE_VEHICLE : API.VEHICLE.CREATE_VEHICLE
      )
      const base = {
        name: vehicleForm.name,
        number: vehicleForm.number,
        capacity: parseFloat(vehicleForm.capacity),
        ownerId: ownerIdForChildren
      }
      if (vehicleForm.defaultDriverId) {
        base.defaultDriverId = vehicleForm.defaultDriverId
      } else if (editingVehicle) {
        base.defaultDriverId = null
      }
      const payload = editingVehicle
        ? { ...base, id: editingVehicle._id }
        : base
      const response = await instance.request(payload)
      if (response?.data != null) {
        setEditingVehicle(null)
        setVehicleForm({ name: "", number: "", capacity: "", defaultDriverId: "" })
        await fetchVehiclesForOwner(ownerIdForChildren)
        setListVersion((v) => v + 1)
      }
    } catch (err) {
      console.error("Error saving vehicle:", err)
    }
    setLoading(false)
  }

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm("Deactivate this vehicle?")) return
    if (!ownerIdForChildren) return
    setLoading(true)
    try {
      const instance = NetworkManager(API.VEHICLE.DELETE_VEHICLE)
      await instance.request({ id })
      await fetchVehiclesForOwner(ownerIdForChildren)
      setListVersion((v) => v + 1)
    } catch (err) {
      console.error("Error deleting vehicle:", err)
    }
    setLoading(false)
  }

  const startEditVehicle = (v) => {
    const defId = v.defaultDriverId?._id || v.defaultDriverId || ""
    setEditingVehicle(v)
    setVehicleForm({
      name: v.name || "",
      number: v.number || "",
      capacity: v.capacity != null ? String(v.capacity) : "",
      defaultDriverId: defId ? String(defId) : ""
    })
  }

  return (
    <div ref={tableSectionRef} className="scroll-mt-4">
      {loading && <PageLoader />}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={openAddOwner}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus size={20} />
          Add owner
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {owners.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No owners yet. Add an owner — you can attach drivers and vehicles in the same form.
                  </td>
                </tr>
              ) : null}
              {owners.map((o) => (
                <tr key={o._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{o.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{o.mobile || "—"}</td>
                  <td className="px-6 py-4 max-w-xs truncate" title={o.notes || ""}>
                    {o.notes || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        o.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                      {o.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      type="button"
                      onClick={() => openEditOwner(o)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4">
                      <Edit2Icon size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOwner(o._id)}
                      className="text-red-600 hover:text-red-900">
                      <Trash2Icon size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rows per page"
        />
      </div>

      <Dialog open={ownerFormOpen} onClose={closeOwnerModal} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="text-lg font-semibold text-slate-800">
              {editingOwner ? "Edit owner" : "Add owner"}
            </div>
            <p className="text-sm font-normal text-slate-500 mt-1">
              Save owner details first, then add drivers and vehicles below. Use &quot;Same as owner&quot; when the owner also drives.
            </p>
          </div>
          <button
            type="button"
            onClick={closeOwnerModal}
            className="text-slate-400 hover:text-slate-600 shrink-0 p-1">
            <X size={22} />
          </button>
        </DialogTitle>

        <DialogContent className="space-y-6 pt-4">
          <form onSubmit={handleSaveOwner} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-700">Owner</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  required
                  value={ownerForm.name}
                  onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm p-2.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Mobile</label>
                <input
                  type="text"
                  value={ownerForm.mobile}
                  onChange={(e) => setOwnerForm({ ...ownerForm, mobile: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm p-2.5 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Notes (optional)</label>
              <textarea
                value={ownerForm.notes}
                onChange={(e) => setOwnerForm({ ...ownerForm, notes: e.target.value })}
                className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm p-2.5 bg-white"
                rows={2}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                {editingOwner ? "Save owner" : "Save owner & continue"}
              </button>
              {!editingOwner && !activeOwnerId ? (
                <span className="text-xs text-amber-700 self-center">
                  Save once to enable drivers & vehicles.
                </span>
              ) : null}
            </div>
          </form>

          <div
            className={`grid grid-cols-1 gap-6 ${ownerIdForChildren ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
            <div className="rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Users className="text-emerald-600" size={18} />
                Drivers
              </div>
              <form onSubmit={handleDriverSubmit} className="space-y-3 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={applyDriverSameAsOwner}
                    disabled={!ownerForm.name?.trim()}
                    className="text-sm px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed">
                    Same as owner
                  </button>
                  <span className="text-xs text-slate-500 self-center">
                    Fills name &amp; mobile from owner (typical when owner drives).
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Driver name</label>
                    <input
                      type="text"
                      required
                      value={driverForm.name}
                      onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Mobile</label>
                    <input
                      type="text"
                      value={driverForm.mobile}
                      onChange={(e) => setDriverForm({ ...driverForm, mobile: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">License (optional)</label>
                    <input
                      type="text"
                      value={driverForm.licenseNumber}
                      onChange={(e) =>
                        setDriverForm({ ...driverForm, licenseNumber: e.target.value })
                      }
                      className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-3 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg">
                    {editingDriver ? "Update driver" : "Add driver"}
                  </button>
                  {editingDriver ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDriver(null)
                        setDriverForm({ name: "", mobile: "", licenseNumber: "" })
                      }}
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg">
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
              <div className="overflow-x-auto max-h-40 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Mobile</th>
                      <th className="py-2 pr-2">License</th>
                      <th className="py-2"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-slate-400 text-center">
                          No drivers yet. Use &quot;Same as owner&quot; for the usual case.
                        </td>
                      </tr>
                    ) : (
                      drivers.map((d) => (
                        <tr key={d._id} className="border-b border-slate-50">
                          <td className="py-2 pr-2">{d.name}</td>
                          <td className="py-2 pr-2">{d.mobile || "—"}</td>
                          <td className="py-2 pr-2">{d.licenseNumber || "—"}</td>
                          <td className="py-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDriver(d)
                                setDriverForm({
                                  name: d.name || "",
                                  mobile: d.mobile || "",
                                  licenseNumber: d.licenseNumber || ""
                                })
                              }}
                              className="text-indigo-600 mr-2">
                              <Edit2Icon size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDriver(d._id)}
                              className="text-red-600">
                              <Trash2Icon size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Truck className="text-slate-500" size={18} />
                  Vehicles
                </div>
              </div>
              <form
                onSubmit={handleVehicleSubmit}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end border-b border-slate-100 pb-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600">Vehicle name</label>
                    <input
                      type="text"
                      required
                      value={vehicleForm.name}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Number</label>
                    <input
                      type="text"
                      required
                      value={vehicleForm.number}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, number: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Capacity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={vehicleForm.capacity}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600">Default driver (optional)</label>
                    <select
                      value={vehicleForm.defaultDriverId}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, defaultDriverId: e.target.value })
                      }
                      className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm bg-white">
                      <option value="">None</option>
                      {drivers.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                          {d.mobile ? ` (${d.mobile})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      className="px-3 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-lg">
                      {editingVehicle ? "Update vehicle" : "Add vehicle"}
                    </button>
                    {editingVehicle ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVehicle(null)
                          setVehicleForm({
                            name: "",
                            number: "",
                            capacity: "",
                            defaultDriverId: ""
                          })
                        }}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg">
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                        <th className="py-2 pr-2">Name</th>
                        <th className="py-2 pr-2">Number</th>
                        <th className="py-2 pr-2">Capacity</th>
                        <th className="py-2 pr-2">Default driver</th>
                        <th className="py-2"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-slate-400 text-center">
                            No vehicles for this owner yet.
                          </td>
                        </tr>
                      ) : (
                        vehicles.map((v) => (
                          <tr key={v._id} className="border-b border-slate-50">
                            <td className="py-2 pr-2">{v.name}</td>
                            <td className="py-2 pr-2 font-mono text-xs">{v.number}</td>
                            <td className="py-2 pr-2">{v.capacity}</td>
                            <td className="py-2 pr-2">{v.defaultDriverId?.name || "—"}</td>
                            <td className="py-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => startEditVehicle(v)}
                                className="text-indigo-600 mr-2">
                                <Edit2Icon size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVehicle(v._id)}
                                className="text-red-600">
                                <Trash2Icon size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </DialogContent>

        <DialogActions className="border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={closeOwnerModal}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg">
            Close
          </button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default VehicleOwnerTable
