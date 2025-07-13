import React, { useState, useEffect } from "react"
import {
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Inventory as InventoryIcon,
  LocalShipping as InwardIcon,
  ExitToApp as OutwardIcon,
  Assessment as DashboardIcon,
  BatchPrediction as BatchIcon
} from "@mui/icons-material"
import { makeStyles } from "tss-react/mui"
import UperStrip from "pages/private/UpperStrip"
import { Toast } from "helpers/toasts/toastHelper"
import { NetworkManager, API } from "network/core"
import { PageLoader } from "components"
import { useDebounce } from "hooks/utils"

const useStyles = makeStyles()((theme) => ({
  container: {
    padding: theme.spacing(3),
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  card: {
    marginBottom: theme.spacing(3),
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.95)"
  },
  tabPanel: {
    padding: theme.spacing(3)
  },
  actionButton: {
    marginLeft: theme.spacing(2),
    borderRadius: 12,
    padding: "12px 24px",
    fontWeight: 600,
    textTransform: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 20px rgba(0,0,0,0.2)"
    }
  },
  tableContainer: {
    borderRadius: 12,
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    overflow: "hidden"
  },
  statusChip: {
    borderRadius: 20,
    fontWeight: 600,
    padding: "4px 12px"
  },
  dialogContent: {
    minWidth: 500,
    padding: theme.spacing(3)
  },
  formField: {
    marginBottom: theme.spacing(3)
  },
  dashboardCard: {
    textAlign: "center",
    padding: theme.spacing(4),
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.95)",
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: "0 12px 40px rgba(0,0,0,0.15)"
    }
  },
  dashboardValue: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    marginBottom: theme.spacing(2),
    background: "linear-gradient(45deg, #667eea, #764ba2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  searchField: {
    marginBottom: theme.spacing(3),
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.9)",
      "&:hover": {
        backgroundColor: "rgba(255,255,255,1)"
      }
    }
  },
  tabIndicator: {
    backgroundColor: "#667eea",
    height: 3,
    borderRadius: 2
  },
  tabButton: {
    textTransform: "none",
    fontWeight: 600,
    fontSize: "1rem",
    padding: "12px 24px",
    borderRadius: 12,
    margin: "0 4px",
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "rgba(102, 126, 234, 0.1)"
    }
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
    "& .MuiTableCell-head": {
      fontWeight: 700,
      fontSize: "0.9rem",
      color: "#374151"
    }
  },
  tableRow: {
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(102, 126, 234, 0.05)"
    }
  },
  productCard: {
    padding: theme.spacing(2),
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    transition: "all 0.3s ease",
    cursor: "pointer",
    "&:hover": {
      borderColor: "#667eea",
      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.15)"
    }
  },
  selectField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.9)"
    }
  }
}))

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

