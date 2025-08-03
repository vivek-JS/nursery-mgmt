import React, { useState, useEffect } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Grid,
  Container,
  CircularProgress,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Tab,
  Tabs,
  Alert,
  Divider,
  IconButton,
  Tooltip
} from "@mui/material"
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  AccountBalanceWallet as WalletIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Visibility as VisibilityIcon,
  LocalShipping as ShippingIcon,
  Inventory as InventoryIcon,
  CalendarToday as CalendarIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  PieChart as PieChartIcon,
  InsertChart as ChartIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowDropUp as ArrowDropUpIcon
} from "@mui/icons-material"
import { Park as EcoIcon } from "@mui/icons-material"

import { format } from "date-fns"
import { useNavigate } from "react-router-dom"
import { API, NetworkManager } from "network/core"

// Custom styled progress bar for wallet utilization
const WalletUtilization = ({ used, total }) => {
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0
  const color = percentage > 90 ? "error" : percentage > 70 ? "warning" : "success"

  return (
    <Box sx={{ width: "100%", mb: 0.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Booked: {used.toLocaleString()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {percentage}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={color}
        sx={{ height: 6, borderRadius: 1 }}
      />
    </Box>
  )
}

// Helper function to get a color based on plant name
const getPlantColor = (plantName) => {
  const colors = ["primary", "success", "info", "warning", "error", "secondary"]

  // Handle undefined or null plantName
  if (!plantName || typeof plantName !== "string") {
    return colors[0] // Return primary color as default
  }

  // Simple hash function to assign consistent colors
  const hash = plantName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Plant Type Card Component
const PlantTypeWithSubtypesCard = ({ plantType, subtypes }) => {
  const [expanded, setExpanded] = useState(false)
  const filteredSubtypes = subtypes.filter((st) => st.plantTypeId === plantType.plantTypeId)

  return (
    <Card
      sx={{
        height: "100%",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        transition: "transform 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
        }
      }}>
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Avatar
            sx={{
              bgcolor: `${getPlantColor(plantType.plantTypeName)}.light`,
              mr: 2
            }}>
            <EcoIcon sx={{ color: `${getPlantColor(plantType.plantTypeName)}.main` }} />
          </Avatar>
          <Typography variant="h6" noWrap sx={{ maxWidth: "70%" }}>
            {plantType.plantTypeName}
          </Typography>
          <Tooltip title={expanded ? "Hide subtypes" : "Show subtypes"}>
            <IconButton size="small" sx={{ ml: "auto" }} onClick={() => setExpanded(!expanded)}>
              {expanded ? (
                <ArrowDropUpIcon fontSize="small" />
              ) : (
                <ArrowDropDownIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="h3" component="div" sx={{ mt: 2, fontWeight: "bold" }}>
          {plantType.totalQuantity.toLocaleString()}
        </Typography>

        <Box sx={{ mt: 1 }}>
          <WalletUtilization used={plantType.totalBookedQuantity} total={plantType.totalQuantity} />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Chip
            label={`${plantType.dealerCount} ${plantType.dealerCount === 1 ? "Dealer" : "Dealers"}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${plantType.totalRemainingQuantity.toLocaleString()} Available`}
            size="small"
            color="success"
            variant="outlined"
          />
        </Box>

        {expanded && filteredSubtypes.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Subtypes ({filteredSubtypes.length})
            </Typography>
            {filteredSubtypes.map((subtype) => (
              <Box key={subtype.subTypeId} sx={{ mb: 2 }}>
                <Box
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" fontWeight={500}>
                    {subtype.subTypeName}
                  </Typography>
                  <Typography variant="caption">
                    {subtype.totalQuantity.toLocaleString()}
                  </Typography>
                </Box>
                <WalletUtilization
                  used={subtype.totalBookedQuantity}
                  total={subtype.totalQuantity}
                />
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// Subtypes Table Component
const SubtypesTable = ({ subtypes }) => {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ mt: 3, border: "1px solid", borderColor: "divider" }}>
      <Table>
        <TableHead sx={{ bgcolor: "grey.50" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>Plant Type</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Subtype</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Total Quantity</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Booked</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Available</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Dealers</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {subtypes.map((subtype) => (
            <TableRow
              key={`${subtype.plantTypeId}-${subtype.subTypeId}`}
              hover
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Avatar
                    sx={{
                      mr: 1,
                      bgcolor: `${getPlantColor(subtype.plantTypeName)}.light`,
                      color: `${getPlantColor(subtype.plantTypeName)}.main`,
                      width: 30,
                      height: 30
                    }}>
                    {subtype.plantTypeName?.charAt(0) || "P"}
                  </Avatar>
                  <Typography variant="body2">
                    {subtype.plantTypeName || "Unknown Plant"}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {subtype.subTypeName}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{subtype.totalQuantity.toLocaleString()}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {subtype.totalBookedQuantity.toLocaleString()}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {subtype.totalRemainingQuantity.toLocaleString()}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={subtype.dealerCount}
                  color="primary"
                  variant={subtype.dealerCount > 0 ? "filled" : "outlined"}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ width: "100%" }}>
                  <WalletUtilization
                    used={subtype.totalBookedQuantity}
                    total={subtype.totalQuantity}
                  />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
// Main Stats Dashboard Component
const DealerWalletStatsDashboard = ({ stats }) => {
  const [tabValue, setTabValue] = useState(0)

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  if (!stats || !stats.overall) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ mt: 4 }}>
      {/* Summary Stats */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <ChartIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6">Dealer Inventory Summary</Typography>
        </Box>

        <Card
          sx={{
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            borderRadius: 2
          }}>
          <CardContent sx={{ p: 0 }}>
            <Grid container>
              {/* Total Dealers */}
              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                sx={{
                  p: 2,
                  borderRight: { xs: 0, md: "1px solid" },
                  borderBottom: { xs: "1px solid", md: 0 },
                  borderColor: "divider"
                }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Avatar sx={{ bgcolor: "primary.light", mr: 2 }}>
                    <PersonIcon sx={{ color: "primary.main" }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Dealers
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.overall.dealerCount}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Total Inventory */}
              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                sx={{
                  p: 2,
                  borderRight: { xs: 0, md: "1px solid" },
                  borderBottom: { xs: "1px solid", md: 0 },
                  borderColor: "divider"
                }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Avatar sx={{ bgcolor: "success.light", mr: 2 }}>
                    <InventoryIcon sx={{ color: "success.main" }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Inventory
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.overall.totalQuantity.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Available Inventory */}
              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                sx={{
                  p: 2,
                  borderRight: { xs: 0, md: "1px solid" },
                  borderBottom: { xs: "1px solid", sm: 0 },
                  borderColor: "divider"
                }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Avatar sx={{ bgcolor: "info.light", mr: 2 }}>
                    <WalletIcon sx={{ color: "info.main" }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Available Inventory
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.overall.totalRemainingQuantity.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Booked Inventory */}
              <Grid item xs={12} sm={6} md={3} sx={{ p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Avatar sx={{ bgcolor: "warning.light", mr: 2 }}>
                    <ShippingIcon sx={{ color: "warning.main" }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Booked Inventory
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.overall.totalBookedQuantity.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Progress bar showing overall booking percentage */}
            <Box sx={{ px: 2, pb: 2 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" sx={{ mb: 1 }}>
                Overall Inventory Utilization
              </Typography>
              <WalletUtilization
                used={stats.overall.totalBookedQuantity}
                total={stats.overall.totalQuantity}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Plant Type Cards */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <PieChartIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6">Plant Type Distribution</Typography>
        </Box>

        <Grid container spacing={3}>
          {stats.byPlantType.map((plantType) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={plantType.plantTypeId}>
              <PlantTypeWithSubtypesCard plantType={plantType} subtypes={stats.byPlantAndSubtype} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Tabs for detailed views */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary">
          <Tab label="Plant Subtypes" />
          <Tab label="Dealer Distribution" />
        </Tabs>
      </Box>

      {/* Content based on selected tab */}
      {tabValue === 0 ? (
        <SubtypesTable subtypes={stats.byPlantAndSubtype} />
      ) : (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1">
            Dealer distribution data not available. Please implement the dealer distribution view.
          </Typography>
        </Box>
      )}
    </Box>
  )
}

const Dealers = () => {
  const [dealers, setDealers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "ascending" })
  const [tabValue, setTabValue] = useState(0)
  const navigate = useNavigate()

  // Fetch dealers on component mount
  useEffect(() => {
    getDealers()
    getDealersStats()
  }, [])

  // API call to get dealers
  const getDealers = async () => {
    setLoading(true)
    setError(null)

    try {
      const instance = NetworkManager(API.USER.GET_DEALERS)
      const response = await instance.request()

      if (response.data?.data) {
        setDealers(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching dealers:", error)
      setError("Failed to load dealers. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getDealersStats = async () => {
    setStatsLoading(true)
    setError(null)

    try {
      const instance = NetworkManager(API.USER.GET_DEALERS_STATS)
      const response = await instance.request()

      if (response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error("Error fetching dealer stats:", error)
      setError("Failed to load dealer statistics. Please try again.")
    } finally {
      setStatsLoading(false)
    }
  }

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  // Filter dealers based on search query and active tab
  const filteredDealers = dealers.filter((dealer) => {
    const matchesSearch =
      dealer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dealer.phoneNumber.toString().includes(searchQuery) ||
      (dealer.location.state &&
        dealer.location.state.toLowerCase().includes(searchQuery.toLowerCase()))

    // Filter based on active tab
    if (tabValue === 0) return matchesSearch // All dealers
    if (tabValue === 1) return matchesSearch && dealer.wallet.totalRemainingQuantity > 0 // With inventory
    if (tabValue === 2) return matchesSearch && dealer.wallet.totalRemainingQuantity === 0 // No inventory

    return matchesSearch
  })

  // Handle sort requests
  const requestSort = (key) => {
    let direction = "ascending"

    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }

    setSortConfig({ key, direction })
  }

  // Get sorted dealers
  const getSortedDealers = () => {
    const sortableItems = [...filteredDealers]

    sortableItems.sort((a, b) => {
      let aValue, bValue

      // Handle nested properties
      if (sortConfig.key.includes(".")) {
        const keys = sortConfig.key.split(".")
        aValue = keys.reduce((obj, key) => obj?.[key], a)
        bValue = keys.reduce((obj, key) => obj?.[key], b)
      } else {
        aValue = a[sortConfig.key]
        bValue = b[sortConfig.key]
      }

      // Handle strings
      if (typeof aValue === "string") {
        if (sortConfig.direction === "ascending") {
          return aValue.localeCompare(bValue)
        }
        return bValue.localeCompare(aValue)
      }

      // Handle numbers
      if (sortConfig.direction === "ascending") {
        return aValue - bValue
      }
      return bValue - aValue
    })

    return sortableItems
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return format(new Date(dateString), "dd MMM yyyy")
  }

  // Navigate to dealer details
  const handleViewDetails = (dealerId) => {
    navigate(`/u/dealers/${dealerId}`)
  }

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null

    return sortConfig.direction === "ascending" ? (
      <ArrowUpwardIcon fontSize="small" sx={{ verticalAlign: "middle", ml: 0.5 }} />
    ) : (
      <ArrowDownwardIcon fontSize="small" sx={{ verticalAlign: "middle", ml: 0.5 }} />
    )
  }

  // Generate table headers
  const tableHeaders = [
    { id: "name", label: "Dealer Name", sortable: true },
    { id: "phoneNumber", label: "Contact", sortable: true },
    { id: "location", label: "Location", sortable: false },
    { id: "birthDate", label: "Birth Date", sortable: true },
    { id: "wallet.availableAmount", label: "Available Amount", sortable: true },
    { id: "wallet.totalQuantity", label: "Total Quantity", sortable: true },
    { id: "wallet.totalRemainingQuantity", label: "Remaining Qty", sortable: true },
    { id: "actions", label: "Actions", sortable: false }
  ]
  console.log(stats)

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Display the new Wallet Stats Dashboard */}
      {!statsLoading && stats && <DealerWalletStatsDashboard stats={stats} />}

      {/* Header with title and actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          my: 3,
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 }
        }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{
            fontWeight: 600,
            display: "flex",
            alignItems: "center"
          }}>
          <WalletIcon sx={{ mr: 1, color: "primary.main" }} />
          Dealer Management
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            sx={{ display: { xs: "none", md: "flex" } }}>
            Filter
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => {
              getDealers()
              getDealersStats()
            }}
            disabled={loading || statsLoading}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Search and Tabs */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search dealers by name, phone or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ mb: 2, backgroundColor: "white" }}
        />

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary">
          <Tab label="All Dealers" />
          <Tab label="With Inventory" />
          <Tab label="No Inventory" />
        </Tabs>
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", my: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading dealer data...</Typography>
        </Box>
      ) : dealers.length === 0 ? (
        // Empty state
        <Card sx={{ textAlign: "center", py: 8, px: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Avatar sx={{ mx: "auto", bgcolor: "grey.200", width: 80, height: 80 }}>
              <PersonIcon sx={{ fontSize: 40, color: "grey.500" }} />
            </Avatar>
          </Box>
          <Typography variant="h6" gutterBottom>
            No Dealers Found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            There are no dealers registered in the system.
          </Typography>
          <Button variant="outlined">Add New Dealer</Button>
        </Card>
      ) : (
        // Dealers table
        <Card
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          <TableContainer component={Paper} elevation={0}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: "grey.50" }}>
                <TableRow>
                  {tableHeaders.map((header) => (
                    <TableCell
                      key={header.id}
                      sortDirection={sortConfig.key === header.id ? sortConfig.direction : false}
                      sx={{
                        fontWeight: "bold",
                        cursor: header.sortable ? "pointer" : "default",
                        whiteSpace: "nowrap",
                        py: 1.5
                      }}
                      onClick={() => header.sortable && requestSort(header.id)}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {header.label}
                        {getSortIndicator(header.id)}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {getSortedDealers().map((dealer) => (
                  <TableRow
                    key={dealer._id}
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      "& td": { py: 1.5 }
                    }}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar
                          sx={{
                            mr: 1.5,
                            bgcolor: "primary.light",
                            color: "primary.main",
                            width: 40,
                            height: 40
                          }}>
                          {dealer.name?.charAt(0)?.toUpperCase() || "D"}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {dealer.name || "Unknown Dealer"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {dealer._id.substring(dealer._id.length - 8)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <PhoneIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2">{dealer.phoneNumber}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {dealer.location.state ? (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <LocationIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            {[
                              dealer.location.village,
                              dealer.location.taluka,
                              dealer.location.district,
                              dealer.location.state
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not specified
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <CalendarIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2">{formatDate(dealer.birthDate)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatCurrency(dealer.wallet.availableAmount)}
                        color={dealer.wallet.availableAmount > 0 ? "success" : "default"}
                        variant={dealer.wallet.availableAmount > 0 ? "filled" : "outlined"}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {dealer.wallet.totalQuantity.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500} mb={0.5}>
                          {dealer.wallet.totalRemainingQuantity.toLocaleString()} units
                        </Typography>
                        <WalletUtilization
                          used={dealer.wallet.totalBookedQuantity || 0}
                          total={dealer.wallet.totalQuantity || 0}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewDetails(dealer._id)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Table footer with pagination info */}
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "grey.50"
            }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredDealers.length} of {dealers.length} dealers
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Chip
                icon={<InventoryIcon fontSize="small" />}
                label={`Total Inventory: ${dealers
                  .reduce((sum, dealer) => sum + dealer.wallet.totalRemainingQuantity, 0)
                  .toLocaleString()} units`}
                color="primary"
                variant="outlined"
                sx={{ mr: 2 }}
              />
              <Chip
                icon={<WalletIcon fontSize="small" />}
                label={formatCurrency(
                  dealers.reduce((sum, dealer) => sum + dealer.wallet.availableAmount, 0)
                )}
                color="success"
                variant="outlined"
              />
            </Box>
          </Box>
        </Card>
      )}
    </Container>
  )
}

export default Dealers
