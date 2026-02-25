import React, { useState, useEffect, useRef } from "react"
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
  Grid,
  InputAdornment,
  Collapse,
  CircularProgress,
  IconButton,
  Link,
  alpha,
} from "@mui/material"
import { UserPlus, Copy, ExternalLink, Filter, Users, UserPlus as LeadIcon, Link2, Search, Plus, Database, FileText } from "lucide-react"
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
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [moreFiltersExpanded, setMoreFiltersExpanded] = useState(false)
  const [oldSalesFilters, setOldSalesFilters] = useState({ plant: "", variety: "", media: "", batch: "", paymentMode: "", reference: "", marketingReference: "", billGivenOrNot: "", verifiedOrNot: "", shadeNo: "", vehicleNo: "", driverName: "" })
  const searchDebounceRef = useRef(null)
  const fileInputRef = useRef(null)
  const [viewListOpen, setViewListOpen] = useState(false)
  const [viewListData, setViewListData] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [entryActionLoading, setEntryActionLoading] = useState(false)

  const fetchData = async (source, page = 1, linkIdParam) => {
    setLoading(true)
    try {
      // Use specific source APIs to match BroadcastListModal behavior
      const commonParams = {
        page,
        limit: PAGE_SIZE,
        q: filters.search || undefined,
        district: filters.district || undefined,
        taluka: filters.taluka || undefined,
        village: filters.village || undefined,
        stateName: filters.stateName || undefined,
      }

      if (source === "farmer") {
        const instance = NetworkManager(API.FARMER.GET_FARMERS)
        const res = await instance.request({}, commonParams)
        const data = res?.data?.data || {}
        const farmersData = Array.isArray(data) ? data : data.farmers || []
        const pagination = data.pagination || {}
        // Normalize farmers to expected UI shape
        const normalizedFarmers = farmersData.map((f) => ({
          ...f,
          source: "farmer",
          sourceId: f._id || f.id,
          phone: String(f.mobileNumber || f.phone || f.mobile || "").replace(/\D/g, "").slice(-10),
        }))
        setFarmers(normalizedFarmers)
        setFarmersMeta({ total: pagination.total ?? normalizedFarmers.length, page: pagination.page ?? page, totalPages: pagination.totalPages ?? 1 })
      } else if (source === "lead") {
        // Old sales unique customers endpoint
        const instance = NetworkManager(API.OLD_SALES.GET_UNIQUE_CUSTOMERS)
        const res = await instance.request({}, commonParams)
        const data = res?.data?.data || {}
        const customers = data.customers || []
        const pagination = data.pagination || {}
        // normalize to leads state shape
        const normalized = customers.map((c, index) => ({
          _id: c._id || `old-sales-${c.mobileNumber}-${(page - 1) * PAGE_SIZE + index}`,
          id: c._id || `old-sales-${c.mobileNumber}-${(page - 1) * PAGE_SIZE + index}`,
          name: c.name || c.customerName || "",
          sourceId: c._id || null,
          phone: String(c.mobileNumber || c.mobileNo || "").replace(/\D/g, "").slice(-10),
          village: c.village || "",
          taluka: c.taluka || "",
          district: c.district || "",
          source: "oldSales",
        }))
        setLeads(normalized)
        setLeadsMeta({ total: pagination.total ?? normalized.length, page: pagination.page ?? page, totalPages: pagination.totalPages ?? 1 })
      } else if (source === "farmerForm") {
        if (linkIdParam || selectedLinkId) {
          const instance = NetworkManager(API.PUBLIC_LINKS.GET_LEADS)
          const params = { page, limit: PAGE_SIZE, q: filters.search }
          const res = await instance.request({}, { pathParams: [linkIdParam || selectedLinkId], ...params })
          const data = res?.data?.data || {}
          const leadsData = data.leads || []
          const pagination = { total: data.total ?? leadsData.length, totalPages: data.totalPages ?? 1 }
          const normalized = leadsData.map((lead) => ({
            ...lead,
            source: "publicLead",
            sourceId: lead._id,
            phone: String(lead.mobileNumber || lead.mobile || "").replace(/\D/g, "").slice(-10),
          }))
          setFarmerFormLeads(normalized)
          setFarmerFormMeta({ total: pagination.total, page, totalPages: pagination.totalPages })
        } else {
          // no link selected - fetch all leads
          const instance = NetworkManager(API.PUBLIC_LINKS.GET_ALL_LEADS)
          const res = await instance.request({}, { page, limit: PAGE_SIZE, q: filters.search })
          const data = res?.data?.data || {}
          const leadsData = data.leads || []
          const pagination = { total: data.total ?? leadsData.length, totalPages: data.totalPages ?? 1 }
          setFarmerFormLeads(leadsData)
          setFarmerFormMeta({ total: pagination.total, page, totalPages: pagination.totalPages })
        }
      } else {
        // fallback to combined
        const instance = NetworkManager(API.CALL_ASSIGNMENT.GET_COMBINED)
        const params = { source: "all", page, limit: PAGE_SIZE }
        const res = await instance.request({}, params)
        const d = res?.data?.data ?? res?.data
        setFarmers(d?.farmers?.items ?? [])
        setLeads(d?.leads?.items ?? [])
        setFarmersMeta({ total: d?.farmers?.total ?? 0, page: page, totalPages: d?.farmers?.totalPages ?? 1 })
        setLeadsMeta({ total: d?.leads?.total ?? 0, page: page, totalPages: d?.leads?.totalPages ?? 1 })
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

  const openListDetails = async (listId) => {
    setViewLoading(true)
    try {
      const instance = NetworkManager(API.CALL_ASSIGNMENT.GET_LIST_BY_ID)
      const res = await instance.request({}, [listId])
      const d = res?.data?.data ?? res?.data
      setViewListData(d?.list || d)
      setViewListOpen(true)
    } catch (e) {
      console.error("Failed to fetch list details:", e)
    } finally {
      setViewLoading(false)
    }
  }

  const handleMarkEntryDone = async (listId, entryIndex, remark = "") => {
    setEntryActionLoading(true)
    try {
      const instance = NetworkManager(API.CALL_ASSIGNMENT.ADD_CALL_LOG)
      // endpoint becomes call-assignment/lists/:id/call-log by passing path params
      await instance.request({ entryIndex, remark, result: "done" }, [listId, "call-log"])
      // refresh lists and view
      fetchLists()
      fetchData(activeTab === 0 ? "farmer" : activeTab === 1 ? "lead" : "farmerForm", meta.page)
      if (viewListData && viewListData._id === listId) {
        openListDetails(listId)
      }
    } catch (e) {
      console.error("Failed to mark entry done:", e)
    } finally {
      setEntryActionLoading(false)
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

  const handleFilterChange = (key, value) => {
    let newFilters = { ...filters, [key]: value }
    // reset dependent fields
    if (key === "district") {
      newFilters = { ...newFilters, taluka: "", village: "" }
      fetchFilterOptions(activeTab === 2 ? "farmerForm" : activeTab === 1 ? "lead" : "farmer", value, "")
    } else if (key === "taluka") {
      newFilters = { ...newFilters, village: "" }
      fetchFilterOptions(activeTab === 2 ? "farmerForm" : activeTab === 1 ? "lead" : "farmer", newFilters.district, value)
    }

    setFilters(newFilters)
    // reset to first page and refetch
    fetchData(activeTab === 0 ? "farmer" : activeTab === 1 ? "lead" : "farmerForm", 1)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      // simple CSV parse: first line headers
      const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean)
      if (lines.length === 0) return
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase())
      const nameIdx = headers.findIndex(h => h.includes("name"))
      const mobileIdx = headers.findIndex(h => h.includes("mobile") || h.includes("phone") || h.includes("number"))
      if (mobileIdx === -1) {
        setError("CSV must include a mobile/phone column")
        return
      }
      const newSelected = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim())
        const mobileRaw = cols[mobileIdx] || ""
        const mobile = String(mobileRaw).replace(/\D/g, "").slice(-10)
        if (!/^\d{10}$/.test(mobile)) continue
        const name = nameIdx >= 0 ? (cols[nameIdx] || "") : ""
        const id = `csv-${mobile}-${Date.now()}-${i}`
        newSelected.push({ _id: id, id, name: name || mobile, phone: mobile, mobileNumber: mobile, source: "csv" })
      }
      if (newSelected.length === 0) {
        setError("No valid rows found in CSV")
        return
      }
      // add CSV rows into selected set (keyed)
      setSelected((prev) => {
        const next = new Set(prev)
        for (const s of newSelected) {
          const k = `csv:${s.id}`
          next.add(k)
        }
        return next
      })
      e.target.value = ""
    }
    reader.readAsText(file)
  }

  const handleOldSalesFilterChange = (key, value) => {
    const newOldSalesFilters = { ...oldSalesFilters, [key]: value }
    setOldSalesFilters(newOldSalesFilters)
    // When old sales filters change, refresh data if on oldSales tab
    if (activeTab === 1) {
      setFarmers([])
      fetchData("lead", 1)
    }
  }

  const handleClearFilters = () => {
    const emptyFilters = { search: "", district: "", taluka: "", village: "", stateName: "" }
    setFilters(emptyFilters)
    setSearchTerm("")
    setOldSalesFilters({ plant: "", variety: "", media: "", batch: "", paymentMode: "", reference: "", marketingReference: "", billGivenOrNot: "", verifiedOrNot: "", shadeNo: "", vehicleNo: "", driverName: "" })
    fetchData(activeTab === 0 ? "farmer" : activeTab === 1 ? "lead" : "farmerForm", 1)
  }

  // Debounced search -> update filters.search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchTerm }))
    }, 400)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchTerm])

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

  const key = (c) => {
    const sid = c.sourceId || c._id || c.id || ""
    const src = c.source || (c.sourceLabel ? (c.sourceLabel.includes("Lead") ? "publicLead" : "farmer") : "farmer")
    return `${src}:${sid}`
  }

  const toggleSelect = (k) => {
    const next = new Set(selected)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    setSelected(next)
  }

  const selectAll = () => {
    // Toggle selection only for currently visible items (avoid mixing pages)
    const visibleKeys = new Set(items.map((c) => key(c)))
    const allVisibleSelected = Array.from(visibleKeys).every((k) => selected.has(k))
    if (allVisibleSelected) {
      // Deselect visible items only
      setSelected((prev) => {
        const next = new Set(prev)
        for (const k of visibleKeys) next.delete(k)
        return next
      })
    } else {
      // Add visible items to selection (keep others)
      setSelected((prev) => {
        const next = new Set(prev)
        for (const k of visibleKeys) next.add(k)
        return next
      })
    }
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
        // find the item matching this key (robust against missing sourceId)
        const matched = items.find((c) => key(c) === k)
        const parts = k.split(":")
        let source = parts[0] || (matched && matched.source) || "farmer"
        let sourceId = parts[1] || (matched && (matched.sourceId || matched._id || matched.id)) || null
        // if still missing, try to use matched._id
        if (!sourceId && matched) sourceId = matched._id || matched.id || null
        return { source, sourceId, ...(matched || {}) }
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
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search name/phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={20} />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>District</InputLabel>
                  <Select value={filters.district} onChange={(e) => handleFilterChange("district", e.target.value)} label="District">
                    <MenuItem value="">All</MenuItem>
                    {filterOptions.districts.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Taluka</InputLabel>
                  <Select value={filters.taluka} onChange={(e) => handleFilterChange("taluka", e.target.value)} label="Taluka">
                    <MenuItem value="">All</MenuItem>
                    {filterOptions.talukas.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Village</InputLabel>
                  <Select value={filters.village} onChange={(e) => handleFilterChange("village", e.target.value)} label="Village">
                    <MenuItem value="">All</MenuItem>
                    {filterOptions.villages.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md="auto">
                <Button size="small" variant="outlined" onClick={handleClearFilters} disabled={!filters.district && !filters.taluka && !filters.village && !searchTerm}>Clear filters</Button>
              </Grid>
              <Grid item xs={12} md="auto">
                <input
                  ref={(el) => (fileInputRef.current = el)}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <Button size="small" variant="outlined" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                  Upload CSV
                </Button>
              </Grid>
              {activeTab === 1 && (
                <Grid item xs={12}>
                  <Button size="small" startIcon={moreFiltersExpanded ? <Plus size={16} /> : <Plus size={16} />} onClick={() => setMoreFiltersExpanded(!moreFiltersExpanded)} sx={{ textTransform: 'none' }}>
                    {moreFiltersExpanded ? "Hide more filters" : "More filters (plant, variety...)"}
                  </Button>
                </Grid>
              )}
            </Grid>
            {activeTab === 1 && moreFiltersExpanded && (
              <Collapse in={moreFiltersExpanded}>
                <Grid container spacing={2} sx={{ mt: 1, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  {[
                    { key: "plant", label: "Plant", options: [] },
                    { key: "variety", label: "Variety", options: [] },
                    { key: "media", label: "Media", options: [] },
                    { key: "batch", label: "Batch", options: [] },
                    { key: "paymentMode", label: "Payment Mode", options: [] },
                  ].map(({ key, label, options }) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <FormControl fullWidth size="small">
                        <InputLabel>{label}</InputLabel>
                        <Select value={oldSalesFilters[key] || ""} onChange={(e) => handleOldSalesFilterChange(key, e.target.value)} label={label}>
                          <MenuItem value="">All</MenuItem>
                          {(options || []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                  ))}
                </Grid>
              </Collapse>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}>
          <Tab icon={<Database size={18} />} iconPosition="start" label={`Old Farmers (${farmersMeta.total})`} sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab icon={<FileText size={18} />} iconPosition="start" label={`Old Sales (${leadsMeta.total})`} sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab icon={<Link2 size={18} />} iconPosition="start" label={`Public Leads (${farmerFormMeta.total})`} sx={{ textTransform: "none", fontWeight: 600 }} />
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
                      {l.name} ({(l.leadCount ?? 0)} · {l.slug})
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
            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <Button size="small" variant="outlined" onClick={() => openListDetails(l._id)}>View</Button>
              <Button size="small" variant="text" onClick={copyMobileUrl}>Copy</Button>
            </Box>
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
      {/* View list details modal */}
      <Dialog open={viewListOpen} onClose={() => setViewListOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>List details</DialogTitle>
        <DialogContent>
          {viewLoading ? (
            <Typography>Loading...</Typography>
          ) : viewListData ? (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>{viewListData.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>Assigned to: {viewListData.assignedTo?.name || "-"}</Typography>
              <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                {(viewListData.entries || []).map((e, idx) => (
                  <Card key={idx} sx={{ mb: 1 }}>
                    <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{e.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{e.phone}</Typography>
                        <Typography variant="caption" color="text.secondary">Status: {e.status}</Typography>
                      </Box>
                      <Box>
                        <TextField size="small" placeholder="Remark (optional)" id={`remark-${idx}`} sx={{ mr: 1 }} />
                        <Button size="small" variant="contained" onClick={async () => {
                          const remark = document.getElementById(`remark-${idx}`).value || ""
                          await handleMarkEntryDone(viewListData._id, idx, remark)
                        }} disabled={entryActionLoading}>
                          {entryActionLoading ? "..." : "Mark Done"}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </>
          ) : (
            <Typography>No data</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewListOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CallAssignmentList
