import React, { useEffect, useMemo, useState } from "react"
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import PublicLocationRuleSelector from "./PublicLocationRuleSelector"

const emptyRule = {
  stateCode: "",
  stateName: "",
  districts: [],
  talukas: [],
  villages: []
}

const PublicFarmerLinks = () => {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLink, setEditingLink] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [linkLeads, setLinkLeads] = useState({})
  const [linkLeadsLoading, setLinkLeadsLoading] = useState({})
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    isActive: true,
    locationRules: [JSON.parse(JSON.stringify(emptyRule))]
  })

  const resetForm = () => {
    setForm({
      name: "",
      slug: "",
      description: "",
      isActive: true,
      locationRules: [JSON.parse(JSON.stringify(emptyRule))]
    })
    setEditingLink(null)
  }

  const loadLinks = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.PUBLIC_LINKS.GET_LINKS)
      const response = await instance.request()
      const data = response?.data?.data?.links || []
      setLinks(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Failed to load public links", e)
      Toast.error("Failed to load public links")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLinks()
    // Open the create-link dialog once when page loads
    setDialogOpen(true)
  }, [])

  const handleBasicChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleRuleUpdate = (index, updatedRule) => {
    setForm((prev) => {
      const next = [...prev.locationRules]
      next[index] = updatedRule
      return {
        ...prev,
        locationRules: next
      }
    })
  }

  const handleRuleChange = (index, field, value) => {
    setForm((prev) => {
      const nextRules = prev.locationRules.map((rule, idx) =>
        idx === index
          ? {
              ...rule,
              [field]: value
            }
          : rule
      )
      return {
        ...prev,
        locationRules: nextRules
      }
    })
  }

  const handleArrayFieldChange = (index, field, updater) => {
    setForm((prev) => {
      const nextRules = prev.locationRules.map((rule, idx) =>
        idx === index
          ? {
              ...rule,
              [field]: updater(rule[field] || [])
            }
          : rule
      )
      return {
        ...prev,
        locationRules: nextRules
      }
    })
  }

  const addRule = () => {
    setForm((prev) => ({
      ...prev,
      locationRules: [...prev.locationRules, JSON.parse(JSON.stringify(emptyRule))]
    }))
  }

  const removeRule = (index) => {
    setForm((prev) => {
      const nextRules = prev.locationRules.filter((_, idx) => idx !== index)
      return {
        ...prev,
        locationRules: nextRules.length > 0 ? nextRules : [JSON.parse(JSON.stringify(emptyRule))]
      }
    })
  }

  const handleEdit = (link) => {
    setEditingLink(link)
    setForm({
      name: link.name || "",
      slug: link.slug || "",
      description: link.description || "",
      isActive: link.isActive !== false,
      locationRules:
        Array.isArray(link.locationRules) && link.locationRules.length > 0
          ? link.locationRules
          : [JSON.parse(JSON.stringify(emptyRule))]
    })
    setDialogOpen(true)
  }

  const loadLeadsForLink = async (linkId) => {
    setLinkLeadsLoading((prev) => ({ ...prev, [linkId]: true }))
    try {
      const instance = NetworkManager(API.PUBLIC_LINKS.GET_LEADS)
      const response = await instance.request(null, [linkId])
      const leads = response?.data?.data?.leads || []
      setLinkLeads((prev) => ({ ...prev, [linkId]: leads }))
    } catch (e) {
      console.error("Failed to load farmer leads for link", e)
      Toast.error("Failed to load farmers for this link")
    } finally {
      setLinkLeadsLoading((prev) => ({ ...prev, [linkId]: false }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.slug) {
      Toast.error("Name and slug are required")
      return
    }

    const rule = form.locationRules?.[0] || emptyRule
    if (
      !rule.stateCode ||
      !rule.stateName ||
      !rule.districts ||
      rule.districts.length === 0 ||
      !rule.talukas ||
      rule.talukas.length === 0 ||
      !rule.villages ||
      rule.villages.length === 0
    ) {
      Toast.error("Please select state, at least one district, taluka and village")
      return
    }

    const payload = {
      ...form,
      locationRules: [rule]
    }

    try {
      setLoading(true)
      if (editingLink?._id) {
        const instance = NetworkManager(API.PUBLIC_LINKS.UPDATE_LINK)
        await instance.request(payload, [editingLink._id])
        Toast.success("Public link updated")
      } else {
        const instance = NetworkManager(API.PUBLIC_LINKS.CREATE_LINK)
        await instance.request(payload)
        Toast.success("Public link created")
      }
      setDialogOpen(false)
      resetForm()
      await loadLinks()
    } catch (e) {
      console.error("Failed to save public link", e)
      const message = e?.response?.data?.message || "Failed to save public link"
      Toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const publicUrlBase = useMemo(() => {
    if (typeof window === "undefined") return ""
    const origin = window.location.origin
    // HashRouter: needs hash prefix for deep links to work
    return `${origin}/#/public/add-farmer`
  }, [])

  return (
    <>
      <div className="p-3 md:p-4 lg:p-6 w-full flex justify-center">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Public Farmer Links</h1>
              <p className="text-sm text-gray-500">
                Create mobile-friendly public links for farmer lead collection with restricted
                locations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
              className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              + New Link
            </button>
          </div>

          {/* List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {loading ? "Loading links..." : `Total Links: ${links.length}`}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {links.map((link) => (
                <div
                  key={link._id}
                  className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{link.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          link.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                        {link.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Slug: <span className="font-mono">{link.slug}</span>
                      </span>
                      <span>
                        Rules: {Array.isArray(link.locationRules) ? link.locationRules.length : 0}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Public URL:{" "}
                      <span className="font-mono break-all">
                        {publicUrlBase}/{link.slug}
                      </span>
                    </div>

                    {/* Accordion details */}
                    {(() => {
                      const primaryRule =
                        Array.isArray(link.locationRules) && link.locationRules.length > 0
                          ? link.locationRules[0]
                          : null
                      if (!primaryRule) return null

                      const district = primaryRule.districts?.[0]
                      const taluka = primaryRule.talukas?.[0]
                      const village = primaryRule.villages?.[0]

                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedId((prev) => {
                                const nextId = prev === link._id ? null : link._id
                                if (nextId && !linkLeads[nextId]) {
                                  loadLeadsForLink(nextId)
                                }
                                return nextId
                              })
                            }}
                            className="mt-2 text-[11px] text-blue-600 hover:text-blue-800 underline">
                            {expandedId === link._id
                              ? "Hide details"
                              : "View details & farmers"}
                          </button>
                          {expandedId === link._id && (
                            <div className="mt-2 rounded-md bg-gray-50 border border-gray-200 p-2 text-[11px] text-gray-700 space-y-2">
                              <div>
                                <span className="font-semibold">State:</span>{" "}
                                {primaryRule.stateName || primaryRule.stateCode || "-"}
                              </div>
                              <div>
                                <span className="font-semibold">District:</span>{" "}
                                {district?.districtName || district?.districtCode || "-"}
                              </div>
                              <div>
                                <span className="font-semibold">Taluka:</span>{" "}
                                {taluka?.talukaName || taluka?.talukaCode || "-"}
                              </div>
                              <div>
                                <span className="font-semibold">Village:</span>{" "}
                                {village?.villageName || "-"}
                              </div>

                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-gray-800">
                                    Farmers from this link
                                  </span>
                                  {linkLeadsLoading[link._id] && (
                                    <span className="text-[11px] text-gray-400">
                                      Loading...
                                    </span>
                                  )}
                                </div>
                                {Array.isArray(linkLeads[link._id]) &&
                                linkLeads[link._id].length > 0 ? (
                                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
                                    <table className="min-w-full text-[11px]">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-2 py-1 text-left font-semibold text-gray-700">
                                            Name
                                          </th>
                                          <th className="px-2 py-1 text-left font-semibold text-gray-700">
                                            Mobile
                                          </th>
                                          <th className="px-2 py-1 text-left font-semibold text-gray-700">
                                            Location
                                          </th>
                                          <th className="px-2 py-1 text-left font-semibold text-gray-700">
                                            Created
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {linkLeads[link._id].map((lead) => (
                                          <tr key={lead._id} className="border-t border-gray-100">
                                            <td className="px-2 py-1">
                                              {lead.name || "-"}
                                            </td>
                                            <td className="px-2 py-1">
                                              {lead.mobileNumber || "-"}
                                            </td>
                                            <td className="px-2 py-1">
                                              {[
                                                lead.villageName,
                                                lead.talukaName,
                                                lead.districtName
                                              ]
                                                .filter(Boolean)
                                                .join(", ")}
                                            </td>
                                            <td className="px-2 py-1">
                                              {lead.createdAt
                                                ? new Date(lead.createdAt).toLocaleDateString()
                                                : "-"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : !linkLeadsLoading[link._id] ? (
                                  <div className="text-[11px] text-gray-500">
                                    No farmers submitted from this link yet.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(link)}
                      className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${publicUrlBase}/${link.slug}`
                        navigator.clipboard
                          .writeText(url)
                          .then(() => Toast.success("Public URL copied"))
                          .catch(() => Toast.error("Failed to copy URL"))
                      }}
                      className="px-3 py-1.5 text-xs rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50">
                      Copy URL
                    </button>
                  </div>
                </div>
              ))}
              {!loading && links.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No public farmer links created yet. Click &quot;New Link&quot; to create one.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal (MUI Dialog) */}
      <Dialog
        open={dialogOpen}
        onClose={(_, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return
          setDialogOpen(false)
          resetForm()
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "60vw" },
            borderRadius: 3,
            maxHeight: "90vh"
          }
        }}>
        <DialogTitle
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <span className="text-sm font-semibold text-gray-800">
            {editingLink ? "Edit Public Farmer Link" : "New Public Farmer Link"}
          </span>
          <button
            type="button"
            onClick={() => {
              setDialogOpen(false)
              resetForm()
            }}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            ×
          </button>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 2.5, py: 2 }}>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Link Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleBasicChange("name", e.target.value)}
                    placeholder="MH Nashik Taluka Lead Campaign"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => handleBasicChange("slug", e.target.value)}
                    placeholder="mh-nashik-leads"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => handleBasicChange("description", e.target.value)}
                  placeholder="Internal description for this campaign"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => handleBasicChange("isActive", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Active (public form accessible)
                </label>
              </div>

              {/* Location rule */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Location Rule</span>
                  <span className="text-[11px] text-gray-500">
                    One state / multiple districts / multiple talukas / multiple villages
                  </span>
                </div>
                {form.locationRules.map((rule, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <PublicLocationRuleSelector
                      rule={rule}
                      onChange={(updated) => handleRuleUpdate(index, updated)}
                    />
                  </div>
                ))}
              </div>
            </form>
          </DialogContent>

          <DialogActions
            sx={{
              px: 2.5,
              py: 1.5,
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "flex-end",
              gap: 1
            }}>
            <button
              type="button"
              onClick={() => {
                setDialogOpen(false)
                resetForm()
              }}
              className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Saving..." : "Save Link"}
            </button>
          </DialogActions>
        </Dialog>
    </>
  )
}

export default PublicFarmerLinks


