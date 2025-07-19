import React, { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, ChevronDown, Calendar, Settings, Save, X } from "lucide-react"
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
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
  const variants = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
  }
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 px-8"
  }

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

const Card = ({ className = "", ...props }) => (
  <div
    className={`rounded-xl border bg-card text-card-foreground shadow ${className}`}
    {...props}
  />
)

const CardHeader = ({ className = "", ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
)

const CardTitle = ({ className = "", ...props }) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`} {...props} />
)

const CardContent = ({ className = "", ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
)

const Input = ({ className = "", error, touched, ...props }) => (
  <div>
    <input
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        error && touched ? "border-red-500" : ""
      } ${className}`}
      {...props}
    />
    {error && touched && <div className="mt-1 text-xs text-red-500">{error}</div>}
  </div>
)

const Select = ({ className = "", error, touched, children, ...props }) => (
  <div>
    <select
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        error && touched ? "border-red-500" : ""
      } ${className}`}
      {...props}>
      {children}
    </select>
    {error && touched && <div className="mt-1 text-xs text-red-500">{error}</div>}
  </div>
)

const Label = ({ className = "", ...props }) => (
  <label
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
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
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Slot Management</h2>
            <p className="text-gray-600 mt-1">
              Configure and generate slots for plants and subtypes
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleDeleteAllSlots}
            disabled={deleteLoading}
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            {deleteLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete All Slots
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : plants.length === 0 ? (
        <div className="rounded-lg border bg-yellow-50 p-4 text-yellow-800">
          No plants available. Add plants first before managing slots.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plant Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Plant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plants.map((plant) => (
                  <div
                    key={plant._id}
                    onClick={() => handlePlantSelect(plant)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlant?._id === plant._id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <div className="font-medium">{plant.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {plant.subtypes.length} subtypes
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Slot Configuration Form */}
          {selectedPlant && (
            <Card>
              <CardHeader>
                <CardTitle>Configure Slots for {selectedPlant.name}</CardTitle>
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
                      <div className="space-y-6">
                        {/* Global Settings */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startYear">Start Year</Label>
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
                          <div className="space-y-2">
                            <Label htmlFor="endYear">End Year</Label>
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

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startMonth">Start Month</Label>
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
                          <div className="space-y-2">
                            <Label htmlFor="endMonth">End Month</Label>
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

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="slotSize">Slot Size (Days)</Label>
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
                          <div className="space-y-2">
                            <Label htmlFor="totalPlantsPerSlot">Total Plants per Slot</Label>
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
                          <div className="space-y-2">
                            <Label htmlFor="buffer">Buffer (%)</Label>
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

                        {/* Subtype Configurations */}
                        <div className="space-y-4">
                          <Label>Subtype Configurations</Label>
                          <FieldArray name="subtypeConfigs">
                            {({ push, remove }) => (
                              <>
                                {values.subtypeConfigs.map((config, index) => (
                                  <div key={index} className="p-4 border rounded-lg bg-gray-50">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="font-medium">{config.subtypeName}</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div className="space-y-2">
                                        <Label>Start Date</Label>
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
                                      <div className="space-y-2">
                                        <Label>End Date</Label>
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

                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="space-y-2">
                                        <Label>Slot Size</Label>
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
                                      <div className="space-y-2">
                                        <Label>Total Plants</Label>
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
                                      <div className="space-y-2">
                                        <Label>Buffer (%)</Label>
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
                                ))}
                              </>
                            )}
                          </FieldArray>
                        </div>

                        {/* Message Display */}
                        {message.text && (
                          <div
                            className={`p-4 rounded-lg ${
                              message.type === "success"
                                ? "bg-green-50 text-green-800 border border-green-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}>
                            {message.text}
                          </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end">
                          <Button type="submit" disabled={isSubmitting} className="gap-2">
                            {isSubmitting ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
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
            <div className="flex items-center justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            existingSlots.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Existing Slots Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    {existingSlots.map((slot, index) => (
                      <div key={index} className="text-sm text-gray-600 mb-1">
                        {slot.startDay} - {slot.endDay} ({slot.totalPlants} plants)
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default SlotManager
