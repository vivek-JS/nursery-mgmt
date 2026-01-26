import React, { useState, useEffect } from "react"
import { NetworkManager, API } from "network/core"
import { Edit2Icon, Trash2Icon, Plus, Truck, X } from "lucide-react"
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material"
import { PageLoader } from "components"

const VehicleTable = () => {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isTripFormOpen, setIsTripFormOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [trips, setTrips] = useState([])
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    capacity: ""
  })
  const [tripFormData, setTripFormData] = useState({
    driverName: "",
    driverContact: "",
    startDate: new Date().toISOString().split('T')[0],
    origin: {
      address: "",
      city: "",
      state: "",
      pincode: ""
    },
    destination: {
      address: "",
      city: "",
      state: "",
      pincode: "",
      contactPerson: "",
      contactNumber: ""
    },
    totalPlants: "",
    totalCrates: "",
    notes: ""
  })

  const fetchVehicles = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.VEHICLE.GET_VEHICLES)
      const response = await instance.request()
      setVehicles(response?.data?.data?.data)
    } catch (error) {
      console.error("Error fetching vehicles:", error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchVehicles()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const instance = NetworkManager(
        editingVehicle ? API.VEHICLE.UPDATE_VEHICLE : API.VEHICLE.CREATE_VEHICLE
      )
      const payload = editingVehicle
        ? {
            ...formData,
            id: editingVehicle?._id,
            capacity: parseFloat(formData.capacity)
          }
        : {
            ...formData,
            capacity: parseFloat(formData.capacity)
          }
      const response = await instance.request(payload)
      if (response.data) {
        setIsFormOpen(false)
        setEditingVehicle(null)
        setFormData({ name: "", number: "", capacity: "" })
        fetchVehicles()
      }
    } catch (error) {
      console.error("Error saving vehicle:", error)
    }
    setLoading(false)
  }

  const fetchTrips = async (vehicleId) => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.TRIP.GET_TRIPS_BY_VEHICLE)
      const response = await instance.request({}, [vehicleId])
      setTrips(response?.data?.data || [])
    } catch (error) {
      console.error("Error fetching trips:", error)
      setTrips([])
    }
    setLoading(false)
  }

  const handleViewTrips = (vehicle) => {
    setSelectedVehicle(vehicle)
    fetchTrips(vehicle._id)
    setIsTripFormOpen(true)
  }

  const handleCreateTrip = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const instance = NetworkManager(API.TRIP.CREATE_TRIP)
      const payload = {
        vehicleId: selectedVehicle._id,
        ...tripFormData,
        totalPlants: tripFormData.totalPlants ? parseFloat(tripFormData.totalPlants) : 0,
        totalCrates: tripFormData.totalCrates ? parseFloat(tripFormData.totalCrates) : 0
      }
      const response = await instance.request(payload)
      if (response.data) {
        setTripFormData({
          driverName: "",
          driverContact: "",
          startDate: new Date().toISOString().split('T')[0],
          origin: {
            address: "",
            city: "",
            state: "",
            pincode: ""
          },
          destination: {
            address: "",
            city: "",
            state: "",
            pincode: "",
            contactPerson: "",
            contactNumber: ""
          },
          totalPlants: "",
          totalCrates: "",
          notes: ""
        })
        fetchTrips(selectedVehicle._id)
      }
    } catch (error) {
      console.error("Error creating trip:", error)
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      setLoading(true)
      try {
        const instance = NetworkManager(API.VEHICLE.DELETE)
        await instance.request({ id })
        fetchVehicles()
      } catch (error) {
        console.error("Error deleting vehicle:", error)
      }
      setLoading(false)
    }
  }

  return (
    <div>
      {loading && <PageLoader />}

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus size={20} />
          Add Vehicle
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacity
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
            {vehicles.map((vehicle) => (
              <tr key={vehicle._id}>
                <td className="px-6 py-4 whitespace-nowrap">{vehicle.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{vehicle.number}</td>
                <td className="px-6 py-4 whitespace-nowrap">{vehicle.capacity || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      vehicle.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                    {vehicle.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => handleViewTrips(vehicle)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                    title="View Trips">
                    <Truck size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingVehicle(vehicle)
                      setFormData({
                        name: vehicle.name,
                        number: vehicle.number,
                        capacity: vehicle.capacity || ""
                      })
                      setIsFormOpen(true)
                    }}
                    className="text-indigo-600 hover:text-indigo-900 mr-4">
                    <Edit2Icon size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle._id)}
                    className="text-red-600 hover:text-red-900">
                    <Trash2Icon size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingVehicle(null)
          setFormData({ name: "", number: "", capacity: "" })
        }}
        maxWidth="sm"
        fullWidth>
        <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Number</label>
                <input
                  type="text"
                  required
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Enter vehicle capacity"
                />
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false)
                setEditingVehicle(null)
                setFormData({ name: "", number: "", capacity: "" })
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md">
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
              {editingVehicle ? "Update" : "Create"}
            </button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Trip Management Dialog */}
      <Dialog
        open={isTripFormOpen}
        onClose={() => {
          setIsTripFormOpen(false)
          setSelectedVehicle(null)
          setTrips([])
        }}
        maxWidth="lg"
        fullWidth>
        <DialogTitle className="flex justify-between items-center">
          <span>Trips - {selectedVehicle?.name} ({selectedVehicle?.number})</span>
          <button
            onClick={() => setIsTripFormOpen(false)}
            className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </DialogTitle>
        <DialogContent>
          <div className="space-y-6">
            {/* Create Trip Form */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-4">Add New Trip</h3>
              <form onSubmit={handleCreateTrip} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Driver Name</label>
                    <input
                      type="text"
                      required
                      value={tripFormData.driverName}
                      onChange={(e) => setTripFormData({ ...tripFormData, driverName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Driver Contact</label>
                    <input
                      type="text"
                      value={tripFormData.driverContact}
                      onChange={(e) => setTripFormData({ ...tripFormData, driverContact: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      required
                      value={tripFormData.startDate}
                      onChange={(e) => setTripFormData({ ...tripFormData, startDate: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Plants</label>
                    <input
                      type="number"
                      min="0"
                      value={tripFormData.totalPlants}
                      onChange={(e) => setTripFormData({ ...tripFormData, totalPlants: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Crates</label>
                    <input
                      type="number"
                      min="0"
                      value={tripFormData.totalCrates}
                      onChange={(e) => setTripFormData({ ...tripFormData, totalCrates: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Origin</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Address"
                      value={tripFormData.origin.address}
                      onChange={(e) => setTripFormData({
                        ...tripFormData,
                        origin: { ...tripFormData.origin, address: e.target.value }
                      })}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={tripFormData.origin.city}
                      onChange={(e) => setTripFormData({
                        ...tripFormData,
                        origin: { ...tripFormData.origin, city: e.target.value }
                      })}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={tripFormData.origin.state}
                      onChange={(e) => setTripFormData({
                        ...tripFormData,
                        origin: { ...tripFormData.origin, state: e.target.value }
                      })}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={tripFormData.origin.pincode}
                      onChange={(e) => setTripFormData({
                        ...tripFormData,
                        origin: { ...tripFormData.origin, pincode: e.target.value }
                      })}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Address"
                      value={tripFormData.destination.address}
                      onChange={(e) => setTripFormData({
                        ...tripFormData,
                        destination: { ...tripFormData.destination, address: e.target.value }
                      })}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={tripFormData.destination.city}
                      onChange={(e) => setTripFormData({
                        ...tripFormData,
                        destination: { ...tripFormData.destination, city: e.target.value }
                      })}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={tripFormData.destination.state}
                      onChange={(e) => setTripFormData({
                        ...tripFormData,
                        destination: { ...tripFormData.destination, state: e.target.value }
                      })}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={tripFormData.destination.pincode}
                      onChange={(e) => setTripFormData({
                        ...tripFormData,
                        destination: { ...tripFormData.destination, pincode: e.target.value }
                      })}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <input
                      type="text"
                      placeholder="Contact Person"
                      value={tripFormData.destination.contactPerson}
                      onChange={(e) => setTripFormData({
                        ...tripFormData,
                        destination: { ...tripFormData.destination, contactPerson: e.target.value }
                      })}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <input
                      type="text"
                      placeholder="Contact Number"
                      value={tripFormData.destination.contactNumber}
                      onChange={(e) => setTripFormData({
                        ...tripFormData,
                        destination: { ...tripFormData.destination, contactNumber: e.target.value }
                      })}
                      className="border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={tripFormData.notes}
                    onChange={(e) => setTripFormData({ ...tripFormData, notes: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    rows="3"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
                  Create Trip
                </button>
              </form>
            </div>

            {/* Trips List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Trip History</h3>
              {trips.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No trips found for this vehicle</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plants</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crates</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {trips.map((trip) => (
                        <tr key={trip._id}>
                          <td className="px-4 py-3 whitespace-nowrap">{trip.tripNumber}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{trip.driverName}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {new Date(trip.startDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                trip.status === "delivered"
                                  ? "bg-green-100 text-green-800"
                                  : trip.status === "in_transit"
                                  ? "bg-blue-100 text-blue-800"
                                  : trip.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                              {trip.status.replace("_", " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{trip.totalPlants || 0}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{trip.totalCrates || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <button
            onClick={() => {
              setIsTripFormOpen(false)
              setSelectedVehicle(null)
              setTrips([])
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md">
            Close
          </button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default VehicleTable
