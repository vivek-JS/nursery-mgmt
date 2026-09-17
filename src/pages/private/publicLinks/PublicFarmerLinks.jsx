import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Switch,
  TextField,
  Typography
} from "@mui/material"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import LinkRoundedIcon from "@mui/icons-material/LinkRounded"
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import PublicLocationRuleSelector from "./PublicLocationRuleSelector"

const C = {
  primary: "#1B7A4E",
  primarySoft: "#E8F5EE",
  ink: "#163027",
  muted: "#5B6B63",
  line: "#D7E3DB",
  surface: "#F7FBF8",
  page: "#F3F7F5"
}

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const emptyForm = () => ({
  name: "",
  slug: "",
  description: "",
  isActive: true,
  locationRules: []
})

const isCompleteRule = (rule) =>
  Boolean(
    rule?.stateCode &&
      rule?.stateName &&
      rule?.districts?.length &&
      rule?.talukas?.length
  )

const PublicFarmerLinks = () => {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLink, setEditingLink] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [linkLeads, setLinkLeads] = useState({})
  const [linkLeadsLoading, setLinkLeadsLoading] = useState({})
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const resetForm = () => {
    setForm(emptyForm())
    setEditingLink(null)
    setSlugTouched(false)
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
    setDialogOpen(true)
  }, [])

  const handleBasicChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "name" && !slugTouched) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleEdit = (link) => {
    setEditingLink(link)
    setSlugTouched(true)
    setForm({
      name: link.name || "",
      slug: link.slug || "",
      description: link.description || "",
      isActive: link.isActive !== false,
      locationRules: Array.isArray(link.locationRules)
        ? link.locationRules.filter((rule) => rule.stateCode)
        : []
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    resetForm()
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

    const validRules = (form.locationRules || []).filter(isCompleteRule)
    if (validRules.length === 0) {
      Toast.error("Select at least one state with district and taluka")
      return
    }

    const incomplete = (form.locationRules || []).filter((rule) => !isCompleteRule(rule))
    if (incomplete.length > 0) {
      Toast.error(
        `Finish location setup for ${incomplete
          .map((rule) => rule.stateName || "selected state")
          .join(", ")}`
      )
      return
    }

    const payload = {
      ...form,
      slug: slugify(form.slug),
      locationRules: validRules
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
      closeDialog()
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
    return `${window.location.origin}/public/add-farmer`
  }, [])

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#fff",
      borderRadius: 2,
      fontSize: 14,
      "& fieldset": { borderColor: C.line },
      "&:hover fieldset": { borderColor: C.primary },
      "&.Mui-focused fieldset": { borderColor: C.primary }
    },
    "& .MuiInputLabel-root.Mui-focused": { color: C.primary }
  }

  return (
    <>
      <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100%", backgroundColor: C.page }}>
        <Box sx={{ maxWidth: 880, mx: "auto" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              mb: 3
            }}>
            <Box>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: -0.3 }}>
                Public Farmer Links
              </Typography>
              <Typography sx={{ fontSize: 13, color: C.muted, mt: 0.5, maxWidth: 520 }}>
                Share a mobile form that only accepts farmers from the states, districts and
                talukas you allow.
              </Typography>
            </Box>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm"
              style={{ backgroundColor: C.primary }}>
              <AddRoundedIcon sx={{ fontSize: 18 }} />
              New Link
            </button>
          </Box>

          <Box
            sx={{
              backgroundColor: "#fff",
              borderRadius: 3,
              border: `1px solid ${C.line}`,
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(22, 48, 39, 0.04)"
            }}>
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                borderBottom: `1px solid ${C.line}`,
                backgroundColor: C.surface,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
                {loading ? "Loading links..." : `${links.length} campaign link${links.length === 1 ? "" : "s"}`}
              </Typography>
            </Box>

            <Box>
              {links.map((link) => {
                const rules = Array.isArray(link.locationRules) ? link.locationRules : []
                return (
                  <Box
                    key={link._id}
                    sx={{
                      px: 2.5,
                      py: 2,
                      borderBottom: `1px solid ${C.line}`,
                      display: "flex",
                      flexDirection: { xs: "column", md: "row" },
                      gap: 1.5,
                      justifyContent: "space-between"
                    }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, color: C.ink }}>
                          {link.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={link.isActive ? "Active" : "Inactive"}
                          sx={{
                            height: 22,
                            fontWeight: 700,
                            backgroundColor: link.isActive ? C.primarySoft : "#F3F4F6",
                            color: link.isActive ? C.primary : C.muted
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: 12, color: C.muted, mt: 0.5 }}>
                        <strong style={{ color: C.ink }}>{link.leadCount ?? 0}</strong> farmers
                        {" · "}
                        <span className="font-mono">{link.slug}</span>
                      </Typography>
                      <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                        {rules.length === 0 ? (
                          <Chip
                            size="small"
                            icon={<PlaceOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                            label="No locations"
                            sx={{ height: 24, backgroundColor: C.surface, color: C.muted }}
                          />
                        ) : (
                          rules.map((rule) => (
                            <Chip
                              key={rule.stateCode}
                              size="small"
                              icon={<PlaceOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                              label={`${rule.stateName || rule.stateCode} · ${rule.districts?.length || 0} dist · ${rule.talukas?.length || 0} tal`}
                              sx={{
                                height: 24,
                                backgroundColor: C.primarySoft,
                                color: C.primary,
                                fontWeight: 600
                              }}
                            />
                          ))
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 12, color: C.primary, mt: 1, wordBreak: "break-all" }}>
                        {publicUrlBase}/{link.slug}
                      </Typography>

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
                        className="mt-2 text-xs font-semibold underline"
                        style={{ color: C.primary }}>
                        {expandedId === link._id ? "Hide details" : "View details & farmers"}
                      </button>

                      {expandedId === link._id && (
                        <Box
                          sx={{
                            mt: 1.25,
                            borderRadius: 2,
                            backgroundColor: C.surface,
                            border: `1px solid ${C.line}`,
                            p: 1.5
                          }}>
                          {rules.map((rule) => (
                            <Box key={rule.stateCode} sx={{ mb: 1.25 }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.ink }}>
                                {rule.stateName || rule.stateCode}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: C.muted, mt: 0.25 }}>
                                Districts:{" "}
                                {(rule.districts || []).map((d) => d.districtName).join(", ") || "—"}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: C.muted }}>
                                Talukas:{" "}
                                {(rule.talukas || []).map((t) => t.talukaName).join(", ") || "—"}
                              </Typography>
                            </Box>
                          ))}

                          <Box sx={{ pt: 1, borderTop: `1px solid ${C.line}` }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.ink }}>
                                Farmers from this link
                              </Typography>
                              {linkLeadsLoading[link._id] && (
                                <Typography sx={{ fontSize: 11, color: C.muted }}>
                                  Loading...
                                </Typography>
                              )}
                            </Box>
                            {Array.isArray(linkLeads[link._id]) && linkLeads[link._id].length > 0 ? (
                              <Box
                                sx={{
                                  maxHeight: 180,
                                  overflowY: "auto",
                                  border: `1px solid ${C.line}`,
                                  borderRadius: 1.5,
                                  backgroundColor: "#fff"
                                }}>
                                <table className="min-w-full text-xs">
                                  <thead style={{ backgroundColor: C.surface }}>
                                    <tr>
                                      <th className="px-2 py-1.5 text-left font-semibold">Name</th>
                                      <th className="px-2 py-1.5 text-left font-semibold">Mobile</th>
                                      <th className="px-2 py-1.5 text-left font-semibold">
                                        Location
                                      </th>
                                      <th className="px-2 py-1.5 text-left font-semibold">
                                        Created
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {linkLeads[link._id].map((lead) => (
                                      <tr key={lead._id} className="border-t border-gray-100">
                                        <td className="px-2 py-1.5">{lead.name || "-"}</td>
                                        <td className="px-2 py-1.5">{lead.mobileNumber || "-"}</td>
                                        <td className="px-2 py-1.5">
                                          {[
                                            lead.villageName,
                                            lead.talukaName,
                                            lead.districtName,
                                            lead.stateName
                                          ]
                                            .filter(Boolean)
                                            .join(", ")}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          {lead.createdAt
                                            ? new Date(lead.createdAt).toLocaleDateString()
                                            : "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </Box>
                            ) : !linkLeadsLoading[link._id] ? (
                              <Typography sx={{ fontSize: 12, color: C.muted }}>
                                No farmers submitted from this link yet.
                              </Typography>
                            ) : null}
                          </Box>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                      <button
                        type="button"
                        onClick={() => handleEdit(link)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border"
                        style={{ borderColor: C.line, color: C.ink }}>
                        <EditOutlinedIcon sx={{ fontSize: 14 }} />
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg"
                        style={{ backgroundColor: C.primarySoft, color: C.primary }}>
                        <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />
                        Copy URL
                      </button>
                    </Box>
                  </Box>
                )
              })}

              {!loading && links.length === 0 && (
                <Box sx={{ px: 3, py: 7, textAlign: "center" }}>
                  <LinkRoundedIcon sx={{ fontSize: 32, color: C.primary, mb: 1 }} />
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: C.ink }}>
                    No public farmer links yet
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: C.muted, mt: 0.5 }}>
                    The create popup is open — add a name and the states this campaign should cover.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={(_, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return
          closeDialog()
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "720px" },
            borderRadius: 4,
            maxHeight: "92vh",
            overflow: "hidden"
          }
        }}>
        <Box
          sx={{
            px: 3,
            py: 2.25,
            background: "linear-gradient(135deg, #1B7A4E 0%, #2E9B68 55%, #3CB47A 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2
          }}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>
              {editingLink ? "Edit public farmer link" : "New public farmer link"}
            </Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.88, mt: 0.4 }}>
              Choose multiple states, then pick districts and talukas farmers can submit from.
            </Typography>
          </Box>
          <IconButton
            onClick={closeDialog}
            sx={{
              color: "#fff",
              backgroundColor: "rgba(255,255,255,0.12)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.22)" }
            }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <DialogContent sx={{ px: 3, py: 2.5, backgroundColor: "#FCFEFC" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${C.line}`,
                backgroundColor: "#fff"
              }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.ink, mb: 1.5 }}>
                Link details
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                <TextField
                  size="small"
                  label="Link name"
                  value={form.name}
                  onChange={(e) => handleBasicChange("name", e.target.value)}
                  placeholder="Maharashtra + Gujarat leads"
                  sx={fieldSx}
                />
                <TextField
                  size="small"
                  label="Slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    handleBasicChange("slug", e.target.value)
                  }}
                  placeholder="mh-gj-leads"
                  sx={fieldSx}
                />
              </Box>
              <TextField
                size="small"
                label="Description (optional)"
                value={form.description}
                onChange={(e) => handleBasicChange("description", e.target.value)}
                placeholder="Internal note for this campaign"
                multiline
                minRows={2}
                sx={{ ...fieldSx, mt: 1.5 }}
                fullWidth
              />
              <Box sx={{ mt: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>
                  Public form is active
                </Typography>
                <Switch
                  checked={form.isActive}
                  onChange={(e) => handleBasicChange("isActive", e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: C.primary },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: C.primary
                    }
                  }}
                />
              </Box>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${C.line}`,
                backgroundColor: "#fff"
              }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.ink }}>
                Allowed locations
              </Typography>
              <Typography sx={{ fontSize: 12, color: C.muted, mb: 1.5 }}>
                Add every state this campaign should cover. Districts and talukas are chosen per
                state.
              </Typography>
              <PublicLocationRuleSelector
                rules={form.locationRules}
                onChange={(locationRules) =>
                  setForm((prev) => ({
                    ...prev,
                    locationRules
                  }))
                }
              />
            </Box>
          </form>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${C.line}`,
            backgroundColor: "#fff",
            gap: 1
          }}>
          <button
            type="button"
            onClick={closeDialog}
            className="px-4 py-2 text-sm font-semibold rounded-xl border"
            style={{ borderColor: C.line, color: C.ink }}>
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-white disabled:opacity-60"
            style={{ backgroundColor: C.primary }}>
            {loading ? "Saving..." : editingLink ? "Save changes" : "Create link"}
          </button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default PublicFarmerLinks
