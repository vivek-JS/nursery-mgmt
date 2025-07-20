import React, { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, ChevronDown, Settings } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Formik, Form, FieldArray } from "formik"
import * as Yup from "yup"
import SlotManager from "./SlotManager"

// Validation Schema
const plantSchema = Yup.object().shape({
  name: Yup.string().required("Plant name is required"),
  slotSize: Yup.number().required("Slot size is required").min(1, "Slot size must be at least 1"),
  dailyDispatchCapacity: Yup.number()
    .required("Daily dispatch capacity is required")
    .min(1, "Capacity must be at least 1")
    .integer("Capacity must be a whole number"),
  buffer: Yup.number().min(0, "Buffer must be at least 0%").max(100, "Buffer cannot exceed 100%"),
  subtypes: Yup.array()
    .of(
      Yup.object().shape({
        name: Yup.string().required("Subtype name is required"),
        description: Yup.string()
      })
    )
    .min(1, "At least one subtype is required")
})

// UI Components (same as before)
const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
  const variants = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
  }
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs"
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

const Dialog = ({ open, onOpenChange, children }) =>
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="z-50 w-full max-w-md rounded-lg bg-white p-3 shadow-lg">{children}</div>
    </div>
  ) : null

const DialogContent = ({ children, ...props }) => (
  <div className="max-h-[90vh] overflow-y-auto" {...props}>
    {children}
  </div>
)

const DialogHeader = ({ children }) => <div className="mb-4">{children}</div>

const DialogTitle = ({ children }) => <h2 className="text-lg font-semibold">{children}</h2>

