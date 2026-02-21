import React, { useState, useEffect } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Tabs,
  Tab,
  Pagination,
  Stack,
  IconButton,
  Link,
  alpha,
} from "@mui/material"
import { UserPlus, Copy, ExternalLink, Filter, Users, UserPlus as LeadIcon, Link2 } from "lucide-react"
import { API, NetworkManager } from "network/core"

const PAGE_SIZE = 20

const CallAssignmentList = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [farmers, setFarmers] = useState([])
  const [leads, setLeads] = useState([])
  const [farmerFormLeads, setFarmerFormLeads] = useState([])
  const [farmersMeta, setFarmersMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [leadsMeta, setLeadsMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [farmerFormMeta, setFarmerFormMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [publicLinks, setPublicLinks] = useState([])
  const [selectedLinkId, setSelectedLinkId] = useState("")
  const [loading, setLoading] = useState(false)
  const [lists, setLists] = useState([])
  const [employees, setEmployees] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [filters, setFilters] = useState({ search: "", district: "", taluka: "", village: "", stateName: "" })
  const [filterOptions, setFilterOptions] = useState({ districts: [], talukas: [], villages: [], states: [] })
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignName, setAssignName] = useState("")
  const [assignEmployee, setAssignEmployee] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState(null)
  const [mobileUrl, setMobileUrl] = useState(null)

  const fetchData = async (source, page = 1, linkIdParam) => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.CALL_ASSIGNMENT.GET_COMBINED)
      const params = {
        source,
        page,
        limit: PAGE_SIZE,
        search: filters.search,
        district: filters.district,
        taluka: filters.taluka,
        village: filters.village,
        stateName: filters.stateName,
      }
      if (source === "farmerForm" && (linkIdParam || selectedLinkId)) {
        params.linkId = linkIdParam || selectedLinkId
      }
      const res = await instance.request({}, params)
      const d = res?.data?.data ?? res?.data
      if (source === "farmer") {
        setFarmers(d?.items ?? [])
        setFarmersMeta({ total: d?.total ?? 0, page: d?.page ?? 1, totalPages: d?.totalPages ?? 1 })
      } else if (source === "lead") {
        setLeads(d?.items ?? [])
        setLeadsMeta({ total: d?.total ?? 0, page: d?.page ?? 1, totalPages: d?.totalPages ?? 1 })
      } else if (source === "farmerForm") {
        setFarmerFormLeads(d?.items ?? [])
        setFarmerFormMeta({ total: d?.total ?? 0, page: d?.page ?? 1, totalPages: d?.totalPages ?? 1 })
      } else {
        setFarmers(d?.farmers?.items ?? [])
        setLeads(d?.leads?.items ?? [])
        setFarmersMeta({ total: d?.farmers?.total ?? 0, page: d?.farmers?.page ?? 1, totalPages: d?.farmers?.totalPages ?? 1 })
        setLeadsMeta({ total: d?.leads?.total ?? 0, page: d?.leads?.page ?? 1, totalPages: d?.leads?.totalPages ?? 1 })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchLists = async () => {
    try {
      const instance = NetworkManager({ ...API.CALL_ASSIGNMENT.GET_LISTS, endpoint: "call-assignment/lists" })
      const res = await instance.request()
      const listsData = res?.data?.data?.lists ?? res?.data?.lists
      if (listsData) setLists(listsData)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchEmployees = async () => {
    try {
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE)
      const res = await instance.request()
      const empData = res?.data?.data ?? res?.data
      if (Array.isArray(empData)) setEmployees(empData)
      else if (empData?.data) setEmployees(empData.data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchPublicLinks = async () => {
    try {
      const instance = NetworkManager(API.PUBLIC_LINKS.GET_LINKS)
      const res = await instance.request()
      const d = res?.data?.data ?? res?.data
      setPublicLinks(d?.links ?? [])
    } catch (e) {
      console.error(e)
    }
  }

  const fetchFilterOptions = async (source, linkIdParam) => {
    try {
      const instance = NetworkManager(API.CALL_ASSIGNMENT.GET_FILTER_VALUES)
      const params = { source }
      if (source === "farmerForm" && (linkIdParam || selectedLinkId)) params.linkId = linkIdParam || selectedLinkId
      const res = await instance.request({}, params)
      const d = res?.data?.data ?? res?.data
      setFilterOptions({
        districts: d?.districts ?? [],
        talukas: d?.talukas ?? [],
        villages: d?.villages ?? [],
        states: d?.states ?? [],
      })
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchData("all")
    fetchLists()
    fetchEmployees()
    fetchPublicLinks()
    fetchFilterOptions("farmer")
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchData("all"), 400)
    return () => clearTimeout(t)
  }, [filters.search, filters.district, filters.taluka, filters.village, filters.stateName])

  const handleTabChange = (_, v) => {
    setActiveTab(v)
    setSelected(new Set())
    const src = v === 0 ? "farmer" : v === 1 ? "lead" : "farmerForm"
    fetchFilterOptions(src, v === 2 ? selectedLinkId : null)
    if (v === 0 && farmers.length === 0) fetchData("farmer", 1)
    else if (v === 1 && leads.length === 0) fetchData("lead", 1)
    else if (v === 2) fetchData("farmerForm", 1)
  }

  const handleLinkChange = (e) => {
    const id = e.target.value
    setSelectedLinkId(id)
    setSelected(new Set())
    fetchFilterOptions("farmerForm", id)
    if (id) fetchData("farmerForm", 1, id)
    else setFarmerFormLeads([])
  }

  const handlePageChange = (page) => {
    const src = activeTab === 0 ? "farmer" : activeTab === 1 ? "lead" : "farmerForm"
    fetchData(src, page)
  }

  const items = activeTab === 0 ? farmers : activeTab === 1 ? leads : farmerFormLeads
  const meta = activeTab === 0 ? farmersMeta : activeTab === 1 ? leadsMeta : farmerFormMeta

  const key = (c) => `${c.source}:${c.sourceId}`

  const toggleSelect = (k) => {
    const next = new Set(selected)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    setSelected(next)
  }

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((c) => key(c))))
  }

  const handleAssign = async () => {
    if (!assignName.trim() || !assignEmployee) {
      setAssignError("Name and employee are required")
      return
    }
    setAssignLoading(true)
    setAssignError(null)
    try {
      const itemsToAssign = Array.from(selected).map((k) => {
        const [source, sourceId] = k.split(":")
        return { source, sourceId, ...items.find((c) => key(c) === k) }
      })
      const instance = NetworkManager(API.CALL_ASSIGNMENT.ASSIGN_LIST)
      const res = await instance.request({
        name: assignName.trim(),
        assignedTo: assignEmployee,
        items: itemsToAssign,
      })
      const d = res?.data?.data ?? res?.data
      if (d?.list) {
        setMobileUrl(d.mobileUrl)
        setAssignName("")
        setAssignEmployee("")
        setSelected(new Set())
        fetchLists()
        fetchData(activeTab === 0 ? "farmer" : activeTab === 1 ? "lead" : "farmerForm", meta.page)
      }
    } catch (e) {
      setAssignError(e?.message || "Failed to assign")
    } finally {
      setAssignLoading(false)
    }
  }

  const copyMobileUrl = () => {
    const url = `${window.location.origin}/call-list${mobileUrl?.replace(/^\/call-list/, "") || ""}`
    navigator.clipboard.writeText(url)
  }

  const LocationChip = ({ village, taluka, district }) => {
    const parts = [village, taluka, district].filter(Boolean)
    if (parts.length === 0) return null
    return (
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
        {parts.join(" • ")}
      </Typography>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1000, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: "text.primary" }}>
        Call Assignment
      </Typography>

      <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
            Filters
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              placeholder="Search name/phone"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              sx={{ minWidth: 160 }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>State</InputLabel>
              <Select value={filters.stateName} onChange={(e) => setFilters((f) => ({ ...f, stateName: e.target.value }))} label="State">
                <MenuItem value="">All</MenuItem>
                {filterOptions.states.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>District</InputLabel>
              <Select value={filters.district} onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value }))} label="District">
                <MenuItem value="">All</MenuItem>
                {filterOptions.districts.map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Taluka</InputLabel>
              <Select value={filters.taluka} onChange={(e) => setFilters((f) => ({ ...f, taluka: e.target.value }))} label="Taluka">
                <MenuItem value="">All</MenuItem>
                {filterOptions.talukas.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Village</InputLabel>
              <Select value={filters.village} onChange={(e) => setFilters((f) => ({ ...f, village: e.target.value }))} label="Village">
                <MenuItem value="">All</MenuItem>
                {filterOptions.villages.map((v) => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" startIcon={<Filter size={16} />} onClick={() => fetchData(activeTab === 0 ? "farmer" : activeTab === 1 ? "lead" : "farmerForm", 1)}>
              Refresh
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}>
          <Tab icon={<Users size={18} />} iconPosition="start" label={`Farmers (${farmersMeta.total})`} sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab icon={<LeadIcon size={18} />} iconPosition="start" label={`Leads (${leadsMeta.total})`} sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab icon={<Link2 size={18} />} iconPosition="start" label={`Farmer form (${farmerFormMeta.total})`} sx={{ textTransform: "none", fontWeight: 600 }} />
        </Tabs>
        <CardContent sx={{ p: 0 }}>
          {activeTab === 2 && (
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Select farmer form</InputLabel>
                <Select value={selectedLinkId} onChange={handleLinkChange} label="Select farmer form">
                  <MenuItem value="">All forms</MenuItem>
                  {publicLinks.map((l) => (
                    <MenuItem key={l._id} value={l._id}>
                      {l.name} ({l.slug})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1.5, bgcolor: alpha("#000", 0.02) }}>
            <Typography variant="subtitle2" color="text.secondary">
              {activeTab === 0 ? "Farmers" : activeTab === 1 ? "Leads" : "Farmer form"} • {meta.total} total
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" onClick={selectAll}>
                {selected.size === items.length ? "Deselect all" : "Select all"}
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<UserPlus size={16} />}
                onClick={() => setAssignOpen(true)}
                disabled={selected.size === 0}
                sx={{ bgcolor: "primary.main", "&:hover": { bgcolor: "primary.dark" } }}
              >
                Assign ({selected.size})
              </Button>
            </Stack>
          </Box>

          {loading ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography color="text.secondary">Loading...</Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 420, overflow: "auto" }}>
              {items.map((c) => (
                <Box
                  key={key(c)}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    py: 1.5,
                    px: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:hover": { bgcolor: alpha("#000", 0.02) },
                  }}
                >
                  <Checkbox size="small" checked={selected.has(key(c))} onChange={() => toggleSelect(key(c))} sx={{ mt: 0.5 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.95rem" }}>{c.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                      {c.phone}
                    </Typography>
                    <LocationChip village={c.village} taluka={c.taluka} district={c.district} />
                  </Box>
                  <Chip
                    label={activeTab === 2 ? "form" : c.source}
                    size="small"
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      bgcolor: c.source === "lead" || activeTab === 2 ? alpha("#9c27b0", 0.12) : alpha("#1976d2", 0.12),
                      color: c.source === "lead" || activeTab === 2 ? "#7b1fa2" : "#1565c0",
                    }}
                  />
                </Box>
              ))}
              {items.length === 0 && !loading && (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  {`No ${activeTab === 0 ? "farmers" : activeTab === 1 ? "leads" : "farmer form leads"} found`}
                </Typography>
              )}
            </Box>
          )}

          {meta.totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2, borderTop: 1, borderColor: "divider" }}>
              <Pagination
                count={meta.totalPages}
                page={meta.page}
                onChange={(_, p) => handlePageChange(p)}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
        Assigned lists
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {lists.map((l) => (
          <Card key={l._id} sx={{ minWidth: 240, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <CardContent>
              <Typography fontWeight={600}>{l.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                To: {l.assignedTo?.name || "-"}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                <Chip size="small" label={`${l.done || 0} done`} color="success" />
                <Chip size="small" label={`${l.pending || 0} pending`} variant="outlined" />
              </Stack>
              <Link
                href={`/call-list/${l._id}/${l.publicToken}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1, fontSize: "0.8rem" }}
              >
                <ExternalLink size={14} />
                Mobile link
              </Link>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign list to employee</DialogTitle>
        <DialogContent>
          {assignError && <Typography color="error" sx={{ mb: 1 }}>{assignError}</Typography>}
          <TextField fullWidth label="List name" value={assignName} onChange={(e) => setAssignName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <FormControl fullWidth>
            <InputLabel>Employee</InputLabel>
            <Select value={assignEmployee} onChange={(e) => setAssignEmployee(e.target.value)} label="Employee">
              {employees.map((u) => (
                <MenuItem key={u._id} value={u._id}>
                  {u.name} ({u.phoneNumber})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign} disabled={assignLoading}>
            {assignLoading ? "Assigning..." : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      {mobileUrl && (
        <Dialog open={!!mobileUrl} onClose={() => setMobileUrl(null)}>
          <DialogTitle>Mobile link created</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Share this link with the employee for mobile calling:
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField size="small" fullWidth value={`${window.location.origin}/call-list${mobileUrl.replace(/^\/call-list/, "")}`} readOnly />
              <IconButton onClick={copyMobileUrl} size="small">
                <Copy />
              </IconButton>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMobileUrl(null)}>Close</Button>
            <Button variant="contained" href={`/call-list${mobileUrl.replace(/^\/call-list/, "")}`} target="_blank">
              Open
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}

export default CallAssignmentList
