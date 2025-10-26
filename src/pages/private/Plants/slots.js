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

// Enhanced UI Components with modern aesthetic
const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-105 active:scale-95"
  const variants = {
    default: "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700",
    outline: "border-2 border-gray-200 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-blue-300 hover:text-blue-600 shadow-md hover:shadow-lg",
    danger: "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:from-red-600 hover:to-pink-600",
    success: "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-600"
  }
  const sizes = {
    default: "h-11 px-6 py-2 text-sm",
    sm: "h-9 rounded-lg px-4 text-xs",
    lg: "h-12 px-8 py-3 text-base"
  }

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

const Card = ({ className = "", ...props }) => (
  <div
    className={`rounded-2xl border-0 bg-white/90 backdrop-blur-sm text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${className}`}
    {...props}
  />
)

const CardHeader = ({ className = "", ...props }) => (
  <div className={`flex flex-col space-y-2 p-8 ${className}`} {...props} />
)

const CardTitle = ({ className = "", ...props }) => (
  <h3 className={`text-2xl font-bold leading-tight tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent ${className}`} {...props} />
)

const CardContent = ({ className = "", ...props }) => (
  <div className={`p-8 pt-0 ${className}`} {...props} />
)

const Dialog = ({ open, onOpenChange, children }) =>
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="z-50 w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-xl p-6 shadow-2xl border border-white/20 animate-in fade-in-0 zoom-in-95 duration-300">{children}</div>
    </div>
  ) : null

const DialogContent = ({ children, ...props }) => (
  <div className="max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" {...props}>
    {children}
  </div>
)

const DialogHeader = ({ children }) => <div className="mb-6">{children}</div>

const DialogTitle = ({ children }) => <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{children}</h2>

const DialogFooter = ({ children }) => (
  <div className="mt-6 flex justify-end space-x-3">{children}</div>
)

const Input = ({ className = "", error, touched, ...props }) => (
  <div className="space-y-1">
    <input
      className={`flex h-12 w-full rounded-xl border-2 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-xl ${
        error && touched ? "border-red-400 focus-visible:ring-red-500/50" : "border-gray-200 hover:border-gray-300"
      } ${className}`}
      {...props}
    />
    {error && touched && <div className="text-xs text-red-500 font-medium animate-in slide-in-from-top-1 duration-200">{error}</div>}
  </div>
)

