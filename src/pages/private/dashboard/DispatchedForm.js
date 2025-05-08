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
      if (!plant.cavityGroups || plant.cavityGroups.length === 0) {
        throw new Error(`Please select at least one cavity for ${plant.name}`)
      }

      // Check if every cavity group has a cavity selected
      const emptyCavity = plant.cavityGroups.find((group) => !group.cavity)
      if (emptyCavity) {
        throw new Error(`Please select a cavity for all cavity groups for ${plant.name}`)
      }

      // Check for valid pickup details in each cavity group
      plant.cavityGroups.forEach((cavityGroup) => {
        if (!cavityGroup.pickupDetails || cavityGroup.pickupDetails.length === 0) {
          throw new Error(
            `Please add pickup details for ${plant.name} (Cavity: ${cavityGroup.cavityName})`
          )
        }

        // Check for empty shades
        const emptyShade = cavityGroup.pickupDetails.find((detail) => !detail.shade)
        if (emptyShade) {
          throw new Error(
            `Please select all shades for ${plant.name} (Cavity: ${cavityGroup.cavityName})`
          )
        }

        // Check for valid quantities
        const invalidQuantity = cavityGroup.pickupDetails.find(
          (detail) => !detail.quantity || Number(detail.quantity) <= 0
        )
        if (invalidQuantity) {
          throw new Error(
            `All quantities must be greater than 0 for ${plant.name} (Cavity: ${cavityGroup.cavityName})`
          )
        }

        // Check total pickup quantity for this cavity group
        const pickupTotal = cavityGroup.pickupDetails?.reduce(
          (sum, detail) => sum + Number(detail.quantity),
          0
        )

        if (pickupTotal <= 0) {
          throw new Error(
            `Total pickup quantity must be greater than 0 for ${plant.name} (Cavity: ${cavityGroup.cavityName})`
          )
        }
      })

      // Check if total pickup quantity across all cavity groups matches required plant quantity
      const totalPickup = plant.cavityGroups.reduce(
        (sum, group) =>
          sum + group.pickupDetails.reduce((subSum, detail) => subSum + Number(detail.quantity), 0),
        0
      )

      if (totalPickup !== plant.quantity) {
        throw new Error(
          `Total pickup quantity (${totalPickup}) doesn't match required quantity (${plant.quantity}) for ${plant.name}`
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

      // Transform cavity groups into the expected API format
      const pickupDetailsList = []
      const cratesList = []

      plant.cavityGroups.forEach((cavityGroup) => {
        if (!cavityGroup.cavity) return

        // Process pickup details for this cavity
        cavityGroup.pickupDetails.forEach((detail) => {
          if (!detail.shade || Number(detail.quantity) <= 0) return

          pickupDetailsList.push({
            shade: detail.shade,
            shadeName: detail.shadeName || "",
            quantity: Number(detail.quantity),
            cavity: cavityGroup.cavity,
            cavityName: cavityGroup.cavityName
          })
        })

        // Process crates for this cavity
        if (cavityGroup.crates && cavityGroup.crates.length > 0) {
          const totalCrateCount = cavityGroup.crates.reduce(
            (sum, crate) => sum + (crate.numberOfCrates || 0),
            0
          )

          const totalPlantCount = cavityGroup.crates.reduce(
            (sum, crate) => sum + Number(crate.quantity || 0),
            0
          )

          const crateDetails = cavityGroup.crates
            .map((crate) => ({
              crateCount: crate.numberOfCrates || 0,
              plantCount: Number(crate.quantity || 0)
            }))
            .filter((detail) => detail.crateCount > 0)

          if (crateDetails.length > 0) {
            cratesList.push({
              cavity: cavityGroup.cavity,
              cavityName: cavityGroup.cavityName,
              crateCount: totalCrateCount,
              plantCount: totalPlantCount,
              crateDetails: crateDetails
            })
          }
        }
      })

      return {
        name: plant.name,
        id: plant.id,
        plantId: firstOrder?.plantID || "",
        subTypeId: firstOrder?.plantSubtypeID || "",
        quantity: plant.quantity,
        totalPlants: pickupDetailsList.reduce((sum, detail) => sum + Number(detail.quantity), 0),
        pickupDetails: pickupDetailsList,
        crates: cratesList
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

  const handleAddCavityGroup = (plantIndex) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      if (!updatedPlants[plantIndex].cavityGroups) {
        updatedPlants[plantIndex].cavityGroups = []
      }

      updatedPlants[plantIndex].cavityGroups.push({
        cavity: "",
        cavityName: "",
        pickupDetails: [],
        crates: []
      })

      return { ...prev, plants: updatedPlants }
    })
  }

  const handleCavityChange = (plantIndex, groupIndex, value) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      const selectedCavity = cavities.find((cavity) => cavity.id === value)

      // Check if this cavity is already selected in another group
      const isDuplicate = updatedPlants[plantIndex].cavityGroups.some(
        (group, idx) => idx !== groupIndex && group.cavity === value
      )

      if (isDuplicate) {
        setError(
          `Cavity ${selectedCavity?.name} is already selected. Please choose a different cavity.`
        )
        return prev
      }

      const cavitySize = selectedCavity?.cavity || 1
      const numberPerCrate = selectedCavity?.numberPerCrate || 1

      updatedPlants[plantIndex].cavityGroups[groupIndex] = {
        ...updatedPlants[plantIndex].cavityGroups[groupIndex],
        cavity: value,
        cavityName: selectedCavity?.name || "",
        cavitySize: cavitySize,
        numberPerCrate: numberPerCrate
      }

      // Reset pickup details whenever cavity changes, and ensure they have the cavity reference
      updatedPlants[plantIndex].cavityGroups[groupIndex].pickupDetails = [
        {
          shade: "",
          quantity: 0,
          cavity: value,
          cavityName: selectedCavity?.name || ""
        }
      ]

      // Reset crates
      updatedPlants[plantIndex].cavityGroups[groupIndex].crates = []

      return { ...prev, plants: updatedPlants }
    })
  }

  const handleDeleteCavityGroup = (plantIndex, groupIndex) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      updatedPlants[plantIndex].cavityGroups = updatedPlants[plantIndex].cavityGroups.filter(
        (_, index) => index !== groupIndex
      )
      return { ...prev, plants: updatedPlants }
    })
  }

  const handleAddPickupDetail = (plantIndex, groupIndex) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      const cavityGroup = updatedPlants[plantIndex].cavityGroups[groupIndex]

      // Add the new pickup detail with cavity reference
      cavityGroup.pickupDetails.push({
        shade: "",
        quantity: 0,
        cavity: cavityGroup.cavity,
        cavityName: cavityGroup.cavityName
      })

      return { ...prev, plants: updatedPlants }
    })
  }

  const handlePickupDetailChange = (plantIndex, groupIndex, detailIndex, field, value) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      const cavityGroup = updatedPlants[plantIndex].cavityGroups[groupIndex]

      if (field === "shade") {
        const selectedShade = shades.find((shade) => shade.id === value)
        cavityGroup.pickupDetails[detailIndex][field] = value
        cavityGroup.pickupDetails[detailIndex].shadeName = selectedShade?.name || ""

        // Make sure each pickup detail has the cavity reference
        cavityGroup.pickupDetails[detailIndex].cavity = cavityGroup.cavity
        cavityGroup.pickupDetails[detailIndex].cavityName = cavityGroup.cavityName
      } else {
        cavityGroup.pickupDetails[detailIndex][field] = value
      }

      // Recalculate crates based on the total pickup quantity for this cavity
      const totalQuantity = cavityGroup.pickupDetails.reduce(
        (sum, detail) => sum + Number(detail.quantity),
        0
      )

      if (totalQuantity > 0 && cavityGroup.cavitySize && cavityGroup.numberPerCrate) {
        const cavitySize = Number(cavityGroup.cavitySize)
        const numberPerCrate = Number(cavityGroup.numberPerCrate)

        const numberOfCavityTrays = Math.floor(totalQuantity / cavitySize)
        const remainder = (totalQuantity / cavitySize) % numberPerCrate

        cavityGroup.crates = []

        if (numberOfCavityTrays > 0) {
          cavityGroup.crates.push({
            numberOfCavityTrays: numberOfCavityTrays,
            numberOfCrates: Math.floor(numberOfCavityTrays / numberPerCrate),
            quantity: Math.floor(numberOfCavityTrays / numberPerCrate) * numberPerCrate * cavitySize
          })
        }

        if (remainder > 0) {
          cavityGroup.crates.push({
            numberOfCavityTrays: 1,
            numberOfCrates: 1,
            quantity:
              totalQuantity -
              Math.floor(numberOfCavityTrays / numberPerCrate) * numberPerCrate * cavitySize
          })
        }
      }

      return { ...prev, plants: updatedPlants }
    })
  }

  const handleDeletePickupDetail = (plantIndex, groupIndex, detailIndex) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      const pickupDetails = updatedPlants[plantIndex].cavityGroups[groupIndex].pickupDetails

      if (pickupDetails.length === 1) {
        return prev
      }

      updatedPlants[plantIndex].cavityGroups[groupIndex].pickupDetails = pickupDetails.filter(
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
      // Transform the existing dispatchData to match the new data structure with cavity groups
      const transformedPlants = dispatchData.plants.map((plant) => {
        // Group by cavity
        const cavityGroups = {}

        // Group pickup details by cavity
        if (plant.pickupDetails && plant.pickupDetails.length > 0) {
          plant.pickupDetails.forEach((detail) => {
            const cavityId = detail.cavity || "default"
            if (!cavityGroups[cavityId]) {
              cavityGroups[cavityId] = {
                cavity: detail.cavity,
                cavityName: detail.cavityName || "",
                cavitySize: detail.cavitySize,
                numberPerCrate: detail.numberPerCrate,
                pickupDetails: [],
                crates: []
              }
            }
            // Copy all properties including cavity reference
            cavityGroups[cavityId].pickupDetails.push({
              shade: detail.shade,
              shadeName: detail.shadeName,
              quantity: detail.quantity,
              cavity: detail.cavity,
              cavityName: detail.cavityName
            })
          })
        }

        // Group crates by cavity
        if (plant.crates && plant.crates.length > 0) {
          plant.crates.forEach((crate) => {
            const cavityId = crate.cavity || "default"
            if (cavityGroups[cavityId]) {
              // Convert crateDetails to the format expected in the form
              const transformedCrates =
                crate.crateDetails?.map((detail) => ({
                  numberOfCrates: detail.crateCount || 0,
                  quantity: detail.plantCount || 0,
                  numberOfCavityTrays:
                    Math.ceil(detail.plantCount / cavityGroups[cavityId].cavitySize) || 0
                })) || []

              cavityGroups[cavityId].crates = transformedCrates
            }
          })
        }

        return {
          ...plant,
          cavityGroups: Object.values(cavityGroups)
        }
      })

      setFormData({
        driverName: dispatchData.driverName,
        vehicleName: dispatchData.vehicleName,
        plants: transformedPlants
      })

      const initialExpandedState = transformedPlants?.reduce((acc, plant) => {
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
            // Initialize with empty cavity groups - user must add cavities manually
            cavityGroups: [],
            orders: []
          }
        } else {
          acc[key].quantity += order.quantity || 0
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
                    {/* Add Cavity Button */}
                    {!isViewMode && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleAddCavityGroup(plantIndex)}
                          className="text-sm bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-md border border-green-200">
                          + Add Cavity
                        </button>
                      </div>
                    )}

                    {/* Cavity Groups */}
                    {plant.cavityGroups?.length > 0 ? (
                      <div className="space-y-6">
                        {plant.cavityGroups.map((cavityGroup, groupIndex) => (
                          <div
                            key={groupIndex}
                            className="border rounded-lg bg-white p-4 space-y-4">
                            {/* Cavity Selection */}
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Cavity Selection</h4>
                              {!isViewMode && (
                                <IconButton
                                  onClick={() => handleDeleteCavityGroup(plantIndex, groupIndex)}
                                  disabled={isViewMode}>
                                  <Trash2 size={18} className="text-red-500" />
                                </IconButton>
                              )}
                            </div>

                            <div className="flex gap-4">
                              <select
                                className="flex-1 p-2 border rounded"
                                value={cavityGroup.cavity || ""}
                                onChange={(e) =>
                                  handleCavityChange(plantIndex, groupIndex, e.target.value)
                                }
                                disabled={(isViewMode && !isEditing) || cavityGroup.cavity}>
                                <option value="">Select Cavity</option>
                                {cavities?.map((cavity) => (
                                  <option
                                    key={cavity.id}
                                    value={cavity.id}
                                    disabled={plant.cavityGroups.some(
                                      (group, idx) =>
                                        idx !== groupIndex && group.cavity === cavity.id
                                    )}>
                                    {cavity.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Pickup Details - only shown if cavity is selected */}
                            {cavityGroup.cavity && (
                              <div className="space-y-4 mt-4 pt-4 border-t">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium">
                                    Pickup Details for {cavityGroup.cavityName}
                                  </h4>
                                  {!isViewMode && (
                                    <button
                                      onClick={() => handleAddPickupDetail(plantIndex, groupIndex)}
                                      className="text-sm text-green-600 hover:text-green-700">
                                      + Add Pickup Detail
                                    </button>
                                  )}
                                </div>

                                {cavityGroup.pickupDetails?.map((detail, detailIndex) => (
                                  <div key={detailIndex} className="flex gap-4 items-center">
                                    <select
                                      className="flex-1 p-2 border rounded"
                                      value={detail.shade}
                                      onChange={(e) =>
                                        handlePickupDetailChange(
                                          plantIndex,
                                          groupIndex,
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
                                          groupIndex,
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
                                        onClick={() =>
                                          handleDeletePickupDetail(
                                            plantIndex,
                                            groupIndex,
                                            detailIndex
                                          )
                                        }
                                        disabled={cavityGroup.pickupDetails.length === 1}>
                                        <Trash2 size={20} className="text-red-500" />
                                      </IconButton>
                                    )}
                                  </div>
                                ))}

                                {/* Crate Details */}
                                {cavityGroup.crates?.length > 0 && (
                                  <div className="mt-4 pt-4 border-t">
                                    <h4 className="font-medium mb-2">Crate Details</h4>
                                    <div className="space-y-2">
                                      {cavityGroup.crates.map((crate, crateIndex) => (
                                        <div
                                          key={crateIndex}
                                          className="grid grid-cols-2 gap-4 p-2 bg-gray-50 rounded">
                                          <div className="text-sm">
                                            <span className="text-gray-500">Crates: </span>
                                            <span className="font-medium">
                                              {crate.numberOfCrates}
                                            </span>
                                          </div>
                                          <div className="text-sm">
                                            <span className="text-gray-500">Plants: </span>
                                            <span className="font-medium">{crate.quantity}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500 italic">
                        Please add a cavity to continue
                      </div>
                    )}
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