const DialogFooter = ({ children }) => (
  <div className="mt-4 flex justify-end space-x-2">{children}</div>
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

const Label = ({ className = "", ...props }) => (
  <label
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    {...props}
  />
)

const Slots = () => {
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editPlant, setEditPlant] = useState(null)
  const [expandedPlants, setExpandedPlants] = useState({})
  const [activeTab, setActiveTab] = useState("plants") // "plants" or "slots"

  const handleOpen = (plant = null) => {
    setEditPlant(plant)
    setOpen(true)
  }

  const handleClose = () => {
    setEditPlant(null)
    setOpen(false)
  }

  const toggleExpand = (plantId) => {
    setExpandedPlants((prev) => ({
      ...prev,
      [plantId]: !prev[plantId]
    }))
  }

  useEffect(() => {
    fetchPlants()
  }, [])

  const handleSubmit = async (values, { resetForm }) => {
    try {
      const payload = {
        name: values.name,
        slotSize: values.slotSize,
        dailyDispatchCapacity: values.dailyDispatchCapacity,
        buffer: values.buffer,
        subtypes: values.subtypes
      }

      const instance = editPlant
        ? NetworkManager(API.plantCms.UPDATE_PLANT)
        : NetworkManager(API.plantCms.POST_NEWPLANT)

      const response = editPlant
        ? await instance.request(payload, [editPlant?._id])
        : await instance.request(payload)

      if (response?.data?.message) {
        fetchPlants() // Refresh plant list
        resetForm()
        handleClose()
      }
    } catch (error) {
      console.error("Error saving plant:", error)
    }
  }

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

  const handleDelete = async (plantId) => {
    try {
      const instance = NetworkManager(API.plantCms.DELETE_PLANT)
      const response = await instance.request({}, [plantId])

      if (response?.data?.message) {
        fetchPlants() // Refresh list after deletion
      }
    } catch (error) {
      console.error("Error deleting plant:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Plant Management</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("plants")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "plants"
                    ? "bg-primary text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}>
                Plants
              </button>
              <button
                onClick={() => setActiveTab("slots")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "slots"
                    ? "bg-primary text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}>
                Slot Management
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "plants" ? (
          <>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Plant Manager</h2>
                <p className="text-gray-600 mt-1">Create and manage plants and subtypes</p>
              </div>
              <Button onClick={() => handleOpen()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Plant
              </Button>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : plants.length === 0 ? (
              <div className="rounded-lg border bg-yellow-50 p-4 text-yellow-800">
                No plants available. Click the Add Plant button to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {plants.map((plant) => (
                  <Card key={plant._id} className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{plant.name}</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpen(plant)}
                            className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(plant._id)}
                            className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-2">
                        <span className="font-medium">Slot Size:</span> {plant.slotSize || "N/A"}
                      </div>
                      <div className="mb-2">
                        <span className="font-medium">Daily Dispatch Capacity:</span>{" "}
                        {plant.dailyDispatchCapacity?.toLocaleString() || "2000"} plants
                      </div>
                      <div className="mb-2">
                        <span className="font-medium">Buffer:</span> {plant.buffer || 0}%
                      </div>
                      <div className="rounded-md border">
                        <button
                          onClick={() => toggleExpand(plant._id)}
                          className="flex w-full items-center justify-between rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100">
                          Subtypes ({plant.subtypes.length})
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedPlants[plant._id] ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {expandedPlants[plant._id] && (
                          <div className="px-4 py-2">
                            <div className="space-y-2">
                              {plant.subtypes.map((subtype) => (
                                <div key={subtype._id} className="rounded-lg bg-gray-50 p-3">
                                  <div className="font-medium">{subtype.name}</div>
                                  {subtype.description && (
                                    <div className="mt-1 text-sm text-gray-600">
                                      {subtype.description}
                                    </div>
                                  )}
                                  <div className="mt-2">
                                    <span className="font-medium">Rates:</span>{" "}
                                    {subtype.rates.join(", ")}
                                  </div>
                                  <div className="mt-1">
                                    <span className="font-medium">Buffer:</span>{" "}
                                    {subtype.buffer || 0}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editPlant ? "Edit Plant" : "Add New Plant"}</DialogTitle>
                </DialogHeader>
                <Formik
                  initialValues={{
                    name: editPlant?.name || "",
                    slotSize: editPlant?.slotSize || "",
                    dailyDispatchCapacity: editPlant?.dailyDispatchCapacity || 2000,
                    buffer: editPlant?.buffer || 0,
                    subtypes: editPlant?.subtypes?.map((subtype) => ({
                      ...subtype,
                      buffer: subtype.buffer !== undefined ? subtype.buffer : 0
                    })) || [{ name: "", description: "", rates: [""], buffer: 0 }]
                  }}
                  validationSchema={plantSchema}
                  onSubmit={handleSubmit}>
                  {({ values, errors, touched, handleChange, handleBlur }) => (
                    <Form>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Plant Name</Label>
                          <Input
                            id="name"
                            name="name"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.name}
                            error={errors.name}
                            touched={touched.name}
                            placeholder="Enter plant name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slotSize">Slot Size</Label>
                          <Input
                            id="slotSize"
                            name="slotSize"
                            type="number"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.slotSize}
                            error={errors.slotSize}
                            touched={touched.slotSize}
                            placeholder="Enter slot size"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dailyDispatchCapacity">Daily Dispatch Capacity</Label>
                          <Input
                            id="dailyDispatchCapacity"
                            name="dailyDispatchCapacity"
                            type="number"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.dailyDispatchCapacity}
                            error={errors.dailyDispatchCapacity}
                            touched={touched.dailyDispatchCapacity}
                            placeholder="Enter daily dispatch capacity"
                          />
                          <p className="text-xs text-gray-500">
                            Maximum number of plants that can be dispatched per day
                          </p>
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
                            placeholder="Enter buffer percentage"
                          />
                          <p className="text-xs text-gray-500">
                            Additional buffer percentage at plant level (0-100%)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Subtypes</Label>
                          <FieldArray name="subtypes">
                            {({ push, remove }) => (
                              <>
                                {values.subtypes.map((subtype, index) => (
                                  <div key={index} className="mb-4 p-4 border rounded-lg">
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                      <Input
                                        name={`subtypes.${index}.name`}
                                        placeholder="Subtype name"
                                        value={subtype.name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors.subtypes?.[index]?.name}
                                        touched={touched.subtypes?.[index]?.name}
                                      />

                                      <Input
                                        name={`subtypes.${index}.description`}
                                        placeholder="Description"
                                        value={subtype.description}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                      />

                                      <div className="flex gap-2">
                                        <Input
                                          name={`subtypes.${index}.buffer`}
                                          placeholder="Buffer %"
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.1"
                                          value={subtype.buffer}
                                          onChange={handleChange}
                                          onBlur={handleBlur}
                                        />
                                        {values.subtypes.length > 1 && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => remove(index)}
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-2 space-y-2 w-96">
                                      <Label>Rates for Subtype {index + 1}</Label>
                                      <FieldArray name={`subtypes.${index}.rates`}>
                                        {({ push, remove }) => (
                                          <>
                                            <div className="flex gap-2">
                                              {subtype.rates.map((rate, rateIndex) => (
                                                <div
                                                  key={rateIndex}
                                                  className="flex items-center gap-2">
                                                  <Input
                                                    name={`subtypes.${index}.rates.${rateIndex}`}
                                                    placeholder="Rate"
                                                    value={rate}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    className="w-32" // Limit width to prevent overflow
                                                  />
                                                  {subtype.rates.length > 1 && (
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => remove(rateIndex)}
                                                      className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                                      <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => push("")}
                                              className="mt-2 gap-2">
                                              <Plus className="h-4 w-4" />
                                              Add Rate
                                            </Button>
                                          </>
                                        )}
                                      </FieldArray>
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    push({ name: "", description: "", rates: [""], buffer: 0 })
                                  }
                                  className="mt-2 gap-2">
                                  <Plus className="h-4 w-4" />
                                  Add Subtype
                                </Button>
                              </>
                            )}
                          </FieldArray>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                          Cancel
                        </Button>
                        <Button type="submit">{editPlant ? "Save Changes" : "Add Plant"}</Button>
                      </DialogFooter>
                    </Form>
                  )}
                </Formik>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <SlotManager />
        )}
      </div>
    </div>
  )
}

export default Slots