function Inventory() {
  const { classes } = useStyles()
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState("")
  const [editData, setEditData] = useState(null)

  // Data states
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [inwards, setInwards] = useState([])
  const [outwards, setOutwards] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  const [availableBatches, setAvailableBatches] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Form states
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    category: "",
    unit: "",
    minStockLevel: 0,
    maxStockLevel: 0,
    costPrice: 0,
    sellingPrice: 0,
    supplier: { name: "", contact: "", email: "" },
    tags: []
  })

  const [batchForm, setBatchForm] = useState({
    productId: "",
    batchNumber: "",
    quantity: 0,
    manufacturingDate: "",
    expiryDate: "",
    costPrice: 0,
    supplier: { name: "", contact: "", email: "" },
    notes: ""
  })

  const [inwardForm, setInwardForm] = useState({
    productId: "",
    batchId: "",
    quantity: 0,
    costPrice: 0,
    supplier: { name: "", contact: "", email: "" },
    invoiceNumber: "",
    notes: ""
  })

  const [outwardForm, setOutwardForm] = useState({
    productId: "",
    batchId: "",
    quantity: 0,
    sellingPrice: 0,
    customer: { name: "", contact: "", email: "" },
    purpose: "",
    destination: "",
    notes: ""
  })

  const debouncedSearch = useDebounce(searchValue, 500)

  useEffect(() => {
    loadData()
  }, [tabValue, debouncedSearch])

  const loadData = async () => {
    setLoading(true)
    try {
      switch (tabValue) {
        case 0: // Dashboard
          await loadDashboard()
          break
        case 1: // Products
          await loadProducts()
          break
        case 2: // Batches
          await loadBatches()
          break
        case 3: // Inwards
          await loadInwards()
          break
        case 4: // Outwards
          await loadOutwards()
          break
      }
    } catch (error) {
      Toast.error("Error loading data")
    }
    setLoading(false)
  }

  const loadDashboard = async () => {
    const instance = NetworkManager(API.INVENTORY.GET_DASHBOARD)
    const result = await instance.request()
    if (result?.data?.success) {
      setDashboardData(result.data.data)
    }
  }

  const loadProducts = async () => {
    const instance = NetworkManager(API.INVENTORY.GET_ALL_PRODUCTS)
    const result = await instance.request({}, [debouncedSearch])
    if (result?.data?.success) {
      setProducts(result.data.data.data || [])
    }
  }

  const loadBatches = async () => {
    const instance = NetworkManager(API.INVENTORY.GET_ALL_BATCHES)
    const result = await instance.request({}, [debouncedSearch])
    if (result?.data?.success) {
      setBatches(result.data.data.data || [])
    }
  }

  const loadInwards = async () => {
    const instance = NetworkManager(API.INVENTORY.GET_ALL_INWARDS)
    const result = await instance.request({}, [debouncedSearch])
    if (result?.data?.success) {
      setInwards(result.data.data.data || [])
    }
  }

  const loadOutwards = async () => {
    const instance = NetworkManager(API.INVENTORY.GET_ALL_OUTWARDS)
    const result = await instance.request({}, [debouncedSearch])
    if (result?.data?.success) {
      setOutwards(result.data.data.data || [])
    }
  }

  const loadBatchesForProduct = async (productId) => {
    if (!productId) {
      setAvailableBatches([])
      return
    }
    const instance = NetworkManager(API.INVENTORY.GET_ALL_BATCHES)
    const result = await instance.request({ productId })
    if (result?.data?.success) {
      setAvailableBatches(result.data.data.data || [])
    }
  }

  const handleProductChange = (productId) => {
    setSelectedProduct(products.find((p) => p._id === productId))
    loadBatchesForProduct(productId)
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const openDialog = (type, data = null) => {
    setDialogType(type)
    setEditData(data)
    if (data) {
      // Populate form with edit data
      switch (type) {
        case "product":
          setProductForm(data)
          break
        case "batch":
          setBatchForm(data)
          break
        case "inward":
          setInwardForm(data)
          break
        case "outward":
          setOutwardForm(data)
          break
      }
    } else {
      // Reset form
      resetForms()
    }
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditData(null)
    resetForms()
  }

  const resetForms = () => {
    setProductForm({
      name: "",
      description: "",
      category: "",
      unit: "",
      minStockLevel: 0,
      maxStockLevel: 0,
      costPrice: 0,
      sellingPrice: 0,
      supplier: { name: "", contact: "", email: "" },
      tags: []
    })
    setBatchForm({
      productId: "",
      batchNumber: "",
      quantity: 0,
      manufacturingDate: "",
      expiryDate: "",
      costPrice: 0,
      supplier: { name: "", contact: "", email: "" },
      notes: ""
    })
    setInwardForm({
      productId: "",
      batchId: "",
      quantity: 0,
      costPrice: 0,
      supplier: { name: "", contact: "", email: "" },
      invoiceNumber: "",
      notes: ""
    })
    setOutwardForm({
      productId: "",
      batchId: "",
      quantity: 0,
      sellingPrice: 0,
      customer: { name: "", contact: "", email: "" },
      purpose: "",
      destination: "",
      notes: ""
    })
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      let result
      switch (dialogType) {
        case "product":
          if (editData) {
            const instance = NetworkManager(API.INVENTORY.UPDATE_PRODUCT)
            result = await instance.request({ id: editData._id, ...productForm })
          } else {
            const instance = NetworkManager(API.INVENTORY.CREATE_PRODUCT)
            result = await instance.request(productForm)
          }
          break
        case "batch": {
          const batchInstance = NetworkManager(API.INVENTORY.CREATE_BATCH)
          result = await batchInstance.request(batchForm)
          break
        }
        case "inward": {
          const inwardInstance = NetworkManager(API.INVENTORY.CREATE_INWARD)
          result = await inwardInstance.request(inwardForm)
          break
        }
        case "outward": {
          const outwardInstance = NetworkManager(API.INVENTORY.CREATE_OUTWARD)
          result = await outwardInstance.request(outwardForm)
          break
        }
      }

      if (result?.data?.success) {
        Toast.success(`${dialogType} ${editData ? "updated" : "created"} successfully`)
        closeDialog()
        loadData()
      } else {
        Toast.error(result?.data?.message || "Operation failed")
      }
    } catch (error) {
      Toast.error("Error performing operation")
    }
    setLoading(false)
  }

  const handleDelete = async (id, type) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setLoading(true)
      try {
        const instance = NetworkManager(API.INVENTORY.DELETE_PRODUCT)
        const result = await instance.request({ id })
        if (result?.data?.success) {
          Toast.success("Item deleted successfully")
          loadData()
        } else {
          Toast.error("Failed to delete item")
        }
      } catch (error) {
        Toast.error("Error deleting item")
      }
      setLoading(false)
    }
  }

  const renderDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card className={classes.dashboardCard} style={{ backgroundColor: "#e3f2fd" }}>
          <InventoryIcon color="primary" style={{ fontSize: 48 }} />
          <Typography className={classes.dashboardValue}>
            {dashboardData?.summary?.totalProducts || 0}
          </Typography>
          <Typography variant="h6">Total Products</Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card className={classes.dashboardCard} style={{ backgroundColor: "#f3e5f5" }}>
          <BatchIcon color="secondary" style={{ fontSize: 48 }} />
          <Typography className={classes.dashboardValue}>
            {dashboardData?.summary?.activeProducts || 0}
          </Typography>
          <Typography variant="h6">Active Products</Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card className={classes.dashboardCard} style={{ backgroundColor: "#fff3e0" }}>
          <Alert severity="warning" style={{ fontSize: 48 }} />
          <Typography className={classes.dashboardValue}>
            {dashboardData?.summary?.lowStockProducts || 0}
          </Typography>
          <Typography variant="h6">Low Stock Items</Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card className={classes.dashboardCard} style={{ backgroundColor: "#e8f5e8" }}>
          <Typography className={classes.dashboardValue}>
            ₹{dashboardData?.summary?.totalStockValue?.toLocaleString() || 0}
          </Typography>
          <Typography variant="h6">Total Stock Value</Typography>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card className={classes.card}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Inwards
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData?.recentTransactions?.inwards?.map((inward, index) => (
                    <TableRow key={index}>
                      <TableCell>{inward.productId?.name}</TableCell>
                      <TableCell>{inward.quantity}</TableCell>
                      <TableCell>{new Date(inward.receivedDate).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card className={classes.card}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Outwards
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Purpose</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData?.recentTransactions?.outwards?.map((outward, index) => (
                    <TableRow key={index}>
                      <TableCell>{outward.productId?.name}</TableCell>
                      <TableCell>{outward.quantity}</TableCell>
                      <TableCell>{outward.purpose}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  const renderProducts = () => (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <TextField
          className={classes.searchField}
          placeholder="Search products..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          size="small"
          style={{ width: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openDialog("product")}
          className={classes.actionButton}>
          Add Product
        </Button>
      </Box>

      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table>
          <TableHead className={classes.tableHeader}>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Current Stock</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Cost Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product._id} className={classes.tableRow}>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {product.name}
                    </Typography>
                    {product.description && (
                      <Typography variant="caption" color="textSecondary">
                        {product.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={product.category} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight={600}>
                      {product.currentStock}
                    </Typography>
                    <Chip
                      label={
                        product.currentStock < product.minStockLevel ? "Low Stock" : "In Stock"
                      }
                      size="small"
                      color={product.currentStock < product.minStockLevel ? "error" : "success"}
                      variant="outlined"
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {product.unit}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} color="primary">
                    ₹{product.costPrice?.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={product.isActive ? "Active" : "Inactive"}
                    color={product.isActive ? "success" : "default"}
                    className={classes.statusChip}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" gap={1} justifyContent="center">
                    <IconButton
                      size="small"
                      onClick={() => openDialog("product", product)}
                      sx={{
                        backgroundColor: "rgba(102, 126, 234, 0.1)",
                        "&:hover": { backgroundColor: "rgba(102, 126, 234, 0.2)" }
                      }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(product._id, "product")}
                      sx={{
                        backgroundColor: "rgba(244, 67, 54, 0.1)",
                        "&:hover": { backgroundColor: "rgba(244, 67, 54, 0.2)" }
                      }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )

  const renderBatches = () => (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <TextField
          className={classes.searchField}
          placeholder="Search batches..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          size="small"
          style={{ width: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openDialog("batch")}
          className={classes.actionButton}>
          Add Batch
        </Button>
      </Box>

      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Batch Number</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Remaining</TableCell>
              <TableCell>Cost Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.map((batch) => (
              <TableRow key={batch._id}>
                <TableCell>{batch.batchNumber}</TableCell>
                <TableCell>{batch.productId?.name}</TableCell>
                <TableCell>{batch.quantity}</TableCell>
                <TableCell>{batch.remainingQuantity}</TableCell>
                <TableCell>₹{batch.costPrice}</TableCell>
                <TableCell>
                  <Chip
                    label={batch.status}
                    color={batch.status === "active" ? "success" : "default"}
                    className={classes.statusChip}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small">
                    <ViewIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )

  const renderInwards = () => (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <TextField
          className={classes.searchField}
          placeholder="Search inwards..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          size="small"
          style={{ width: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openDialog("inward")}
          className={classes.actionButton}>
          Add Inward
        </Button>
      </Box>

      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Batch</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Cost Price</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inwards.map((inward) => (
              <TableRow key={inward._id}>
                <TableCell>{inward.productId?.name}</TableCell>
                <TableCell>{inward.batchId?.batchNumber}</TableCell>
                <TableCell>{inward.quantity}</TableCell>
                <TableCell>₹{inward.costPrice}</TableCell>
                <TableCell>₹{inward.totalAmount}</TableCell>
                <TableCell>{new Date(inward.receivedDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={inward.status}
                    color={inward.status === "received" ? "success" : "default"}
                    className={classes.statusChip}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )

  const renderOutwards = () => (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <TextField
          className={classes.searchField}
          placeholder="Search outwards..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          size="small"
          style={{ width: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openDialog("outward")}
          className={classes.actionButton}>
          Add Outward
        </Button>
      </Box>

      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Purpose</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {outwards.map((outward) => (
              <TableRow key={outward._id}>
                <TableCell>{outward.productId?.name}</TableCell>
                <TableCell>{outward.quantity}</TableCell>
                <TableCell>{outward.purpose}</TableCell>
                <TableCell>{outward.destination}</TableCell>
                <TableCell>{new Date(outward.outwardDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={outward.status}
                    color={outward.status === "issued" ? "success" : "default"}
                    className={classes.statusChip}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )

  const renderDialog = () => {
    const getDialogTitle = () => {
      switch (dialogType) {
        case "product":
          return editData ? "Edit Product" : "Add New Product"
        case "batch":
          return "Add New Batch"
        case "inward":
          return "Add New Inward"
        case "outward":
          return "Add New Outward"
        default:
          return "Dialog"
      }
    }

    const renderForm = () => {
      switch (dialogType) {
        case "product":
          return (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Product Name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth className={classes.formField}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}>
                    <MenuItem value="Seeds">Seeds</MenuItem>
                    <MenuItem value="Fertilizers">Fertilizers</MenuItem>
                    <MenuItem value="Chemicals">Chemicals</MenuItem>
                    <MenuItem value="Tools">Tools</MenuItem>
                    <MenuItem value="Equipment">Equipment</MenuItem>
                    <MenuItem value="Pots">Pots</MenuItem>
                    <MenuItem value="Soil">Soil</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth className={classes.formField}>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}>
                    <MenuItem value="kg">kg</MenuItem>
                    <MenuItem value="g">g</MenuItem>
                    <MenuItem value="l">l</MenuItem>
                    <MenuItem value="ml">ml</MenuItem>
                    <MenuItem value="pieces">pieces</MenuItem>
                    <MenuItem value="packets">packets</MenuItem>
                    <MenuItem value="bottles">bottles</MenuItem>
                    <MenuItem value="bags">bags</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cost Price"
                  type="number"
                  value={productForm.costPrice}
                  onChange={(e) =>
                    setProductForm({ ...productForm, costPrice: parseFloat(e.target.value) })
                  }
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Selling Price"
                  type="number"
                  value={productForm.sellingPrice}
                  onChange={(e) =>
                    setProductForm({ ...productForm, sellingPrice: parseFloat(e.target.value) })
                  }
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Min Stock Level"
                  type="number"
                  value={productForm.minStockLevel}
                  onChange={(e) =>
                    setProductForm({ ...productForm, minStockLevel: parseInt(e.target.value) })
                  }
                  className={classes.formField}
                />
              </Grid>
            </Grid>
          )
        case "batch": {
          return (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth className={`${classes.formField} ${classes.selectField}`}>
                  <InputLabel>Select Product *</InputLabel>
                  <Select
                    value={batchForm.productId}
                    onChange={(e) => setBatchForm({ ...batchForm, productId: e.target.value })}
                    label="Select Product *">
                    {products.map((product) => (
                      <MenuItem key={product._id} value={product._id}>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          width="100%">
                          <Typography variant="body1">{product.name}</Typography>
                          <Box display="flex" gap={1}>
                            <Chip
                              label={`${product.category}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Chip
                              label={`Stock: ${product.currentStock} ${product.unit}`}
                              size="small"
                              color={
                                product.currentStock < product.minStockLevel ? "error" : "success"
                              }
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Batch Number *"
                  value={batchForm.batchNumber}
                  onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                  className={classes.formField}
                  placeholder="e.g., BATCH-2024-001"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity *"
                  type="number"
                  value={batchForm.quantity}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, quantity: parseInt(e.target.value) })
                  }
                  className={classes.formField}
                  InputProps={{
                    endAdornment: selectedProduct && (
                      <Typography variant="caption" color="textSecondary">
                        {selectedProduct.unit}
                      </Typography>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cost Price *"
                  type="number"
                  value={batchForm.costPrice}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, costPrice: parseFloat(e.target.value) })
                  }
                  className={classes.formField}
                  InputProps={{
                    startAdornment: (
                      <Typography variant="caption" color="textSecondary">
                        ₹
                      </Typography>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Manufacturing Date"
                  type="date"
                  value={batchForm.manufacturingDate}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, manufacturingDate: e.target.value })
                  }
                  className={classes.formField}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  type="date"
                  value={batchForm.expiryDate}
                  onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                  className={classes.formField}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Supplier Name"
                  value={batchForm.supplier?.name || ""}
                  onChange={(e) =>
                    setBatchForm({
                      ...batchForm,
                      supplier: { ...batchForm.supplier, name: e.target.value }
                    })
                  }
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Supplier Contact"
                  value={batchForm.supplier?.contact || ""}
                  onChange={(e) =>
                    setBatchForm({
                      ...batchForm,
                      supplier: { ...batchForm.supplier, contact: e.target.value }
                    })
                  }
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  className={classes.formField}
                />
              </Grid>
            </Grid>
          )
        }
        case "inward": {
          return (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth className={`${classes.formField} ${classes.selectField}`}>
                  <InputLabel>Select Product *</InputLabel>
                  <Select
                    value={inwardForm.productId}
                    onChange={(e) => {
                      setInwardForm({ ...inwardForm, productId: e.target.value, batchId: "" })
                      handleProductChange(e.target.value)
                    }}
                    label="Select Product *">
                    {products.map((product) => (
                      <MenuItem key={product._id} value={product._id}>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          width="100%">
                          <Typography variant="body1">{product.name}</Typography>
                          <Box display="flex" gap={1}>
                            <Chip
                              label={`${product.category}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Chip
                              label={`Stock: ${product.currentStock} ${product.unit}`}
                              size="small"
                              color={
                                product.currentStock < product.minStockLevel ? "error" : "success"
                              }
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth className={`${classes.formField} ${classes.selectField}`}>
                  <InputLabel>Select Batch (Optional)</InputLabel>
                  <Select
                    value={inwardForm.batchId}
                    onChange={(e) => setInwardForm({ ...inwardForm, batchId: e.target.value })}
                    label="Select Batch (Optional)"
                    disabled={!inwardForm.productId}>
                    <MenuItem value="">
                      <em>Create new batch automatically</em>
                    </MenuItem>
                    {availableBatches.map((batch) => (
                      <MenuItem key={batch._id} value={batch._id}>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          width="100%">
                          <Typography variant="body1">{batch.batchNumber}</Typography>
                          <Chip
                            label={`Remaining: ${batch.remainingQuantity}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity *"
                  type="number"
                  value={inwardForm.quantity}
                  onChange={(e) =>
                    setInwardForm({ ...inwardForm, quantity: parseInt(e.target.value) })
                  }
                  className={classes.formField}
                  InputProps={{
                    endAdornment: selectedProduct && (
                      <Typography variant="caption" color="textSecondary">
                        {selectedProduct.unit}
                      </Typography>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cost Price *"
                  type="number"
                  value={inwardForm.costPrice}
                  onChange={(e) =>
                    setInwardForm({ ...inwardForm, costPrice: parseFloat(e.target.value) })
                  }
                  className={classes.formField}
                  InputProps={{
                    startAdornment: (
                      <Typography variant="caption" color="textSecondary">
                        ₹
                      </Typography>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  value={inwardForm.invoiceNumber}
                  onChange={(e) => setInwardForm({ ...inwardForm, invoiceNumber: e.target.value })}
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Supplier Name"
                  value={inwardForm.supplier?.name || ""}
                  onChange={(e) =>
                    setInwardForm({
                      ...inwardForm,
                      supplier: { ...inwardForm.supplier, name: e.target.value }
                    })
                  }
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={inwardForm.notes}
                  onChange={(e) => setInwardForm({ ...inwardForm, notes: e.target.value })}
                  className={classes.formField}
                />
              </Grid>
            </Grid>
          )
        }
        case "outward": {
          return (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth className={`${classes.formField} ${classes.selectField}`}>
                  <InputLabel>Select Product *</InputLabel>
                  <Select
                    value={outwardForm.productId}
                    onChange={(e) => {
                      setOutwardForm({ ...outwardForm, productId: e.target.value, batchId: "" })
                      handleProductChange(e.target.value)
                    }}
                    label="Select Product *">
                    {products
                      .filter((p) => p.currentStock > 0)
                      .map((product) => (
                        <MenuItem key={product._id} value={product._id}>
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            width="100%">
                            <Typography variant="body1">{product.name}</Typography>
                            <Box display="flex" gap={1}>
                              <Chip
                                label={`${product.category}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              <Chip
                                label={`Available: ${product.currentStock} ${product.unit}`}
                                size="small"
                                color={
                                  product.currentStock < product.minStockLevel ? "error" : "success"
                                }
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth className={`${classes.formField} ${classes.selectField}`}>
                  <InputLabel>Select Batch (Optional)</InputLabel>
                  <Select
                    value={outwardForm.batchId}
                    onChange={(e) => setOutwardForm({ ...outwardForm, batchId: e.target.value })}
                    label="Select Batch (Optional)"
                    disabled={!outwardForm.productId}>
                    <MenuItem value="">
                      <em>Use any available batch</em>
                    </MenuItem>
                    {availableBatches
                      .filter((b) => b.remainingQuantity > 0)
                      .map((batch) => (
                        <MenuItem key={batch._id} value={batch._id}>
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            width="100%">
                            <Typography variant="body1">{batch.batchNumber}</Typography>
                            <Chip
                              label={`Available: ${batch.remainingQuantity}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          </Box>
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity *"
                  type="number"
                  value={outwardForm.quantity}
                  onChange={(e) =>
                    setOutwardForm({ ...outwardForm, quantity: parseInt(e.target.value) })
                  }
                  className={classes.formField}
                  InputProps={{
                    endAdornment: selectedProduct && (
                      <Typography variant="caption" color="textSecondary">
                        {selectedProduct.unit}
                      </Typography>
                    )
                  }}
                  helperText={
                    selectedProduct &&
                    (outwardForm.batchId
                      ? `Selected batch available: ${
                          availableBatches.find((b) => b._id === outwardForm.batchId)
                            ?.remainingQuantity || 0
                        } ${selectedProduct.unit}`
                      : `Total available stock: ${selectedProduct.currentStock} ${selectedProduct.unit}`)
                  }
                  error={
                    selectedProduct &&
                    (outwardForm.batchId
                      ? outwardForm.quantity >
                        (availableBatches.find((b) => b._id === outwardForm.batchId)
                          ?.remainingQuantity || 0)
                      : outwardForm.quantity > selectedProduct.currentStock)
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Selling Price"
                  type="number"
                  value={outwardForm.sellingPrice}
                  onChange={(e) =>
                    setOutwardForm({ ...outwardForm, sellingPrice: parseFloat(e.target.value) })
                  }
                  className={classes.formField}
                  InputProps={{
                    startAdornment: (
                      <Typography variant="caption" color="textSecondary">
                        ₹
                      </Typography>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth className={`${classes.formField} ${classes.selectField}`}>
                  <InputLabel>Purpose *</InputLabel>
                  <Select
                    value={outwardForm.purpose}
                    onChange={(e) => setOutwardForm({ ...outwardForm, purpose: e.target.value })}
                    label="Purpose *">
                    <MenuItem value="sale">Sale</MenuItem>
                    <MenuItem value="internal_use">Internal Use</MenuItem>
                    <MenuItem value="damaged">Damaged</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                    <MenuItem value="transfer">Transfer</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth className={`${classes.formField} ${classes.selectField}`}>
                  <InputLabel>Destination *</InputLabel>
                  <Select
                    value={outwardForm.destination}
                    onChange={(e) =>
                      setOutwardForm({ ...outwardForm, destination: e.target.value })
                    }
                    label="Destination *">
                    <MenuItem value="customer">Customer</MenuItem>
                    <MenuItem value="internal">Internal</MenuItem>
                    <MenuItem value="disposal">Disposal</MenuItem>
                    <MenuItem value="transfer">Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={outwardForm.customer?.name || ""}
                  onChange={(e) =>
                    setOutwardForm({
                      ...outwardForm,
                      customer: { ...outwardForm.customer, name: e.target.value }
                    })
                  }
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Customer Contact"
                  value={outwardForm.customer?.contact || ""}
                  onChange={(e) =>
                    setOutwardForm({
                      ...outwardForm,
                      customer: { ...outwardForm.customer, contact: e.target.value }
                    })
                  }
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={outwardForm.notes}
                  onChange={(e) => setOutwardForm({ ...outwardForm, notes: e.target.value })}
                  className={classes.formField}
                />
              </Grid>
            </Grid>
          )
        }
        default:
          return null
      }
    }

    return (
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
          }
        }}>
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontWeight: 600,
            fontSize: "1.25rem"
          }}>
          {getDialogTitle()}
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>{renderForm()}</DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={closeDialog}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600
            }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)"
              }
            }}>
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : editData ? (
              "Update"
            ) : (
              "Create"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <>
      <Grid container className={classes.container}>
        {loading && <PageLoader />}

        <UperStrip
          date={new Date()}
          patientId={-1}
          getAppointments={() => {}}
          handleOpenAddPatient={() => {}}
        />

        <Card className={classes.card}>
          <CardContent>
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="inventory tabs"
                sx={{
                  "& .MuiTab-root": {
                    minHeight: 64,
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: "12px 12px 0 0",
                    margin: "0 4px",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      backgroundColor: "rgba(102, 126, 234, 0.1)"
                    }
                  },
                  "& .Mui-selected": {
                    color: "#667eea",
                    backgroundColor: "rgba(102, 126, 234, 0.1)"
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#667eea",
                    height: 3,
                    borderRadius: "2px 2px 0 0"
                  }
                }}>
                <Tab
                  icon={<DashboardIcon />}
                  label="Dashboard"
                  iconPosition="start"
                  sx={{ minWidth: 120 }}
                />
                <Tab
                  icon={<InventoryIcon />}
                  label="Products"
                  iconPosition="start"
                  sx={{ minWidth: 120 }}
                />
                <Tab
                  icon={<BatchIcon />}
                  label="Batches"
                  iconPosition="start"
                  sx={{ minWidth: 120 }}
                />
                <Tab
                  icon={<InwardIcon />}
                  label="Inwards"
                  iconPosition="start"
                  sx={{ minWidth: 120 }}
                />
                <Tab
                  icon={<OutwardIcon />}
                  label="Outwards"
                  iconPosition="start"
                  sx={{ minWidth: 120 }}
                />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              {renderDashboard()}
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              {renderProducts()}
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              {renderBatches()}
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              {renderInwards()}
            </TabPanel>
            <TabPanel value={tabValue} index={4}>
              {renderOutwards()}
            </TabPanel>
          </CardContent>
        </Card>

        {renderDialog()}
      </Grid>
    </>
  )
}

export default Inventory
