import React, { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, ChevronDown, Calendar, Settings, Save, X, Leaf, Sparkles, Clock, Target } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Formik, Form, FieldArray } from "formik"
import * as Yup from "yup"

// Validation Schema for Slot Management
const slotManagementSchema = Yup.object().shape({
  plantId: Yup.string().required("Plant is required"),
  startYear: Yup.number()
    .required("Start year is required")
    .min(2020, "Year must be 2020 or later"),
  endYear: Yup.number().required("End year is required").min(2020, "Year must be 2020 or later"),
  startMonth: Yup.string().required("Start month is required"),
  endMonth: Yup.string().required("End month is required"),
  slotSize: Yup.number().required("Slot size is required").min(1, "Slot size must be at least 1"),
  totalPlantsPerSlot: Yup.number()
    .required("Total plants per slot is required")
    .min(1, "Must be at least 1"),
  buffer: Yup.number().min(0, "Buffer must be at least 0%").max(100, "Buffer cannot exceed 100%"),
  selectedSubtypes: Yup.array().min(1, "At least one subtype must be selected"),
  subtypeConfigs: Yup.array().of(
    Yup.object().shape({
      subtypeId: Yup.string().required("Subtype is required"),
      slotSize: Yup.number()
        .required("Slot size is required")
        .min(1, "Slot size must be at least 1"),
      totalPlantsPerSlot: Yup.number()
        .required("Total plants per slot is required")
        .min(1, "Must be at least 1"),
      buffer: Yup.number()
        .min(0, "Buffer must be at least 0%")
        .max(100, "Buffer cannot exceed 100%"),
      startDate: Yup.string().required("Start date is required"),
      endDate: Yup.string().required("End date is required")
    })
  )
})

// UI Components
const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 transform hover:scale-105 active:scale-95"
  const variants = {
    default: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg hover:from-green-700 hover:to-green-800 hover:shadow-xl",
    outline: "border-2 border-green-200 bg-white hover:bg-green-50 hover:border-green-300 text-green-700 hover:text-green-800",
    secondary: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300",
    danger: "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:from-red-600 hover:to-red-700 hover:shadow-xl"
  }
  const sizes = {
    default: "h-10 px-6 py-2",
    sm: "h-8 rounded-lg px-4 text-sm",
    lg: "h-12 px-8 text-lg"
  }

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

const Card = ({ className = "", ...props }) => (
  <div
    className={`rounded-2xl border-2 border-gray-100 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm ${className}`}
    {...props}
  />
)

const CardHeader = ({ className = "", ...props }) => (
  <div className={`flex flex-col space-y-2 p-8 ${className}`} {...props} />
)

const CardTitle = ({ className = "", ...props }) => (
  <h3 className={`text-xl font-bold leading-tight tracking-tight text-gray-800 ${className}`} {...props} />
)

const CardContent = ({ className = "", ...props }) => (
  <div className={`p-8 pt-0 ${className}`} {...props} />
)

const Input = ({ className = "", error, touched, ...props }) => (
  <div>
    <input
      className={`flex h-12 w-full rounded-xl border-2 bg-gradient-to-r from-gray-50 to-white px-4 py-3 text-sm font-medium shadow-inner transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500 disabled:cursor-not-allowed disabled:opacity-50 ${
        error && touched ? "border-red-400 ring-2 ring-red-200" : "border-gray-200 hover:border-gray-300"
      } ${className}`}
      {...props}
    />
    {error && touched && <div className="mt-2 text-sm text-red-500 font-medium flex items-center gap-1">
      <X className="h-4 w-4" />
      {error}
    </div>}
  </div>
)

const Select = ({ className = "", error, touched, children, ...props }) => (
  <div>
    <select
      className={`flex h-12 w-full rounded-xl border-2 bg-gradient-to-r from-gray-50 to-white px-4 py-3 text-sm font-medium shadow-inner transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500 disabled:cursor-not-allowed disabled:opacity-50 ${
        error && touched ? "border-red-400 ring-2 ring-red-200" : "border-gray-200 hover:border-gray-300"
      } ${className}`}
      {...props}>
      {children}
    </select>
    {error && touched && <div className="mt-2 text-sm text-red-500 font-medium flex items-center gap-1">
      <X className="h-4 w-4" />
      {error}
    </div>}
  </div>
)

