import React, { useState } from "react"
import { Formik, Form, FieldArray } from "formik"
import * as Yup from "yup"
import { Plus, Trash2 } from "lucide-react"
import { API, NetworkManager } from "network/core"
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  MONTHS,
} from "./plantFormUi"

const editSubtypeSchema = Yup.object().shape({
  name: Yup.string().required("Subtype name is required"),
  description: Yup.string(),
  buffer: Yup.number().min(0).max(100),
  plantReadyDays: Yup.number().min(0).integer(),
})

/** Edit subtype name / rates / buffer — does not touch slot generation fields. */
const EditSubtypeModal = ({ open, plant, subtype, onClose, onSuccess }) => {
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (values) => {
    if (!plant?._id || !subtype?._id) return
    setSaving(true)
    try {
      const payload = {
        name: values.name,
        description: values.description,
        rates: (values.rates || []).filter((r) => r !== ""),
        monthlyRates: (values.monthlyRates || []).filter((mr) => mr.month && mr.rate !== ""),
        buffer: Number(values.buffer) || 0,
        plantReadyDays: Number(values.plantReadyDays) || 0,
        raisingRate: Number(values.raisingRate) || 0,
        isBillable: values.isBillable !== false,
      }

      const instance = NetworkManager(API.plantCms.UPDATE_SUBTYPE)
      const response = await instance.request(payload, {
        pathParams: [plant._id, subtype._id],
      })

      if (response?.data?.message) {
        onSuccess?.(payload)
        onClose()
      }
    } catch (error) {
      console.error("Error updating subtype:", error)
      alert(error?.message || "Failed to update subtype. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (!plant || !subtype) return null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Subtype</DialogTitle>
          <p className="text-sm text-gray-500 mt-2">
            Update price &amp; details for{" "}
            <span className="font-semibold text-gray-700">{subtype.name}</span> on{" "}
            <span className="font-semibold text-gray-700">{plant.name}</span>
          </p>
          <p className="text-xs text-amber-700 mt-1 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Slot configuration is managed in Slot Management — not edited here.
          </p>
        </DialogHeader>

        <Formik
          enableReinitialize
          initialValues={{
            name: subtype.name || "",
            description: subtype.description || "",
            rates: Array.isArray(subtype.rates) && subtype.rates.length ? [...subtype.rates] : [""],
            monthlyRates: Array.isArray(subtype.monthlyRates)
              ? subtype.monthlyRates.map((mr) => ({ month: mr.month || "", rate: mr.rate ?? "" }))
              : [],
            buffer: subtype.buffer !== undefined ? subtype.buffer : 0,
            plantReadyDays: subtype.plantReadyDays !== undefined ? subtype.plantReadyDays : 0,
            raisingRate: subtype.raisingRate !== undefined ? subtype.raisingRate : 0,
            isBillable: subtype.isBillable !== false,
          }}
          validationSchema={editSubtypeSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur }) => (
            <Form>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subtype Name</Label>
                    <Input
                      name="name"
                      placeholder="Enter subtype name"
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.name}
                      touched={touched.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      name="description"
                      placeholder="Enter description"
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <Label className="mb-2 block">DC billing</Label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isBillable"
                      checked={values.isBillable !== false}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-semibold">Billable</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        Uncheck for non-billable (separate DC sequence; plant name only on DC — no
                        subtype like &quot;15 No&quot;).
                      </span>
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Buffer (%)</Label>
                    <Input
                      name="buffer"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={values.buffer}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                  {plant.sowingAllowed && (
                    <>
                      <div className="space-y-2">
                        <Label>Plant Ready Days</Label>
                        <Input
                          name="plantReadyDays"
                          type="number"
                          min="0"
                          step="1"
                          value={values.plantReadyDays}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Raising Rate (बियाणे शेतकरी देणार)</Label>
                        <Input
                          name="raisingRate"
                          type="number"
                          min="0"
                          step="0.01"
                          value={values.raisingRate}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        <p className="text-xs text-gray-500">
                          Used when farmer gives seed on the order form.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Default Rate (fallback)</Label>
                  <FieldArray name="rates">
                    {({ push, remove }) => (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {values.rates.map((rate, rateIndex) => (
                            <div key={rateIndex} className="flex items-center gap-2">
                              <Input
                                name={`rates.${rateIndex}`}
                                placeholder="Rate"
                                value={rate}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                className="w-32"
                              />
                              {values.rates.length > 1 && (
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => remove(rateIndex)}
                                  className="px-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => push("")} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Add Rate
                        </Button>
                      </div>
                    )}
                  </FieldArray>
                </div>

                <div className="space-y-3">
                  <Label>Monthly Rates (optional overrides)</Label>
                  <p className="text-xs text-gray-500">
                    Leave months unset to use the default rate above.
                  </p>
                  <FieldArray name="monthlyRates">
                    {({ push, remove }) => (
                      <div className="space-y-2">
                        {(values.monthlyRates || []).map((mr, mrIndex) => (
                          <div key={mrIndex} className="flex items-center gap-2">
                            <select
                              name={`monthlyRates.${mrIndex}.month`}
                              value={mr.month}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              className="h-12 rounded-xl border-2 border-gray-200 bg-white/80 px-3 text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 w-40"
                            >
                              <option value="">Month</option>
                              {MONTHS.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                            <Input
                              name={`monthlyRates.${mrIndex}.rate`}
                              placeholder="Rate"
                              type="number"
                              value={mr.rate}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              className="w-32"
                            />
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => remove(mrIndex)}
                              className="px-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => push({ month: "", rate: "" })}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Monthly Rate
                        </Button>
                      </div>
                    )}
                  </FieldArray>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  )
}

export default EditSubtypeModal
