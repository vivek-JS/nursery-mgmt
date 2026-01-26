import React, { useState, useEffect } from "react"
import { Plus, Search, Calendar, Settings } from "lucide-react"
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material"
import { NetworkManager, API } from "network/core"
import { PageLoader } from "components"
import { Toast } from "helpers/toasts/toastHelper"
import debounce from "lodash.debounce"

const SlotConfigurationTable = () => {
  const [plants, setPlants] = useState([])
  const [selectedPlant, setSelectedPlant] = useState(null)
  const [subtypes, setSubtypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    plantId: "",
    subtypeId: "",
    slotSize: 7,
    totalPlantsPerSlot: 100000,
    buffer: 0,
    startDate: "",
    endDate: ""
  })

  useEffect(() => {
    const debouncedSearch = debounce((value) => {
      setDebouncedSearchTerm(value)
    }, 500)

    if (searchTerm) {
      debouncedSearch(searchTerm)
    }

    return () => debouncedSearch.cancel()
  }, [searchTerm])

  useEffect(() => {
    fetchPlants()
  }, [debouncedSearchTerm])

  useEffect(() => {
    if (formData.plantId) {
      fetchSubtypes(formData.plantId)
    } else {
      setSubtypes([])
    }
  }, [formData.plantId])

  const fetchPlants = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS)
      const response = await instance.request({}, { search: debouncedSearchTerm })

      if (response?.data?.data) {
        setPlants(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubtypes = async (plantId) => {
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
      const response = await instance.request({}, { plantId, year: new Date().getFullYear() })

      if (response?.data?.subtypes) {
        setSubtypes(response.data.subtypes)
      }
    } catch (error) {
      console.error("Error fetching subtypes:", error)
      setSubtypes([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.plantId || !formData.subtypeId || !formData.startDate || !formData.endDate) {
      Toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.CREATE_SLOTS_FOR_SUBTYPE)
      const payload = {
        plantId: formData.plantId,
        subtypeId: formData.subtypeId,
        slotSize: Number(formData.slotSize),
        totalPlantsPerSlot: Number(formData.totalPlantsPerSlot),
        buffer: Number(formData.buffer) || 0,
        startDate: formData.startDate,
        endDate: formData.endDate
      }

      const response = await instance.request(payload)

      if (response?.data?.success) {
        Toast.success(`Slots created successfully for ${selectedPlant?.name} - ${subtypes.find(s => s._id === formData.subtypeId)?.name || 'subtype'}`)
        setIsFormOpen(false)
        resetForm()
      } else {
        Toast.error(response?.data?.message || "Failed to create slots")
      }
    } catch (error) {
      console.error("Error creating slots:", error)
      Toast.error(error?.response?.data?.message || "Failed to create slots")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      plantId: "",
      subtypeId: "",
      slotSize: 7,
      totalPlantsPerSlot: 100000,
      buffer: 0,
      startDate: "",
      endDate: ""
    })
    setSelectedPlant(null)
    setSubtypes([])
  }

  const selectedPlantData = plants.find(p => p._id === formData.plantId)
  const selectedSubtypeData = subtypes.find(s => s._id === formData.subtypeId)

  return (
    <div className="p-6">
      {loading && <PageLoader />}

      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-4 w-1/3">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search plants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-md pl-10"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus size={20} />
          Configure Slots
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Slot Configuration Guide
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            Configure slots for plant subtypes to enable order booking. Slots define delivery periods and capacity.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plants.map((plant) => (
              <div
                key={plant._id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedPlant(plant)
                  setFormData({ ...formData, plantId: plant._id, subtypeId: "" })
                }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{plant.name}</h4>
                  {formData.plantId === plant._id && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Selected
                    </span>
                  )}
                </div>
                {plant.subtypes && plant.subtypes.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {plant.subtypes.length} subtype{plant.subtypes.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>

          {plants.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🌱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Plants Found</h3>
              <p className="text-gray-500">
                {searchTerm ? "No plants match your search." : "No plants available. Please add plants first."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          resetForm()
        }}
        maxWidth="md"
        fullWidth>
        <DialogTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configure Slots
          </div>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plant *</label>
                <select
                  required
                  value={formData.plantId}
                  onChange={(e) => {
                    setFormData({ ...formData, plantId: e.target.value, subtypeId: "" })
                    setSelectedPlant(plants.find(p => p._id === e.target.value))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Plant</option>
                  {plants.map((plant) => (
                    <option key={plant._id} value={plant._id}>
                      {plant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtype *</label>
                <select
                  required
                  value={formData.subtypeId}
                  onChange={(e) => setFormData({ ...formData, subtypeId: e.target.value })}
                  disabled={!formData.plantId || subtypes.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">
                    {!formData.plantId
                      ? "Select a plant first"
                      : subtypes.length === 0
                      ? "No subtypes available"
                      : "Select Subtype"}
                  </option>
                  {subtypes.map((subtype) => (
                    <option key={subtype._id} value={subtype._id}>
                      {subtype.name || subtype.subtypeName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slot Size (Days) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.slotSize}
                    onChange={(e) => setFormData({ ...formData, slotSize: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 7"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of days per slot period</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Plants per Slot *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.totalPlantsPerSlot}
                    onChange={(e) => setFormData({ ...formData, totalPlantsPerSlot: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 100000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum capacity per slot</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buffer (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.buffer}
                  onChange={(e) => setFormData({ ...formData, buffer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Optional buffer percentage</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Slot generation start date</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Slot generation end date</p>
                </div>
              </div>

              {selectedPlantData && selectedSubtypeData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Configuration Summary</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>
                      <span className="font-medium">Plant:</span> {selectedPlantData.name}
                    </div>
                    <div>
                      <span className="font-medium">Subtype:</span> {selectedSubtypeData.name || selectedSubtypeData.subtypeName}
                    </div>
                    <div>
                      <span className="font-medium">Slot Period:</span> {formData.slotSize} days
                    </div>
                    <div>
                      <span className="font-medium">Capacity:</span> {Number(formData.totalPlantsPerSlot).toLocaleString()} plants per slot
                    </div>
                    <div>
                      <span className="font-medium">Date Range:</span> {formData.startDate} to {formData.endDate}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
          <DialogActions className="p-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false)
                resetForm()
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Creating..." : "Create Slots"}
            </button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}

export default SlotConfigurationTable

