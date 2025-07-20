import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from "@mui/material"
import { NetworkManager, API } from "network/core"
import LocationSelector from "components/LocationSelector"
import { Toast } from "helpers/toasts/toastHelper"

const steps = ["Farmer Details", "Location Details", "Order Details", "Review"]

const CreateOrderForm = ({ open, onClose, onOrderCreated }) => {
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Form data
  const [farmerData, setFarmerData] = useState({
    name: "",
    mobileNumber: "",
    alternateNumber: ""
  })

  const [locationData, setLocationData] = useState({
    state: "",
    district: "",
    taluka: "",
    village: ""
  })

  const [orderData, setOrderData] = useState({
    plantType: "",
    plantSubtype: "",
    numberOfPlants: "",
    rate: "",
    bookingSlot: "",
    salesPerson: ""
  })

  // Dropdown options
  const [plants, setPlants] = useState([])
  const [subtypes, setSubtypes] = useState([])
  const [slots, setSlots] = useState([])
  const [salesPeople, setSalesPeople] = useState([])

  // Loading states
  const [loadingOptions, setLoadingOptions] = useState({
    plants: false,
    subtypes: false,
    slots: false,
    salesPeople: false
  })

  useEffect(() => {
    if (open) {
      fetchInitialData()
    }
  }, [open])

  useEffect(() => {
    if (orderData.plantType && orderData.plantSubtype) {
      fetchSlots(orderData.plantType, orderData.plantSubtype)
    }
  }, [orderData.plantType, orderData.plantSubtype])

  const fetchInitialData = async () => {
    setLoadingOptions((prev) => ({ ...prev, plants: true, salesPeople: true }))

    try {
      // Fetch plants
      const plantsInstance = NetworkManager(API.plantCms.GET_PLANTS)
      const plantsResponse = await plantsInstance.request()
      if (plantsResponse.data?.data) {
        setPlants(plantsResponse.data.data)
      }

      // Fetch sales people
      const salesInstance = NetworkManager(API.USER.GET_USERS)
      const salesResponse = await salesInstance.request()
      if (salesResponse.data?.data) {
        const salesPeopleData = salesResponse.data.data.filter(
          (user) => user.jobTitle === "SALES" && !user.isDisabled
        )
        setSalesPeople(salesPeopleData)
      }
    } catch (error) {
      console.error("Error fetching initial data:", error)
      setError("Failed to load initial data")
    } finally {
      setLoadingOptions((prev) => ({ ...prev, plants: false, salesPeople: false }))
    }
  }

  const fetchSlots = async (plantId, subtypeId) => {
    setLoadingOptions((prev) => ({ ...prev, slots: true }))

    try {
      const instance = NetworkManager(API.ORDER.GET_SLOTS)
      const response = await instance.request(
        {},
        {
          plantId: plantId,
          subtypeId: subtypeId,
          year: new Date().getFullYear().toString()
        }
      )

      if (response.data?.slots?.[0]?.slots) {
        const availableSlots = response.data.slots[0].slots
          .filter((slot) => {
            if (!slot.status) return false

            // Calculate available plants considering buffer
            const effectiveBuffer = slot.effectiveBuffer || slot.buffer || 0
            const bufferAmount = Math.round((slot.totalPlants * effectiveBuffer) / 100)
            const bufferAdjustedCapacity = slot.totalPlants - bufferAmount
            const availablePlants = Math.max(
              0,
              bufferAdjustedCapacity - (slot.totalBookedPlants || 0)
            )

            return availablePlants > 0
          })
          .map((slot) => {
            // Calculate available plants considering buffer
            const effectiveBuffer = slot.effectiveBuffer || slot.buffer || 0
            const bufferAmount = Math.round((slot.totalPlants * effectiveBuffer) / 100)
            const bufferAdjustedCapacity = slot.totalPlants - bufferAmount
            const availablePlants = Math.max(
              0,
              bufferAdjustedCapacity - (slot.totalBookedPlants || 0)
            )

            return {
              id: slot._id,
              label: `${slot.startDay} - ${slot.endDay} (${availablePlants} available)`,
              available: availablePlants
            }
          })
        setSlots(availableSlots)
      }
    } catch (error) {
      console.error("Error fetching slots:", error)
      setError("Failed to load available slots")
    } finally {
      setLoadingOptions((prev) => ({ ...prev, slots: false }))
    }
  }

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit()
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError("")

    try {
      // Validate required fields
      if (!farmerData.name || !farmerData.mobileNumber) {
        throw new Error("Farmer name and mobile number are required")
      }

      if (
        !locationData.state ||
        !locationData.district ||
        !locationData.taluka ||
        !locationData.village
      ) {
        throw new Error("All location fields are required")
      }

      if (
        !orderData.plantType ||
        !orderData.plantSubtype ||
        !orderData.numberOfPlants ||
        !orderData.rate ||
        !orderData.bookingSlot ||
        !orderData.salesPerson
      ) {
        throw new Error("All order fields are required")
      }

      // Create farmer first
      const farmerPayload = {
        ...farmerData,
        ...locationData,
        stateName: locationData.state,
        districtName: locationData.district,
        talukaName: locationData.taluka,
        villageName: locationData.village
      }

      const farmerInstance = NetworkManager(API.FARMER.CREATE_FARMER)
      const farmerResponse = await farmerInstance.request(farmerPayload)

      if (!farmerResponse.data?.data) {
        throw new Error("Failed to create farmer")
      }

      const farmerId = farmerResponse.data.data._id

      // Create order
      const orderPayload = {
        farmer: farmerId,
        salesPerson: orderData.salesPerson,
        numberOfPlants: parseInt(orderData.numberOfPlants),
        plantName: orderData.plantType,
        plantSubtype: orderData.plantSubtype,
        bookingSlot: orderData.bookingSlot,
        rate: parseFloat(orderData.rate),
        orderPaymentStatus: "PENDING",
        orderBookingDate: new Date()
      }

      const orderInstance = NetworkManager(API.ORDER.CREATE_DEALER_ORDER)
      const orderResponse = await orderInstance.request(orderPayload)

      if (orderResponse.data?.data) {
        Toast.success("Order created successfully!")
        onOrderCreated && onOrderCreated(orderResponse.data.data)
        handleClose()
      } else {
        throw new Error("Failed to create order")
      }
    } catch (error) {
      console.error("Error creating order:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)

      let errorMessage = "Failed to create order"
      let isSlotError = false

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      // Check for specific slot availability errors
      if (
        errorMessage.includes("Not enough plants available") ||
        errorMessage.includes("No plants available") ||
        errorMessage.includes("Please book in other slots")
      ) {
        console.error("Slot availability error detected:", errorMessage)
        isSlotError = true

        // Extract slot period from error message
        const slotPeriodMatch = errorMessage.match(/Slot period: (.+?)(?:\s*$|\.)/)
        const slotPeriod = slotPeriodMatch ? slotPeriodMatch[1] : ""

        // Create a more user-friendly error message
        const availableMatch = errorMessage.match(/Only (\d+) plants available/)
        const availableCount = availableMatch ? availableMatch[1] : ""

        if (availableCount) {
          errorMessage = `⚠️ Slot Capacity Exceeded!\n\nOnly ${availableCount} plants available in slot: ${slotPeriod}\n\nPlease select a different slot or reduce the order quantity.`
        } else {
          errorMessage = `⚠️ Slot Unavailable!\n\nNo plants available in slot: ${slotPeriod}\n\nPlease select a different slot.`
        }
      } else if (
        errorMessage.includes("delivery") ||
        errorMessage.includes("slot") ||
        errorMessage.includes("date")
      ) {
        console.error("Slot-related error detected:", errorMessage)
        isSlotError = true
        errorMessage = `⚠️ Slot Error: ${errorMessage}\n\nPlease try selecting a different slot.`
      }

      // Show error with different styling based on type
      if (isSlotError) {
        // For slot errors, show a more prominent error
        Toast.error(errorMessage, {
          duration: 8000, // Show for 8 seconds
          style: {
            background: "#fef2f2",
            color: "#dc2626",
            border: "2px solid #fecaca",
            borderRadius: "8px",
            fontSize: "14px",
            lineHeight: "1.5",
            whiteSpace: "pre-line"
          }
        })
      } else {
        Toast.error(errorMessage)
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setActiveStep(0)
    setFarmerData({ name: "", mobileNumber: "", alternateNumber: "" })
    setLocationData({ state: "", district: "", taluka: "", village: "" })
    setOrderData({
      plantType: "",
      plantSubtype: "",
      numberOfPlants: "",
      rate: "",
      bookingSlot: "",
      salesPerson: ""
    })
    setError("")
    onClose()
  }

  const isStepValid = (step) => {
    switch (step) {
      case 0:
        return farmerData.name && farmerData.mobileNumber
      case 1:
        return (
          locationData.state && locationData.district && locationData.taluka && locationData.village
        )
      case 2:
        return (
          orderData.plantType &&
          orderData.plantSubtype &&
          orderData.numberOfPlants &&
          orderData.rate &&
          orderData.bookingSlot &&
          orderData.salesPerson
        )
      default:
        return true
    }
  }

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Farmer Information
            </Typography>
            <TextField
              fullWidth
              label="Farmer Name"
              value={farmerData.name}
              onChange={(e) => setFarmerData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Mobile Number"
              type="tel"
              value={farmerData.mobileNumber}
              onChange={(e) => setFarmerData((prev) => ({ ...prev, mobileNumber: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Alternate Number (Optional)"
              type="tel"
              value={farmerData.alternateNumber}
              onChange={(e) =>
                setFarmerData((prev) => ({ ...prev, alternateNumber: e.target.value }))
              }
            />
          </Box>
        )

      case 1:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Location Details
            </Typography>
            <LocationSelector
              selectedState={locationData.state}
              selectedDistrict={locationData.district}
              selectedTaluka={locationData.taluka}
              selectedVillage={locationData.village}
              onStateChange={(value) => setLocationData((prev) => ({ ...prev, state: value }))}
              onDistrictChange={(value) =>
                setLocationData((prev) => ({ ...prev, district: value }))
              }
              onTalukaChange={(value) => setLocationData((prev) => ({ ...prev, taluka: value }))}
              onVillageChange={(value) => setLocationData((prev) => ({ ...prev, village: value }))}
              required={true}
            />
          </Box>
        )

      case 2:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Order Details
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Plant Type</InputLabel>
              <Select
                value={orderData.plantType}
                onChange={(e) => setOrderData((prev) => ({ ...prev, plantType: e.target.value }))}
                disabled={loadingOptions.plants}>
                {plants.map((plant) => (
                  <MenuItem key={plant._id} value={plant._id}>
                    {plant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Plant Subtype</InputLabel>
              <Select
                value={orderData.plantSubtype}
                onChange={(e) =>
                  setOrderData((prev) => ({ ...prev, plantSubtype: e.target.value }))
                }
                disabled={!orderData.plantType || loadingOptions.subtypes}>
                {orderData.plantType &&
                  plants
                    .find((p) => p._id === orderData.plantType)
                    ?.subtypes?.map((subtype) => (
                      <MenuItem key={subtype._id} value={subtype._id}>
                        {subtype.name}
                      </MenuItem>
                    ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Number of Plants"
              type="number"
              value={orderData.numberOfPlants}
              onChange={(e) =>
                setOrderData((prev) => ({ ...prev, numberOfPlants: e.target.value }))
              }
              required
            />

            <TextField
              fullWidth
              label="Rate per Plant"
              type="number"
              value={orderData.rate}
              onChange={(e) => setOrderData((prev) => ({ ...prev, rate: e.target.value }))}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Booking Slot</InputLabel>
              <Select
                value={orderData.bookingSlot}
                onChange={(e) => setOrderData((prev) => ({ ...prev, bookingSlot: e.target.value }))}
                disabled={!orderData.plantSubtype || loadingOptions.slots}>
                {slots.map((slot) => (
                  <MenuItem key={slot.id} value={slot.id}>
                    {slot.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Slot Capacity Warning */}
            {orderData.bookingSlot &&
              orderData.numberOfPlants &&
              slots.length > 0 &&
              (() => {
                const selectedSlot = slots.find((s) => s.id === orderData.bookingSlot)
                const requestedQuantity = parseInt(orderData.numberOfPlants) || 0
                const availableQuantity = selectedSlot?.available || 0

                if (requestedQuantity > availableQuantity) {
                  return (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: "2px solid #fecaca",
                        backgroundColor: "#fef2f2",
                        display: "flex",
                        alignItems: "center",
                        gap: 2
                      }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: "#dc2626",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "14px",
                          fontWeight: "bold"
                        }}>
                        ⚠️
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="#dc2626"
                          sx={{ mb: 0.5 }}>
                          Slot Capacity Exceeded!
                        </Typography>
                        <Typography variant="body2" color="#7f1d1d">
                          You're trying to book {orderData.numberOfPlants} plants, but only{" "}
                          {availableQuantity} are available in this slot.
                        </Typography>
                        <Typography variant="body2" color="#7f1d1d" sx={{ mt: 0.5 }}>
                          Please select a different slot or reduce the order quantity.
                        </Typography>
                      </Box>
                    </Box>
                  )
                }
                return null
              })()}

            <FormControl fullWidth>
              <InputLabel>Sales Person</InputLabel>
              <Select
                value={orderData.salesPerson}
                onChange={(e) => setOrderData((prev) => ({ ...prev, salesPerson: e.target.value }))}
                disabled={loadingOptions.salesPeople}>
                {salesPeople.map((person) => (
                  <MenuItem key={person._id} value={person._id}>
                    {person.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )

      case 3:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review Order
            </Typography>
            <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Farmer Details:</strong>
              </Typography>
              <Typography>Name: {farmerData.name}</Typography>
              <Typography>Mobile: {farmerData.mobileNumber}</Typography>
              {farmerData.alternateNumber && (
                <Typography>Alternate: {farmerData.alternateNumber}</Typography>
              )}
            </Box>
            <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Order Details:</strong>
              </Typography>
              <Typography>Plants: {orderData.numberOfPlants}</Typography>
              <Typography>Rate: ₹{orderData.rate}</Typography>
              <Typography>Total: ₹{orderData.numberOfPlants * orderData.rate}</Typography>
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" gutterBottom>
          Create New Order
        </Typography>
        <Stepper activeStep={activeStep} sx={{ mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>{renderStepContent(activeStep)}</Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={loading || !isStepValid(activeStep)}>
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : activeStep === steps.length - 1 ? (
            "Create Order"
          ) : (
            "Next"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreateOrderForm
