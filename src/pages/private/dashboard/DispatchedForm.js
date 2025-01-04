import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton
} from "@mui/material"
import { Leaf, Truck, Trash2, ChevronDown, ChevronUp } from "lucide-react"

import { NetworkManager, API } from "network/core"

const DispatchForm = ({ open, onClose, selectedOrders, mode = "create", dispatchData = null }) => {
  console.log(selectedOrders)
  const [formData, setFormData] = useState({
    driverName: "",
    vehicleName: "",
    plants: []
  })
  const [expandedPlants, setExpandedPlants] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [shades, setShades] = useState([])
  const [cavities, setCavities] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  console.log(formData)
  // Fetch functions for each dropdown
  const getDrivers = async () => {
    try {
      const instance = NetworkManager(API.USER.GET_USERS)
      const response = await instance.request({}, {})
      if (response.data?.data) {
        setDrivers(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching drivers:", error)
    }
  }

  const getVehicles = async () => {
    try {
      const instance = NetworkManager(API.VEHICLE.GET_ACTIVE_VEHICLES)
      const response = await instance.request({}, {})
      if (response.data?.data) {
        setVehicles(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error)
    }
  }

  const getShades = async () => {
    try {
      const instance = NetworkManager(API.SHADE.GET_SHADES)
      const response = await instance.request({}, {})
      if (response.data?.data) {
        setShades(response.data.data.data)
      }
    } catch (error) {
      console.error("Error fetching shades:", error)
    }
  }

  const getCavities = async () => {
    try {
      const instance = NetworkManager(API.TRAY.GET_TRAYS)
      const response = await instance.request({}, {})
      if (response.data?.data) {
        setCavities(response.data.data.data)
      }
    } catch (error) {
      console.error("Error fetching cavities:", error)
    }
  }

  // Validation
  const validateForm = () => {
    setError("")

    if (!formData.driverName) {
      throw new Error("Please select a driver")
    }
    if (!formData.vehicleName) {
      throw new Error("Please select a vehicle")
    }

    formData.plants.forEach((plant) => {
      const emptyShade = plant.pickupDetails.find((detail) => !detail.shade)
      if (emptyShade) {
        throw new Error(`Please select all shades for ${plant.name}`)
      }

      const pickupTotal = plant.pickupDetails?.reduce(
        (sum, detail) => sum + Number(detail.quantity),
        0
      )
      if (pickupTotal !== plant.quantity) {
        throw new Error(
          `Total pickup quantity (${pickupTotal}) doesn't match required quantity (${plant.quantity}) for ${plant.name}`
        )
      }
    })

    return true
  }

  // Data transformation
  const transformDispatchData = (formData, selectedOrders) => {
    const orderIds = Array.from(selectedOrders.keys())
    const plantsDetails = formData.plants?.map((plant) => {
      const firstOrder = plant.orders[0]?.details
      return {
        name: plant.name,
        id: plant.id,
        plantId: firstOrder?.plantID || "",
        subTypeId: firstOrder?.plantSubtypeID || "",
        quantity: plant.quantity,
        totalPlants: plant.pickupDetails.reduce((sum, detail) => sum + Number(detail.quantity), 0),
        pickupDetails: plant.pickupDetails?.map((detail) => ({
          shade: detail.shade,
          shadeName: detail.shadeName || "",
          quantity: Number(detail.quantity)
        })),
        crates: [
          {
            cavity: plant.selectedCavity,
            cavityName: plant.cavityDetails?.cavityName,
            crateCount: plant.crates.reduce((sum, crate) => sum + crate.numberOfCrates, 0),
            plantCount: plant.crates.reduce((sum, crate) => sum + Number(crate.quantity), 0),
            crateDetails: plant.crates.map((crate) => ({
              crateCount: crate.numberOfCrates,
              plantCount: Number(crate.quantity)
            }))
          }
        ]
      }
    })

    return {
      driverName: formData.driverName,
      vehicleName: formData.vehicleName,
      orderIds: orderIds,
      plantsDetails: plantsDetails
    }
  }

  // Handlers
  const handleSubmit = async () => {
    setLoading(true)
    try {
      validateForm()
      const instance = NetworkManager(API.DISPATCHED.CREATE_TRAY)
      const response = await instance.request({
        ...transformDispatchData(formData, selectedOrders)
      })
      if (response.data) {
        onClose()
      }
    } catch (error) {
      console.error("Error:", error)
      setError(error.message || "Error creating dispatch")
    } finally {
      setLoading(false)
    }
  }

  const handleAddPickupDetail = (plantIndex) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      updatedPlants[plantIndex].pickupDetails.push({ shade: "", quantity: 0 })
      return { ...prev, plants: updatedPlants }
    })
  }

  const handlePickupDetailChange = (plantIndex, detailIndex, field, value) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      if (field === "shade") {
        const selectedShade = shades.find((shade) => shade.id === value)
        updatedPlants[plantIndex].pickupDetails[detailIndex][field] = value
        updatedPlants[plantIndex].pickupDetails[detailIndex].shadeName = selectedShade?.name || ""
      } else {
        updatedPlants[plantIndex].pickupDetails[detailIndex][field] = value
      }

      const plant = updatedPlants[plantIndex]
      if (plant.selectedCavity) {
        const selectedOption = document.querySelector(`option[value="${plant.selectedCavity}"]`)
        const numberPerCrate = selectedOption?.getAttribute("tpc")
        handleCrateChange(plantIndex, 0, "cavity", plant.selectedCavity, numberPerCrate)
      }

      return { ...prev, plants: updatedPlants }
    })
  }

  const handleCrateChange = (plantIndex, crateIndex, field, value, numberPerCrate) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      const plant = updatedPlants[plantIndex]

      if (field === "cavity") {
        const selectedCavity = cavities.find((cavity) => cavity.id === value)

        const cavitySize = selectedCavity?.cavity || 1
        const extraPlants =
          (plant?.quantity / plant?.cavityDetails?.cavitySize) * Number(plant.extraPlantsPerTray) ||
          0
        console.log(extraPlants)
        const totalPlants =
          plant.pickupDetails.reduce((sum, detail) => sum + Number(detail.quantity), 0) +
          extraPlants
        numberPerCrate = Number(numberPerCrate) || selectedCavity?.numberPerCrate || 1
        console.log(totalPlants)

        console.log(numberPerCrate)

        const numberOfCavityTrays = Math.floor(totalPlants / cavitySize)
        const remainder = (totalPlants / cavitySize) % numberPerCrate

        console.log(numberOfCavityTrays)
        console.log(remainder)

        updatedPlants[plantIndex].selectedCavity = value
        updatedPlants[plantIndex].cavityDetails = {
          cavityName: selectedCavity?.name,
          cavitySize: cavitySize,
          numberPerCrate: numberPerCrate,
          extraPlantsPerTray: extraPlants
        }

        updatedPlants[plantIndex].crates = []

        if (numberOfCavityTrays > 0) {
          updatedPlants[plantIndex].crates.push({
            numberOfCavityTrays: numberOfCavityTrays,
            numberOfCrates: Math.floor(numberOfCavityTrays / numberPerCrate),
            quantity: Math.floor(numberOfCavityTrays / numberPerCrate) * numberPerCrate * cavitySize
          })
        }

        if (remainder > 0) {
          updatedPlants[plantIndex].crates.push({
            numberOfCavityTrays: 1,
            numberOfCrates: 1,
            quantity:
              totalPlants -
              Math.floor(numberOfCavityTrays / numberPerCrate) * numberPerCrate * cavitySize
          })
        }
      }

      return { ...prev, plants: updatedPlants }
    })
  }
  const handleDeletePickupDetail = (plantIndex, detailIndex) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      if (updatedPlants[plantIndex].pickupDetails.length === 1) {
        return prev
      }
      updatedPlants[plantIndex].pickupDetails = updatedPlants[plantIndex].pickupDetails.filter(
        (_, index) => index !== detailIndex
      )
      return { ...prev, plants: updatedPlants }
    })
  }

  const togglePlantExpansion = (plantId) => {
    setExpandedPlants((prev) => ({
      ...prev,
      [plantId]: !prev[plantId]
    }))
  }

  useEffect(() => {
    getDrivers()
    getVehicles()
    getShades()
    getCavities()
  }, [])

  useEffect(() => {
    if (!open) {
      setIsEditing(false)
      setError("")
    }
  }, [open])

  useEffect(() => {
    if (mode === "view" && dispatchData) {
      const plants = dispatchData.plants
      setFormData({
        driverName: dispatchData.driverName,
        vehicleName: dispatchData.vehicleName,
        plants: plants
      })

      const initialExpandedState = plants?.reduce((acc, plant) => {
        acc[plant.id] = true
        return acc
      }, {})
      setExpandedPlants(initialExpandedState)
    } else if (selectedOrders?.size > 0) {
      const selectedOrdersArray = Array.from(selectedOrders.values())
      const plantGroups = selectedOrdersArray?.reduce((acc, order) => {
        const plantId = order.details?.plantID
        const plantSubtypeId = order.details?.plantSubtypeID
        const key = `${plantId}_${plantSubtypeId}`

        if (!acc[key]) {
          acc[key] = {
            id: plantId,
            name: order.plantType,
            quantity: order.quantity || 0,
            pickupDetails: [
              {
                shade: "",
                quantity: order.quantity || 0
              }
            ],
            crates: [
              {
                cavity: "",
                quantity: 0
              }
            ],
            orders: []
          }
        } else {
          acc[key].quantity += order.quantity || 0
          acc[key].pickupDetails[0].quantity += order.quantity || 0
          acc[key].crates[0].quantity += order.quantity || 0
        }

        acc[key].orders.push(order)
        return acc
      }, {})

      setFormData((prev) => ({
        ...prev,
        plants: Object.values(plantGroups)
      }))

      const initialExpandedState = Object.keys(plantGroups)?.reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {})
      setExpandedPlants(initialExpandedState)
    }
  }, [mode, dispatchData, selectedOrders?.size])
  const handleCancelEdit = () => {
    if (dispatchData) {
      setFormData(dispatchData)
    }
    setIsEditing(false)
    setError("")
  }

  const handleUpdate = () => {
    // Update functionality to be implemented
  }

  const isViewMode = mode === "view"

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        className: "max-h-[90vh] overflow-y-auto"
      }}>
      <DialogTitle className="bg-green-50 border-b border-green-100 flex items-center gap-2">
        <Truck className="text-green-600" size={24} />
        <span className="text-green-800">
          {!isViewMode ? "Create New Dispatch" : isEditing ? "Edit Dispatch" : "View Dispatch"}
        </span>
      </DialogTitle>

      <DialogContent className="space-y-6 mt-6 bg-gray-50">
        {/* Order Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from(selectedOrders.values()).map((order) => (
            <div
              key={order.details.orderid}
              className="bg-white rounded-lg border border-green-100 hover:border-green-200 transition-colors shadow-sm">
              <div className="p-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-gray-900">{order.farmerName}</span>
                    <span className="text-xs text-gray-500 font-mono">#{order.order}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Plant: </span>
                      <span className="text-gray-700">{order.plantType}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Village: </span>
                      <span className="text-gray-700">{order.details.farmer.village}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Qty: </span>
                      <span className="text-gray-700">{order.quantity.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Delivery: </span>
                      <span className="text-gray-700">{order.Delivery}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Booking: </span>
                      <span className="text-gray-700">{order.orderDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button className="absolute top-0 right-0 px-4 py-3" onClick={() => setError("")}>
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Driver and Vehicle Selection */}
          <div className="grid grid-cols-2 gap-4">
            <select
              className="p-2 border rounded-lg"
              value={formData.driverName}
              onChange={(e) => setFormData((prev) => ({ ...prev, driverName: e.target.value }))}
              disabled={isViewMode && !isEditing}>
              <option value="">Select Driver</option>
              {drivers?.map((driver) => (
                <option key={driver.id} value={driver.name}>
                  {driver.name}
                </option>
              ))}
            </select>

            <select
              className="p-2 border rounded-lg"
              value={formData.vehicleName}
              onChange={(e) => setFormData((prev) => ({ ...prev, vehicleName: e.target.value }))}
              disabled={isViewMode && !isEditing}>
              <option value="">Select Vehicle</option>
              {vehicles?.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.name}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </div>

          {/* Plants Details */}
          <div className="space-y-4">
            {formData.plants?.map((plant, plantIndex) => (
              <div key={plant.id} className="border rounded-lg">
                <div
                  className="flex items-center justify-between p-4 bg-green-50 cursor-pointer"
                  onClick={() => togglePlantExpansion(plant.id)}>
                  <div className="flex items-center gap-2">
                    <Leaf className="text-green-600" size={20} />
                    <span className="font-medium">{plant.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        {plant.quantity.toLocaleString()} plants
                      </span>
                      {plant.extraPlantsPerTray > 0 && (
                        <span className="text-sm text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="text-xs">+</span>
                          {Math.round(
                            (Number(plant?.quantity) / Number(plant?.cavityDetails?.cavitySize)) *
                              Number(plant.extraPlantsPerTray)
                          ).toLocaleString()}{" "}
                          extra
                        </span>
                      )}
                    </div>
                  </div>
                  {expandedPlants[plant.id] ? (
                    <ChevronUp className="text-green-600" size={20} />
                  ) : (
                    <ChevronDown className="text-green-600" size={20} />
                  )}
                </div>

                {expandedPlants[plant.id] && (
                  <div className="p-4 space-y-4">
                    {/* Pickup Details */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Pickup Details</h4>
                        {!isViewMode && (
                          <button
                            onClick={() => handleAddPickupDetail(plantIndex)}
                            className="text-sm text-green-600 hover:text-green-700">
                            + Add Pickup Detail
                          </button>
                        )}
                      </div>
                      {plant.pickupDetails?.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex gap-4 items-center">
                          <select
                            className="flex-1 p-2 border rounded"
                            value={detail.shade}
                            onChange={(e) =>
                              handlePickupDetailChange(
                                plantIndex,
                                detailIndex,
                                "shade",
                                e.target.value
                              )
                            }
                            disabled={isViewMode && !isEditing}>
                            <option value="">Select Shade</option>
                            {shades?.map((shade) => (
                              <option key={shade.id} value={shade.id}>
                                {shade.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            className="flex-1 p-2 border rounded"
                            value={detail.quantity}
                            onChange={(e) =>
                              handlePickupDetailChange(
                                plantIndex,
                                detailIndex,
                                "quantity",
                                e.target.value
                              )
                            }
                            placeholder="Quantity"
                            disabled={isViewMode && !isEditing}
                          />
                          {!isViewMode && (
                            <IconButton
                              onClick={() => handleDeletePickupDetail(plantIndex, detailIndex)}
                              disabled={plant.pickupDetails.length === 1}>
                              <Trash2 size={20} className="text-red-500" />
                            </IconButton>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Cavity Details */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Cavity</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <select
                            className="flex-1 p-2 border rounded"
                            value={plant.selectedCavity || ""}
                            onChange={(e) => {
                              const selectedOption = e.target.options[e.target.selectedIndex]
                              const numberPerCrate = selectedOption.getAttribute("tpc")
                              handleCrateChange(
                                plantIndex,
                                0,
                                "cavity",
                                e.target.value,
                                numberPerCrate
                              )
                            }}
                            disabled={isViewMode && !isEditing}>
                            <option value="">Select Cavity</option>
                            {cavities?.map((cavity) => (
                              <option key={cavity.id} value={cavity.id} tpc={cavity.numberPerCrate}>
                                {cavity.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            className="w-32 p-2 border rounded"
                            placeholder="Extra plants"
                            value={plant.extraPlantsPerTray || ""}
                            onChange={(e) => {
                              const value = e.target.value
                              setFormData((prev) => {
                                const updatedPlants = [...prev.plants]
                                updatedPlants[plantIndex].extraPlantsPerTray = value

                                if (updatedPlants[plantIndex].selectedCavity) {
                                  handleCrateChange(
                                    plantIndex,
                                    0,
                                    "cavity",
                                    updatedPlants[plantIndex].selectedCavity,
                                    updatedPlants[plantIndex].cavityDetails?.numberPerCrate
                                  )
                                }

                                return { ...prev, plants: [...updatedPlants] }
                              })
                            }}
                            disabled={isViewMode && !isEditing}
                          />
                        </div>

                        {/* Crate Details */}
                        {plant.selectedCavity &&
                          plant.crates?.map((crate, crateIndex) => (
                            <div
                              key={crateIndex}
                              className="grid grid-cols-2 gap-4 p-2 bg-gray-50 rounded">
                              <div className="text-sm">
                                <span className="text-gray-500">Crates: </span>
                                <span className="font-medium">{crate.numberOfCrates}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-500">Plants: </span>
                                <span className="font-medium">{crate.quantity}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>

      <DialogActions className="p-4 bg-gray-50 border-t">
        <Button
          onClick={isEditing ? handleCancelEdit : onClose}
          variant="outlined"
          className="text-gray-600 border-gray-400 hover:bg-gray-100">
          {isEditing || !isViewMode ? "Cancel" : "Close"}
        </Button>
        {isViewMode && !isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="contained"
            className="bg-blue-600 hover:bg-blue-700 text-white">
            Edit
          </Button>
        )}
        {isEditing && (
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white">
            {loading ? "Updating..." : "Save Changes"}
          </Button>
        )}
        {!isViewMode && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white">
            {loading ? "Creating..." : "Create Dispatch"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default DispatchForm
