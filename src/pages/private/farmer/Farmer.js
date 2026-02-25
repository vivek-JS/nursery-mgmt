import React, { useState, useEffect } from "react"
import {
  Dialog,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  useTheme,
  OutlinedInput,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Alert,
  Divider,
  Stack,
  Tabs,
  Tab
} from "@mui/material"
import { Pencil, Plus, Loader, User, MapPin, Calendar, Search, FilterX, List, CheckCircle, Users, UserPlus, Link2 } from "lucide-react"
import { API, NetworkManager } from "network/core"
import LocationSelector from "components/LocationSelector"

const FarmerComponent = () => {
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState(0)
  const [farmers, setFarmers] = useState([])
  const [filteredFarmers, setFilteredFarmers] = useState([])
  const [leads, setLeads] = useState([])
  const [farmerFormLeads, setFarmerFormLeads] = useState([])
  const [publicLinks, setPublicLinks] = useState([])
  const [selectedLinkId, setSelectedLinkId] = useState("")
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [editingFarmer, setEditingFarmer] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    district: "",
    taluka: "",
    village: "",
    stateName: "",
    opt_in: ""
  })

  // Lists for filter options (from API)
  const [filterOptions, setFilterOptions] = useState({
    districts: [],
    talukas: [],
    villages: [],
    states: []
  })

  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: "",
    alternateNumber: "",
    birthdate: ""
  })

  const [locationData, setLocationData] = useState({
    state: "",
    district: "",
    taluka: "",
    village: ""
  })

  // Selection and list management
  const [selectedFarmers, setSelectedFarmers] = useState([])
  const [showListModal, setShowListModal] = useState(false)
  const [farmerLists, setFarmerLists] = useState([])
  const [listModalMode, setListModalMode] = useState("create") // "create" or "add"
  const [newListName, setNewListName] = useState("")
  const [selectedListId, setSelectedListId] = useState("")
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState(null)

  const getFarmers = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMERS)
      const params = {}
      if (filters.district) params.districtName = filters.district
      if (filters.taluka) params.talukaName = filters.taluka
      if (filters.village) params.village = filters.village
      if (filters.opt_in === "true") params.opt_in = true
      if (filters.opt_in === "false") params.opt_in = false
      const response = await instance.request({}, params)
      if (response.data?.data) {
        const data = response.data.data
        const farmersData = Array.isArray(data) ? data : data.farmers || []
        setFarmers(farmersData)
      }
    } catch (error) {
      console.error("Error fetching farmers:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeadsData = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.CALL_ASSIGNMENT.GET_COMBINED)
      const params = {
        source: "lead",
        page: 1,
        limit: 500,
        includeAll: "true",
        search: searchTerm,
        district: filters.district,
        taluka: filters.taluka,
        village: filters.village,
        stateName: filters.stateName,
      }
      if (filters.opt_in === "true") params.opt_in = "true"
      if (filters.opt_in === "false") params.opt_in = "false"
      const res = await instance.request({}, params)
      const d = res?.data?.data ?? res?.data
      setLeads(d?.items ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchFarmerFormData = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.CALL_ASSIGNMENT.GET_COMBINED)
      const params = {
        source: "farmerForm",
        page: 1,
        limit: 500,
        includeAll: "true",
        search: searchTerm,
        district: filters.district,
        taluka: filters.taluka,
        village: filters.village,
        stateName: filters.stateName,
      }
      if (filters.opt_in === "true") params.opt_in = "true"
      if (filters.opt_in === "false") params.opt_in = "false"
      if (selectedLinkId) params.linkId = selectedLinkId
      const res = await instance.request({}, params)
      const d = res?.data?.data ?? res?.data
      setFarmerFormLeads(d?.items ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchFilterOptions = async (source) => {
    try {
      const instance = NetworkManager(API.CALL_ASSIGNMENT.GET_FILTER_VALUES)
      const params = { source }
      if (source === "farmerForm" && selectedLinkId) params.linkId = selectedLinkId
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

  useEffect(() => {
    getFarmers()
    fetchFarmerLists()
    fetchFilterOptions("farmer")
    fetchPublicLinks()
  }, [])

  useEffect(() => {
    const src = activeTab === 0 ? "farmer" : activeTab === 1 ? "lead" : "farmerForm"
    fetchFilterOptions(src)
  }, [activeTab, selectedLinkId])

  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === 0) getFarmers()
      else if (activeTab === 1) fetchLeadsData()
      else if (activeTab === 2 && selectedLinkId) fetchFarmerFormData()
    }, 300)
    return () => clearTimeout(t)
  }, [filters, searchTerm, activeTab, selectedLinkId])

  const fetchFarmerLists = async () => {
    try {
      const instance = NetworkManager(API.FARMER_LIST.GET_ALL_LISTS)
      const response = await instance.request()
      if (response.data?.data) {
        setFarmerLists(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching farmer lists:", error)
    }
  }

  // Client-side search for farmers tab only
  useEffect(() => {
    if (activeTab !== 0) return
    let result = [...farmers]
    if (searchTerm) {
      result = result.filter((f) =>
        String(f.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(f.mobileNumber || "").includes(searchTerm)
      )
    }
    setFilteredFarmers(result)
  }, [farmers, searchTerm, activeTab])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilters({
      district: "",
      taluka: "",
      village: "",
      stateName: "",
      opt_in: ""
    })
  }

  const handleTabChange = (_, v) => {
    setActiveTab(v)
    setSelectedFarmers([])
  }

  const handleLinkChange = (e) => {
    setSelectedLinkId(e.target.value)
  }

  const displayItems = activeTab === 0 ? filteredFarmers : activeTab === 1 ? leads : farmerFormLeads

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const instance = NetworkManager(
        editingFarmer ? API.FARMER.UPDATE_FARMER : API.FARMER.CREATE_FARMER
      )
      const payload = editingFarmer
        ? {
            ...formData,
            ...locationData,
            id: editingFarmer.id
          }
        : { ...formData, ...locationData }

      await instance.request(payload)
      await getFarmers()
      setIsOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error submitting farmer:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (farmer) => {
    setEditingFarmer(farmer)
    setFormData({
      name: farmer.name,
      mobileNumber: farmer.mobileNumber || "",
      alternateNumber: farmer.alternateNumber || "",
      birthdate: farmer.birthdate || ""
    })
    setLocationData({
      state: farmer.state || "",
      district: farmer.district || "",
      taluka: farmer.taluka || "",
      village: farmer.village || ""
    })
    setIsOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      mobileNumber: "",
      alternateNumber: "",
      birthdate: ""
    })
    setLocationData({
      state: "",
      district: "",
      taluka: "",
      village: ""
    })
    setEditingFarmer(null)
  }

  const handleSelectFarmer = (farmerId) => {
    setSelectedFarmers((prev) =>
      prev.includes(farmerId)
        ? prev.filter((id) => id !== farmerId)
        : [...prev, farmerId]
    )
  }

  const handleSelectAll = () => {
    if (activeTab !== 0) return
    const items = displayItems
    if (selectedFarmers.length === items.length) {
      setSelectedFarmers([])
    } else {
      setSelectedFarmers(items.map((f) => f._id || f.id))
    }
  }

  const handleAddToList = () => {
    if (selectedFarmers.length === 0) {
      setListError("Please select at least one farmer")
      return
    }
    setListModalMode("add")
    setShowListModal(true)
    setListError(null)
  }

  const handleCreateList = () => {
    if (selectedFarmers.length === 0) {
      setListError("Please select at least one farmer")
      return
    }
    setListModalMode("create")
    setShowListModal(true)
    setListError(null)
  }

  const handleSaveToList = async () => {
    setListLoading(true)
    setListError(null)

    try {
      const farmerIds = selectedFarmers

      if (listModalMode === "create") {
        if (!newListName.trim()) {
          setListError("Please enter a list name")
          setListLoading(false)
          return
        }

        const instance = NetworkManager(API.FARMER_LIST.CREATE_LIST)
        await instance.request({
          name: newListName.trim(),
          farmerIds: farmerIds
        })

        alert(`✅ List "${newListName}" created with ${farmerIds.length} farmers!`)
      } else {
        if (!selectedListId) {
          setListError("Please select a list")
          setListLoading(false)
          return
        }

        // Use the endpoint with the list ID
        const addEndpoint = {
          ...API.FARMER_LIST.ADD_FARMERS_TO_LIST,
          endpoint: `farmer-list/${selectedListId}/add-farmers`
        }
        const addInstance = NetworkManager(addEndpoint)
        await addInstance.request({
          farmerIds: farmerIds
        })

        const selectedList = farmerLists.find((l) => l._id === selectedListId)
        alert(`✅ ${farmerIds.length} farmers added to "${selectedList?.name}"!`)
      }

      setShowListModal(false)
      setSelectedFarmers([])
      setNewListName("")
      setSelectedListId("")
      await fetchFarmerLists()
    } catch (error) {
      console.error("Error saving to list:", error)
      setListError(error.response?.data?.message || "Failed to save to list")
    } finally {
      setListLoading(false)
    }
  }

  const cardStyle = {
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 4px 6px rgba(0,0,0,0.07)",
    transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 12px rgba(0,0,0,0.1)"
    }
  }

  return (
    <Box sx={{ padding: "24px", backgroundColor: "#f5f7fa", minHeight: "100vh" }}>
      <Card sx={{ marginBottom: 3, ...cardStyle }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3
            }}>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                display: "flex",
                alignItems: "center",
                gap: 1
              }}>
              <User size={24} />
              Farmer Management
            </Typography>
            {activeTab === 0 && (
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={() => setIsOpen(true)}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": { backgroundColor: theme.palette.primary.dark },
                  borderRadius: "8px",
                  textTransform: "none",
                  fontWeight: 500,
                  padding: "8px 20px"
                }}>
                Add Farmer
              </Button>
            )}
          </Box>

          {/* Tabs */}
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tab icon={<Users size={18} />} iconPosition="start" label={`Farmers (${farmers.length})`} sx={{ textTransform: "none", fontWeight: 600 }} />
            <Tab icon={<UserPlus size={18} />} iconPosition="start" label={`Leads (${leads.length})`} sx={{ textTransform: "none", fontWeight: 600 }} />
            <Tab icon={<Link2 size={18} />} iconPosition="start" label={`Farmer form (${farmerFormLeads.length})`} sx={{ textTransform: "none", fontWeight: 600 }} />
          </Tabs>

          {activeTab === 2 && (
            <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
              <InputLabel>Select farmer form</InputLabel>
              <Select value={selectedLinkId} onChange={handleLinkChange} label="Select farmer form">
                <MenuItem value="">All forms</MenuItem>
                {publicLinks.map((l) => (
                  <MenuItem key={l._id} value={l._id}>{l.name} ({(l.leadCount ?? 0)} · {l.slug})</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Filters Section */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              placeholder="Search by name/phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: "250px", flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
                sx: { borderRadius: "8px" }
              }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Opt-in</InputLabel>
              <Select value={filters.opt_in} onChange={(e) => handleFilterChange("opt_in", e.target.value)} label="Opt-in">
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Opted In</MenuItem>
                <MenuItem value="false">Not Opted In</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>State</InputLabel>
              <Select value={filters.stateName} onChange={(e) => handleFilterChange("stateName", e.target.value)} label="State">
                <MenuItem value="">All</MenuItem>
                {filterOptions.states.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>District</InputLabel>
              <Select value={filters.district} onChange={(e) => handleFilterChange("district", e.target.value)} label="District">
                <MenuItem value="">All</MenuItem>
                {filterOptions.districts.map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Taluka</InputLabel>
              <Select value={filters.taluka} onChange={(e) => handleFilterChange("taluka", e.target.value)} label="Taluka">
                <MenuItem value="">All</MenuItem>
                {filterOptions.talukas.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Village</InputLabel>
              <Select value={filters.village} onChange={(e) => handleFilterChange("village", e.target.value)} label="Village">
                <MenuItem value="">All</MenuItem>
                {filterOptions.villages.map((v) => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<FilterX size={18} />} onClick={clearFilters} sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 500 }}>
              Clear Filters
            </Button>
          </Box>

          {/* Selection Actions - only for Farmers tab */}
          {activeTab === 0 && selectedFarmers.length > 0 && (
            <Box sx={{ mt: 2, display: "flex", gap: 2, alignItems: "center" }}>
              <Chip
                icon={<CheckCircle size={16} />}
                label={`${selectedFarmers.length} farmers selected`}
                color="primary"
                variant="outlined"
              />
              <Button
                variant="contained"
                startIcon={<List size={18} />}
                onClick={handleAddToList}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none",
                  fontWeight: 500
                }}>
                Add to Existing List
              </Button>
              <Button
                variant="outlined"
                startIcon={<Plus size={18} />}
                onClick={handleCreateList}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none",
                  fontWeight: 500
                }}>
                Create New List
              </Button>
              <Button
                variant="text"
                onClick={() => setSelectedFarmers([])}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none"
                }}>
                Clear Selection
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      {loading && !displayItems.length && (activeTab === 0 ? !farmers.length : true) ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "400px",
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.07)"
          }}>
          <Loader className="animate-spin" size={32} />
        </Box>
      ) : (
        <Card sx={cardStyle}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {activeTab === 0 && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedFarmers.length === displayItems.length && displayItems.length > 0}
                        indeterminate={selectedFarmers.length > 0 && selectedFarmers.length < displayItems.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                  {activeTab === 0 && <TableCell sx={{ fontWeight: 600 }}>Birthdate</TableCell>}
                  <TableCell sx={{ fontWeight: 600 }}>Opt-in</TableCell>
                  {activeTab === 0 && <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayItems.map((row) => {
                  const isFarmer = activeTab === 0
                  const id = isFarmer ? (row._id || row.id) : row.sourceId
                  const name = row.name || ""
                  const village = isFarmer ? row.village : row.village
                  const taluka = isFarmer ? (row.talukaName || row.taluka) : row.taluka
                  const district = isFarmer ? (row.districtName || row.district) : row.district
                  const phone = isFarmer ? row.mobileNumber : row.phone
                  const optIn = isFarmer ? row.opt_in : row.opt_in
                  return (
                    <TableRow key={id} sx={{ "&:hover": { backgroundColor: "#f5f7fa" } }}>
                      {activeTab === 0 && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedFarmers.includes(id)}
                            onChange={() => handleSelectFarmer(id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <User size={18} />
                          <Typography>{name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{phone || "-"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <MapPin size={18} />
                          <Box>
                            <Typography variant="body2">{village || "-"}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {[taluka, district].filter(Boolean).join(", ")}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      {activeTab === 0 && (
                        <TableCell>
                          {row.birthdate ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Calendar size={18} />
                              <Typography>{row.birthdate}</Typography>
                            </Box>
                          ) : (
                            <Chip label="-" size="small" sx={{ backgroundColor: "#f0f0f0", fontSize: "0.75rem" }} />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip
                          label={optIn ? "Yes" : "No"}
                          size="small"
                          color={optIn ? "success" : "default"}
                          sx={{ fontSize: "0.75rem" }}
                        />
                      </TableCell>
                      {activeTab === 0 && (
                        <TableCell>
                          <IconButton
                            onClick={() => handleEdit(row)}
                            sx={{
                              color: theme.palette.primary.main,
                              "&:hover": { backgroundColor: `${theme.palette.primary.main}10` }
                            }}>
                            <Pencil size={18} />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
                {!displayItems.length && (
                  <TableRow>
                    <TableCell colSpan={activeTab === 0 ? 7 : 5}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "40px",
                          gap: 2
                        }}>
                        <User size={48} strokeWidth={1} />
                        <Typography variant="body1" color="textSecondary">
                          {activeTab === 0 && farmers.length === 0
                            ? "No farmers found. Add your first farmer to get started!"
                            : activeTab === 1
                            ? "No leads found"
                            : activeTab === 2
                            ? "No farmer form leads found"
                            : "No data matches the selected filters"}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Form Dialog remains the same */}
      <Dialog
        open={isOpen}
        onClose={() => {
          setIsOpen(false)
          resetForm()
        }}
        maxWidth="sm"
        fullWidth>
        {/* Replace the comment in the Dialog component with this content */}
        <DialogTitle sx={{ pb: 1 }}>
          {editingFarmer ? "Edit Farmer Details" : "Add New Farmer"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth
                label="Farmer Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              <TextField
                fullWidth
                label="Mobile Number"
                name="mobileNumber"
                type="tel"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                required
              />
              <TextField
                fullWidth
                label="Alternate Number (Optional)"
                name="alternateNumber"
                type="tel"
                value={formData.alternateNumber}
                onChange={handleInputChange}
              />

              {/* Location Selector */}
              <div className="mt-4">
                <LocationSelector
                  selectedState={locationData.state}
                  selectedDistrict={locationData.district}
                  selectedTaluka={locationData.taluka}
                  selectedVillage={locationData.village}
                  onStateChange={(value) => setLocationData((prev) => ({ ...prev, state: value }))}
                  onDistrictChange={(value) =>
                    setLocationData((prev) => ({ ...prev, district: value }))
                  }
                  onTalukaChange={(value) =>
                    setLocationData((prev) => ({ ...prev, taluka: value }))
                  }
                  onVillageChange={(value) =>
                    setLocationData((prev) => ({ ...prev, village: value }))
                  }
                  required={true}
                  className="mt-2"
                />
              </div>

              <TextField
                fullWidth
                label="Birthdate"
                name="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={handleInputChange}
                InputLabelProps={{
                  shrink: true
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => {
                setIsOpen(false)
                resetForm()
              }}
              variant="outlined"
              sx={{ borderRadius: "8px" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                borderRadius: "8px",
                minWidth: "120px"
              }}>
              {loading ? (
                <Loader size={20} className="animate-spin" />
              ) : editingFarmer ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </DialogActions>
        </form>{" "}
      </Dialog>

      {/* List Management Modal */}
      <Dialog
        open={showListModal}
        onClose={() => {
          setShowListModal(false)
          setListError(null)
          setNewListName("")
          setSelectedListId("")
        }}
        maxWidth="sm"
        fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <List size={24} color="#10b981" />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {listModalMode === "create" ? "Create New List" : "Add to Existing List"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedFarmers.length} farmers selected
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {listError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setListError(null)}>
              {listError}
            </Alert>
          )}

          {listModalMode === "create" ? (
            <TextField
              fullWidth
              label="List Name"
              placeholder="e.g., Papa List, Old Sales Analytics"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
          ) : (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select List</InputLabel>
              <Select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                label="Select List">
                {farmerLists.map((list) => (
                  <MenuItem key={list._id} value={list._id}>
                    {list.name} ({list.farmers?.length || 0} farmers)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Typography variant="body2" color="text.secondary">
            {selectedFarmers.length} farmer{selectedFarmers.length !== 1 ? "s" : ""} will be{" "}
            {listModalMode === "create" ? "added to the new list" : "added to the selected list"}
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => {
              setShowListModal(false)
              setListError(null)
              setNewListName("")
              setSelectedListId("")
            }}
            disabled={listLoading}
            sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveToList}
            disabled={listLoading || (listModalMode === "create" && !newListName.trim()) || (listModalMode === "add" && !selectedListId)}
            startIcon={listLoading ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            sx={{
              borderRadius: 2,
              bgcolor: "#10b981",
              "&:hover": { bgcolor: "#059669" }
            }}>
            {listLoading ? "Saving..." : listModalMode === "create" ? "Create List" : "Add to List"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FarmerComponent