const Label = ({ className = "", ...props }) => (
  <label
    className={`text-sm font-bold leading-none text-gray-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 ${className}`}
    {...props}
  />
)

const SlotManager = () => {
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPlant, setSelectedPlant] = useState(null)
  const [existingSlots, setExistingSlots] = useState([])
  const [slotLoading, setSlotLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [deleteLoading, setDeleteLoading] = useState(false)

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ]

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i)

  useEffect(() => {
    fetchPlants()
  }, [])

  const fetchPlants = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.plantCms.GET_PLANTS)
      const response = await instance.request()

      if (response?.data?.message) {
        setPlants(response?.data?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }

  const fetchExistingSlots = async (plantId) => {
    setSlotLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SLOTS)
      const response = await instance.request({}, { plantId, year: new Date().getFullYear() })

      if (response?.data?.slots) {
        setExistingSlots(response.data.slots)
      }
    } catch (error) {
      console.error("Error fetching existing slots:", error)
      setExistingSlots([])
    }
    setSlotLoading(false)
  }

  const handlePlantSelect = (plant) => {
    setSelectedPlant(plant)
    if (plant) {
      fetchExistingSlots(plant._id)
    }
    setMessage({ type: "", text: "" })
  }

  const handleDeleteAllSlots = async () => {
    if (
      !window.confirm("Are you sure you want to delete ALL slots? This action cannot be undone.")
    ) {
      return
    }

    setDeleteLoading(true)
    setMessage({ type: "", text: "" })

    try {
      const instance = NetworkManager(API.slots.DELETE_ALL_SLOTS)
      const response = await instance.request()

      if (response?.data?.success) {
        setMessage({
          type: "success",
          text: `Successfully deleted ${response.data.deletedCount} slots!`
        })
        // Refresh existing slots if a plant is selected
        if (selectedPlant) {
          fetchExistingSlots(selectedPlant._id)
        }
      } else {
        setMessage({ type: "error", text: response?.data?.message || "Failed to delete slots" })
      }
    } catch (error) {
      console.error("Error deleting slots:", error)
      setMessage({ type: "error", text: "Error deleting slots. Please try again." })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSubmit = async (values, { resetForm, setSubmitting }) => {
    try {
      setSubmitting(true)
      setMessage({ type: "", text: "" })

      // Call the slot generation API for each subtype
      const results = []
      for (const config of values.subtypeConfigs) {
        const subtypePayload = {
          plantId: values.plantId,
          subtypeId: config.subtypeId,
          slotSize: config.slotSize,
          totalPlantsPerSlot: config.totalPlantsPerSlot,
          buffer: config.buffer,
          startDate: config.startDate,
          endDate: config.endDate
        }

        const instance = NetworkManager(API.slots.CREATE_SLOTS_FOR_SUBTYPE)
        const response = await instance.request(subtypePayload)

        if (response?.data?.success) {
          results.push({
            subtypeName: config.subtypeName,
            success: true,
            data: response.data
          })
        } else {
          results.push({
            subtypeName: config.subtypeName,
            success: false,
            error: response?.data?.message || "Unknown error"
          })
        }
      }

      // Check if all subtypes were processed successfully
      const allSuccessful = results.every((result) => result.success)
      if (allSuccessful) {
        setMessage({ type: "success", text: "All slots generated successfully!" })
        console.log("All slots generated successfully:", results)
        resetForm()
        // Refresh existing slots
        if (selectedPlant) {
          fetchExistingSlots(selectedPlant._id)
        }
      } else {
        const failedSubtypes = results
          .filter((r) => !r.success)
          .map((r) => r.subtypeName)
          .join(", ")
        setMessage({ type: "error", text: `Failed to generate slots for: ${failedSubtypes}` })
        console.error("Some slots failed to generate:", results)
      }
    } catch (error) {
      console.error("Error generating slots:", error)
      setMessage({ type: "error", text: "Error generating slots. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg">
              <Leaf className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
              Slot Management
            </h1>
            <Sparkles className="h-8 w-8 text-yellow-500 animate-pulse" />
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Configure and generate slots for plants and subtypes with precision and ease
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-green-100 rounded-xl">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Quick Actions</h3>
              <p className="text-sm text-gray-600">Manage your slot configurations</p>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={handleDeleteAllSlots}
            disabled={deleteLoading}
            className="gap-3 px-6 py-3">
            {deleteLoading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting All Slots...
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5" />
                Delete All Slots
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center bg-white rounded-2xl shadow-lg">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600">Loading plants...</p>
            </div>
          </div>
        ) : plants.length === 0 ? (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-8 text-center shadow-lg">
            <div className="p-4 bg-yellow-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Leaf className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-yellow-800 mb-2">No Plants Available</h3>
            <p className="text-yellow-700">Add plants first before managing slots.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Plant Selection */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Leaf className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-white">Select Plant</CardTitle>
                </div>
                <p className="text-green-100 text-sm">Choose a plant to configure its slot settings</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {plants.map((plant) => (
                    <div
                      key={plant._id}
                      onClick={() => handlePlantSelect(plant)}
                      className={`group relative p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
                        selectedPlant?._id === plant._id
                          ? "border-green-400 bg-gradient-to-br from-green-50 to-green-100 shadow-lg ring-4 ring-green-200"
                          : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50"
                      }`}>
                      {/* Selection Indicator */}
                      {selectedPlant?._id === plant._id && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full" />
                        </div>
                      )}
                      
                      {/* Plant Icon */}
                      <div className={`p-3 rounded-xl mb-4 transition-colors ${
                        selectedPlant?._id === plant._id 
                          ? "bg-green-500 text-white" 
                          : "bg-gray-100 text-gray-600 group-hover:bg-green-100 group-hover:text-green-600"
                      }`}>
                        <Leaf className="h-8 w-8" />
                      </div>
                      
                      {/* Plant Name - Highlighted */}
                      <div className={`text-xl font-bold mb-2 transition-colors ${
                        selectedPlant?._id === plant._id 
                          ? "text-green-800" 
                          : "text-gray-800 group-hover:text-green-700"
                      }`}>
                        {plant.name}
                      </div>
                      
                      {/* Subtype Count */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="p-1 bg-gray-100 rounded-lg">
                          <Settings className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{plant.subtypes.length} subtypes</span>
                      </div>
                      
                      {/* Hover Effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/0 to-green-600/0 group-hover:from-green-500/5 group-hover:to-green-600/5 transition-all duration-300" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Slot Configuration Form */}
            {selectedPlant && (
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Settings className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-2xl">
                        Configure Slots for 
                        <span className="ml-2 bg-white/20 px-3 py-1 rounded-lg font-bold">
                          {selectedPlant.name}
                        </span>
                      </CardTitle>
                      <p className="text-blue-100 text-sm mt-1">Set up slot parameters and date ranges</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                <Formik
                  initialValues={{
                    plantId: selectedPlant._id,
                    startYear: new Date().getFullYear(),
                    endYear: new Date().getFullYear() + 1,
                    startMonth: "August",
                    endMonth: "December",
                    slotSize: selectedPlant.slotSize || 7,
                    totalPlantsPerSlot: 100000,
                    buffer: selectedPlant.buffer || 0,
                    subtypeConfigs: selectedPlant.subtypes.map((subtype) => ({
                      subtypeId: subtype._id,
                      subtypeName: subtype.name,
                      slotSize: selectedPlant.slotSize || 7,
                      totalPlantsPerSlot: 100000,
                      buffer: subtype.buffer || 0,
                      startDate: "01-01-2025",
                      endDate: "31-12-2025"
                    }))
                  }}
                  validationSchema={slotManagementSchema}
                  onSubmit={handleSubmit}>
                  {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
                    <Form>
                      <div className="space-y-8">
                        {/* Global Settings */}
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border-2 border-gray-100">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-100 rounded-xl">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Global Settings</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <Label htmlFor="startYear" className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Start Year
                              </Label>
                              <Select
                                id="startYear"
                                name="startYear"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.startYear}
                                error={errors.startYear}
                                touched={touched.startYear}>
                                {years.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div className="space-y-3">
                              <Label htmlFor="endYear" className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                End Year
                              </Label>
                              <Select
                                id="endYear"
                                name="endYear"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.endYear}
                                error={errors.endYear}
                                touched={touched.endYear}>
                                {years.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label htmlFor="startMonth" className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Start Month
                            </Label>
                            <Select
                              id="startMonth"
                              name="startMonth"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.startMonth}
                              error={errors.startMonth}
                              touched={touched.startMonth}>
                              {months.map((month) => (
                                <option key={month} value={month}>
                                  {month}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="endMonth" className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              End Month
                            </Label>
                            <Select
                              id="endMonth"
                              name="endMonth"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.endMonth}
                              error={errors.endMonth}
                              touched={touched.endMonth}>
                              {months.map((month) => (
                                <option key={month} value={month}>
                                  {month}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-100">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-100 rounded-xl">
                              <Target className="h-5 w-5 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Slot Parameters</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                              <Label htmlFor="slotSize" className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Slot Size (Days)
                              </Label>
                              <Input
                                id="slotSize"
                                name="slotSize"
                                type="number"
                                min="1"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.slotSize}
                                error={errors.slotSize}
                                touched={touched.slotSize}
                                placeholder="7"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label htmlFor="totalPlantsPerSlot" className="flex items-center gap-2">
                                <Leaf className="h-4 w-4" />
                                Total Plants per Slot
                              </Label>
                              <Input
                                id="totalPlantsPerSlot"
                                name="totalPlantsPerSlot"
                                type="number"
                                min="1"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.totalPlantsPerSlot}
                                error={errors.totalPlantsPerSlot}
                                touched={touched.totalPlantsPerSlot}
                                placeholder="100000"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label htmlFor="buffer" className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Buffer (%)
                              </Label>
                              <Input
                                id="buffer"
                                name="buffer"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.buffer}
                                error={errors.buffer}
                                touched={touched.buffer}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Subtype Configurations */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-100">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 rounded-xl">
                              <Settings className="h-5 w-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Subtype Configurations</h3>
                          </div>
                          <FieldArray name="subtypeConfigs">
                            {({ push, remove }) => (
                              <div className="space-y-6">
                                {values.subtypeConfigs.map((config, index) => (
                                  <div key={index} className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-center justify-between mb-6">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                                          <Leaf className="h-5 w-5 text-white" />
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-800 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                          {config.subtypeName}
                                        </h4>
                                      </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
                                      <h5 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Date Range Configuration
                                      </h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                          <Label className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Start Date
                                          </Label>
                                          <Input
                                            name={`subtypeConfigs.${index}.startDate`}
                                            type="date"
                                            value={(() => {
                                              // Convert DD-MM-YYYY to YYYY-MM-DD for date input
                                              if (config.startDate) {
                                                const [day, month, year] = config.startDate.split("-")
                                                return `${year}-${month.padStart(
                                                  2,
                                                  "0"
                                                )}-${day.padStart(2, "0")}`
                                              }
                                              return ""
                                            })()}
                                            onChange={(e) => {
                                              // Convert YYYY-MM-DD to DD-MM-YYYY format
                                              const date = e.target.value
                                              if (date) {
                                                const [year, month, day] = date.split("-")
                                                const formattedDate = `${day}-${month}-${year}`
                                                handleChange({
                                                  target: {
                                                    name: `subtypeConfigs.${index}.startDate`,
                                                    value: formattedDate
                                                  }
                                                })
                                              }
                                            }}
                                            onBlur={handleBlur}
                                          />
                                        </div>
                                        <div className="space-y-3">
                                          <Label className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            End Date
                                          </Label>
                                          <Input
                                            name={`subtypeConfigs.${index}.endDate`}
                                            type="date"
                                            value={(() => {
                                              // Convert DD-MM-YYYY to YYYY-MM-DD for date input
                                              if (config.endDate) {
                                                const [day, month, year] = config.endDate.split("-")
                                                return `${year}-${month.padStart(
                                                  2,
                                                  "0"
                                                )}-${day.padStart(2, "0")}`
                                              }
                                              return ""
                                            })()}
                                            onChange={(e) => {
                                              // Convert YYYY-MM-DD to DD-MM-YYYY format
                                              const date = e.target.value
                                              if (date) {
                                                const [year, month, day] = date.split("-")
                                                const formattedDate = `${day}-${month}-${year}`
                                                handleChange({
                                                  target: {
                                                    name: `subtypeConfigs.${index}.endDate`,
                                                    value: formattedDate
                                                  }
                                                })
                                              }
                                            }}
                                            onBlur={handleBlur}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                                      <h5 className="text-sm font-bold text-emerald-800 mb-4 flex items-center gap-2">
                                        <Target className="h-4 w-4" />
                                        Slot Parameters
                                      </h5>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-3">
                                          <Label className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Slot Size
                                          </Label>
                                          <Input
                                            name={`subtypeConfigs.${index}.slotSize`}
                                            type="number"
                                            min="1"
                                            value={config.slotSize}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="7"
                                          />
                                        </div>
                                        <div className="space-y-3">
                                          <Label className="flex items-center gap-2">
                                            <Leaf className="h-4 w-4" />
                                            Total Plants
                                          </Label>
                                          <Input
                                            name={`subtypeConfigs.${index}.totalPlantsPerSlot`}
                                            type="number"
                                            min="1"
                                            value={config.totalPlantsPerSlot}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="100000"
                                          />
                                        </div>
                                        <div className="space-y-3">
                                          <Label className="flex items-center gap-2">
                                            <Settings className="h-4 w-4" />
                                            Buffer (%)
                                          </Label>
                                          <Input
                                            name={`subtypeConfigs.${index}.buffer`}
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={config.buffer}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="0"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </FieldArray>
                        </div>

                        {/* Message Display */}
                        {message.text && (
                          <div
                            className={`p-6 rounded-2xl border-2 shadow-lg ${
                              message.type === "success"
                                ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200"
                                : "bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border-red-200"
                            }`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${
                                message.type === "success" 
                                  ? "bg-green-100" 
                                  : "bg-red-100"
                              }`}>
                                {message.type === "success" ? (
                                  <Sparkles className="h-5 w-5 text-green-600" />
                                ) : (
                                  <X className="h-5 w-5 text-red-600" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg">
                                  {message.type === "success" ? "Success!" : "Error!"}
                                </h4>
                                <p className="text-sm">{message.text}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-center pt-6">
                          <Button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="gap-3 px-8 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                            {isSubmitting ? (
                              <>
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Generating Slots...
                              </>
                            ) : (
                              <>
                                <Save className="h-5 w-5" />
                                Generate Slots
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Form>
                  )}
                </Formik>
              </CardContent>
            </Card>
          )}

            {/* Existing Slots Preview */}
            {slotLoading ? (
              <div className="flex items-center justify-center py-12 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-600 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Loading existing slots...</p>
                </div>
              </div>
            ) : (
              existingSlots.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Existing Slots Preview</CardTitle>
                        <p className="text-indigo-100 text-sm">Current slot configuration for {selectedPlant?.name}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-60 overflow-y-auto border-2 border-gray-100 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white">
                      <div className="space-y-2">
                        {existingSlots.map((slot, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="flex items-center gap-3">
                              <div className="p-1 bg-green-100 rounded-lg">
                                <Clock className="h-4 w-4 text-green-600" />
                              </div>
                              <span className="font-medium text-gray-800">
                                {slot.startDay} - {slot.endDay}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Leaf className="h-4 w-4" />
                              <span className="font-bold text-green-600">{slot.totalPlants} plants</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SlotManager