const Label = ({ className = "", ...props }) => (
  <label
    className={`text-sm font-semibold text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
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
        sowingAllowed: values.sowingAllowed || false,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Tab Navigation */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                Plant Management
              </h1>
              <p className="text-gray-600 text-lg">Manage your nursery plants and slot configurations</p>
            </div>
            <div className="flex space-x-3 bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-white/20">
              <button
                onClick={() => setActiveTab("plants")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  activeTab === "plants"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                }`}>
                🌱 Plants
              </button>
              <button
                onClick={() => setActiveTab("slots")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  activeTab === "slots"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                }`}>
                📦 Slot Management
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "plants" ? (
          <>
            <div className="mb-10 flex items-center justify-between bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Plant Manager
                </h2>
                <p className="text-gray-600 text-lg">Create and manage plants and their subtypes</p>
              </div>
              <Button onClick={() => handleOpen()} className="gap-3 text-base px-8 py-4" size="lg">
                <Plus className="h-5 w-5" />
                Add New Plant
              </Button>
            </div>

            {loading ? (
              <div className="flex h-60 items-center justify-center">
                <div className="relative">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                  <div className="absolute inset-0 h-16 w-16 animate-ping rounded-full border-4 border-blue-300 opacity-20" />
                </div>
              </div>
            ) : plants.length === 0 ? (
              <div className="rounded-2xl border-0 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-xl">
                <div className="text-6xl mb-4">🌱</div>
                <h3 className="text-xl font-bold text-amber-800 mb-2">No Plants Found</h3>
                <p className="text-amber-700">Click the &quot;Add New Plant&quot; button to get started with your nursery management.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plants.map((plant) => (
                  <Card key={plant._id} className="group transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-xl group-hover:text-blue-600 transition-colors duration-300">
                            {plant.name}
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                            {plant.sowingAllowed && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Sowing
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpen(plant)}
                            className="gap-2 hover:bg-blue-50 hover:border-blue-300">
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(plant._id)}
                            className="gap-2">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                            <div className="text-sm font-medium text-blue-600 mb-1">Slot Size</div>
                            <div className="text-lg font-bold text-blue-900">{plant.slotSize || "N/A"}</div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                            <div className="text-sm font-medium text-green-600 mb-1">Daily Capacity</div>
                            <div className="text-lg font-bold text-green-900">
                              {plant.dailyDispatchCapacity?.toLocaleString() || "2,000"} plants
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                          <div className="text-sm font-medium text-purple-600 mb-1">Buffer</div>
                          <div className="text-lg font-bold text-purple-900">{plant.buffer || 0}%</div>
                        </div>

                        <div className="rounded-xl border-2 border-gray-100 overflow-hidden">
                          <button
                            onClick={() => toggleExpand(plant._id)}
                            className="flex w-full items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 text-sm font-semibold hover:from-gray-100 hover:to-gray-200 transition-all duration-300">
                            <span className="flex items-center gap-2">
                              <span>Subtypes</span>
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                {plant.subtypes.length}
                              </span>
                            </span>
                            <ChevronDown
                              className={`h-5 w-5 transition-transform duration-300 ${
                                expandedPlants[plant._id] ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {expandedPlants[plant._id] && (
                            <div className="bg-white p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                              {plant.subtypes.map((subtype) => (
                                <div key={subtype._id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                                  <div className="font-semibold text-gray-900 mb-2">{subtype.name}</div>
                                  {subtype.description && (
                                    <div className="text-sm text-gray-600 mb-3">
                                      {subtype.description}
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-700">Rates:</span>
                                      <div className="text-gray-600 mt-1">
                                        {subtype.rates.join(", ")}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Buffer:</span>
                                      <div className="text-gray-600 mt-1">
                                        {subtype.buffer || 0}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
                    sowingAllowed: editPlant?.sowingAllowed || false,
                    subtypes: editPlant?.subtypes?.map((subtype) => ({
                      ...subtype,
                      buffer: subtype.buffer !== undefined ? subtype.buffer : 0,
                      plantReadyDays: subtype.plantReadyDays !== undefined ? subtype.plantReadyDays : 0
                    })) || [{ name: "", description: "", rates: [""], buffer: 0, plantReadyDays: 0 }]
                  }}
                  validationSchema={plantSchema}
                  onSubmit={handleSubmit}>
                  {({ values, errors, touched, handleChange, handleBlur }) => (
                    <Form>
                      <div className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label htmlFor="name" className="text-base">Plant Name</Label>
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
                          <div className="space-y-3">
                            <Label htmlFor="slotSize" className="text-base">Slot Size</Label>
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
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="dailyDispatchCapacity" className="text-base">Daily Dispatch Capacity</Label>
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
                          <div className="bg-blue-50 rounded-xl p-3">
                            <p className="text-sm text-blue-700 font-medium">
                              💡 Maximum number of plants that can be dispatched per day
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="buffer" className="text-base">Buffer (%)</Label>
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
                          <div className="bg-purple-50 rounded-xl p-3">
                            <p className="text-sm text-purple-700 font-medium">
                              📊 Additional buffer percentage at plant level (0-100%)
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                            <div className="flex items-center space-x-3">
                              <input
                                id="sowingAllowed"
                                name="sowingAllowed"
                                type="checkbox"
                                checked={values.sowingAllowed || false}
                                onChange={handleChange}
                                className="h-5 w-5 rounded border-2 border-green-300 text-green-600 focus:ring-green-500 focus:ring-2"
                              />
                              <Label htmlFor="sowingAllowed" className="text-base font-semibold text-green-800 cursor-pointer">
                                🌱 Sowing Allowed
                              </Label>
                            </div>
                            <p className="text-sm text-green-700 mt-2 ml-8">
                              Enable if this plant is grown from seeds/sowing
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-lg font-bold">Subtypes</Label>
                            <div className="bg-blue-50 rounded-xl px-3 py-1">
                              <span className="text-sm font-medium text-blue-700">
                                {values.subtypes.length} subtype{values.subtypes.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <FieldArray name="subtypes">
                            {({ push, remove }) => (
                              <div className="space-y-4">
                                {values.subtypes.map((subtype, index) => (
                                  <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 shadow-lg">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-lg font-semibold text-gray-800">Subtype {index + 1}</h4>
                                      {values.subtypes.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="danger"
                                          size="sm"
                                          onClick={() => remove(index)}
                                          className="gap-2">
                                          <Trash2 className="h-4 w-4" />
                                          Remove
                                        </Button>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Subtype Name</Label>
                                        <Input
                                          name={`subtypes.${index}.name`}
                                          placeholder="Enter subtype name"
                                          value={subtype.name}
                                          onChange={handleChange}
                                          onBlur={handleBlur}
                                          error={errors.subtypes?.[index]?.name}
                                          touched={touched.subtypes?.[index]?.name}
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Description</Label>
                                        <Input
                                          name={`subtypes.${index}.description`}
                                          placeholder="Enter description"
                                          value={subtype.description}
                                          onChange={handleChange}
                                          onBlur={handleBlur}
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Buffer (%)</Label>
                                        <Input
                                          name={`subtypes.${index}.buffer`}
                                          placeholder="0"
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.1"
                                          value={subtype.buffer}
                                          onChange={handleChange}
                                          onBlur={handleBlur}
                                        />
                                      </div>
                                      
                                      {values.sowingAllowed && (
                                        <div className="space-y-2">
                                          <Label className="text-sm font-semibold text-gray-700">Plant Ready Days</Label>
                                          <Input
                                            name={`subtypes.${index}.plantReadyDays`}
                                            placeholder="0"
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={subtype.plantReadyDays || 0}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-3">
                                      <Label className="text-sm font-semibold text-gray-700">Rates</Label>
                                      <FieldArray name={`subtypes.${index}.rates`}>
                                        {({ push, remove }) => (
                                          <div className="space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                              {subtype.rates.map((rate, rateIndex) => (
                                                <div key={rateIndex} className="flex items-center gap-2">
                                                  <Input
                                                    name={`subtypes.${index}.rates.${rateIndex}`}
                                                    placeholder="Rate"
                                                    value={rate}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    className="w-32"
                                                  />
                                                  {subtype.rates.length > 1 && (
                                                    <Button
                                                      type="button"
                                                      variant="danger"
                                                      size="sm"
                                                      onClick={() => remove(rateIndex)}
                                                      className="px-2">
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
                                              className="gap-2">
                                              <Plus className="h-4 w-4" />
                                              Add Rate
                                            </Button>
                                          </div>
                                        )}
                                      </FieldArray>
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="lg"
                                  onClick={() =>
                                    push({ name: "", description: "", rates: [""], buffer: 0, plantReadyDays: 0 })
                                  }
                                  className="w-full gap-3 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50">
                                  <Plus className="h-5 w-5" />
                                  Add New Subtype
                                </Button>
                              </div>
                            )}
                          </FieldArray>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} className="px-8">
                          Cancel
                        </Button>
                        <Button type="submit" className="px-8" size="lg">
                          {editPlant ? "💾 Save Changes" : "➕ Add Plant"}
                        </Button>
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
