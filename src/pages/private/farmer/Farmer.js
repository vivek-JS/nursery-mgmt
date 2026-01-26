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
  Stack
} from "@mui/material"
import { Pencil, Plus, Loader, User, MapPin, Calendar, Search, FilterX, List, CheckCircle } from "lucide-react"
import { API, NetworkManager } from "network/core"
import LocationSelector from "components/LocationSelector"

const FarmerComponent = () => {
  const theme = useTheme()
  const [farmers, setFarmers] = useState([])
  const [filteredFarmers, setFilteredFarmers] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [editingFarmer, setEditingFarmer] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    districts: [],
    talukas: [],
    villages: []
  })

  // Lists for filter options
  const [filterOptions, setFilterOptions] = useState({
    districts: [],
    talukas: [],
    villages: []
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
      const response = await instance.request()
      if (response.data?.data) {
        const farmersData = response.data.data
        setFarmers(farmersData)

        // Extract unique values for filters
        const districts = [...new Set(farmersData.map((f) => f.district))]
        const talukas = [...new Set(farmersData.map((f) => f.taluka))]
        const villages = [...new Set(farmersData.map((f) => f.village))]

        setFilterOptions({
          districts,
          talukas,
          villages
        })
      }
    } catch (error) {
      console.error("Error fetching farmers:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getFarmers()
    fetchFarmerLists()
  }, [])

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

  // Apply filters whenever filters or search term changes
  useEffect(() => {
    let result = [...farmers]

    // Apply search filter
    if (searchTerm) {
      result = result.filter((farmer) =>
        farmer.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply dropdown filters
    if (filters.districts.length) {
      result = result.filter((farmer) => filters.districts.includes(farmer.district))
    }
    if (filters.talukas.length) {
      result = result.filter((farmer) => filters.talukas.includes(farmer.taluka))
    }
    if (filters.villages.length) {
      result = result.filter((farmer) => filters.villages.includes(farmer.village))
    }

    setFilteredFarmers(result)
  }, [farmers, searchTerm, filters])

  const handleFilterChange = (event, filterType) => {
    const {
      target: { value }
    } = event

    setFilters((prev) => ({
      ...prev,
      [filterType]: typeof value === "string" ? value.split(",") : value
    }))
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilters({
      districts: [],
      talukas: [],
      villages: []
    })
  }

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
    if (selectedFarmers.length === filteredFarmers.length) {
      setSelectedFarmers([])
    } else {
      setSelectedFarmers(filteredFarmers.map((f) => f._id || f.id))
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
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => setIsOpen(true)}
              sx={{
                backgroundColor: theme.palette.primary.main,
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark
                },
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 500,
                padding: "8px 20px"
              }}>
              Add Farmer
            </Button>
          </Box>

          {/* Filters Section */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              placeholder="Search by farmer name..."
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

            <FormControl sx={{ minWidth: "200px" }}>
              <InputLabel>District</InputLabel>
              <Select
                multiple
                value={filters.districts}
                onChange={(e) => handleFilterChange(e, "districts")}
                input={<OutlinedInput label="District" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                sx={{ borderRadius: "8px" }}>
                {filterOptions.districts.map((district) => (
                  <MenuItem key={district} value={district}>
                    {district}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: "200px" }}>
              <InputLabel>Taluka</InputLabel>
              <Select
                multiple
                value={filters.talukas}
                onChange={(e) => handleFilterChange(e, "talukas")}
                input={<OutlinedInput label="Taluka" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                sx={{ borderRadius: "8px" }}>
                {filterOptions.talukas.map((taluka) => (
                  <MenuItem key={taluka} value={taluka}>
                    {taluka}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: "200px" }}>
              <InputLabel>Village</InputLabel>
              <Select
                multiple
                value={filters.villages}
                onChange={(e) => handleFilterChange(e, "villages")}
                input={<OutlinedInput label="Village" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                sx={{ borderRadius: "8px" }}>
                {filterOptions.villages.map((village) => (
                  <MenuItem key={village} value={village}>
                    {village}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<FilterX size={18} />}
              onClick={clearFilters}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 500,
                minWidth: "auto"
              }}>
              Clear Filters
            </Button>
          </Box>

          {/* Selection Actions */}
          {selectedFarmers.length > 0 && (
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

      {/* Rest of the component remains the same, but use filteredFarmers instead of farmers */}
      {loading && !farmers.length ? (
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
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedFarmers.length === filteredFarmers.length && filteredFarmers.length > 0}
                      indeterminate={selectedFarmers.length > 0 && selectedFarmers.length < filteredFarmers.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Farmer Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Location Details</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Birthdate</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFarmers.map((farmer) => (
                  <TableRow key={farmer.id || farmer._id} sx={{ "&:hover": { backgroundColor: "#f5f7fa" } }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedFarmers.includes(farmer._id || farmer.id)}
                        onChange={() => handleSelectFarmer(farmer._id || farmer.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <User size={18} />
                        <Typography>{farmer.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <MapPin size={18} />
                        <Box>
                          <Typography variant="body2">{farmer.village}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {farmer.taluka}, {farmer.district}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {farmer.birthdate ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Calendar size={18} />
                          <Typography>{farmer.birthdate}</Typography>
                        </Box>
                      ) : (
                        <Chip
                          label="Not Available"
                          size="small"
                          sx={{
                            backgroundColor: "#f0f0f0",
                            fontSize: "0.75rem"
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleEdit(farmer)}
                        sx={{
                          color: theme.palette.primary.main,
                          "&:hover": {
                            backgroundColor: `${theme.palette.primary.main}10`
                          }
                        }}>
                        <Pencil size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredFarmers.length && (
                  <TableRow>
                    <TableCell colSpan={5}>
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
                          {farmers.length === 0
                            ? "No farmers found. Add your first farmer to get started!"
                            : "No farmers match the selected filters"}
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
