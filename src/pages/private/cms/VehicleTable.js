import React, { useState, useEffect } from "react"
import { NetworkManager, API } from "network/core"
import { Edit2Icon, Trash2Icon, Plus } from "lucide-react"
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material"
import { PageLoader } from "components"

const VehicleTable = () => {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    number: ""
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
      const response = await instance.request(
        editingVehicle
          ? {
              ...formData,
              id: editingVehicle?._id
            }[editingVehicle?.id]
          : {
              ...formData
            }
      )
      if (response.data) {
        setIsFormOpen(false)
        setEditingVehicle(null)
        setFormData({ name: "", number: "" })
        fetchVehicles()
      }
    } catch (error) {
      console.error("Error saving vehicle:", error)
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
                    onClick={() => {
                      setEditingVehicle(vehicle)
                      setFormData({
                        name: vehicle.name,
                        number: vehicle.number
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
          setFormData({ name: "", number: "" })
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
            </div>
          </DialogContent>
          <DialogActions>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false)
                setEditingVehicle(null)
                setFormData({ name: "", number: "" })
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
    </div>
  )
}

export default VehicleTable
