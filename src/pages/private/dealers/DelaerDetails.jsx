import { API, NetworkManager } from "network/core"
import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { PieChart as PieChartIcon } from "@mui/icons-material"

// Import MUI components for better styling
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  LinearProgress,
  Button
} from "@mui/material"
// Import icons
import {
  AccountBalanceWallet as WalletIcon,
  Inventory as InventoryIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  CalendarToday as CalendarIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Payment as PaymentIcon,
  ReceiptLong as ReceiptIcon,
  Info as InfoIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  Circle as CircleIcon,
  Download as DownloadIcon
} from "@mui/icons-material"
import DealerPDFExport from "./DealerPDFExport"
import PlantTypeWithSubtypesCard from "./PlantTypeWithSubtypesCard"

// Format currency function
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount)
}

// Format date function
const formatDate = (dateString) => {
  const options = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }
  return new Date(dateString).toLocaleDateString("en-IN", options)
}

// Wallet utilization component
export const WalletUtilization = ({ used, total }) => {
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

const DealerDetails = () => {
  const { id } = useParams()
  const [dealer, setDealer] = useState(null)
  const [dealerFinancial, setDealerFinancial] = useState(null)
  const [dealerInventory, setDealerInventory] = useState([])
  const [walletTransactions, setWalletTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [transactionsError, setTransactionsError] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Pagination state
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [transactionType, setTransactionType] = useState("")

  // Tab state
  const [tabValue, setTabValue] = useState(0)

  useEffect(() => {
    if (id) {
      getDealerDetails(id)
      getDealersStats(id)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      getDealerWalletTransactions(id, page + 1, rowsPerPage, transactionType)
    }
  }, [id, page, rowsPerPage, transactionType])

  const getDealerDetails = async (dealerId) => {
    setLoading(true)
    setError(null)

    try {
      // Get dealer details
      const instance = NetworkManager(API.USER.GET_DEALERS)
      const response = await instance.request({}, [dealerId])

      if (response.data?.data) {
        // Set dealer data
        setDealer(response.data.data)

        // Set financial data from the response
        setDealerFinancial(
          response.data.data.financial || {
            availableAmount: 0,
            totalOrderAmount: 0,
            totalPaidAmount: 0,
            remainingAmount: 0
          }
        )

        // Set plant inventory data
        setDealerInventory(response.data.data.plantDetails || [])
      }
    } catch (error) {
      console.error("Error fetching dealer details:", error)
      setError("Failed to load dealer details. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getDealerWalletTransactions = async (dealerId, page = 1, limit = 10, type = "") => {
    setTransactionsLoading(true)
    setTransactionsError(null)

    try {
      const instance = NetworkManager(API.USER.GET_DEALERS_TRANSACTIONS)

      // Build query parameters
      const queryParams = {
        page,
        limit,
        ...(type && { type }) // Only add type if it's not empty
      }

      const response = await instance.request({}, [dealerId], { params: queryParams })

      if (response.data) {
        console.log("rrrr", response?.data)
        // Extract transactions and pagination data
        const { transactions, pagination } = response?.data?.data || {}
        setWalletTransactions(transactions || [])
        setTotalTransactions(pagination?.total || 0)
      }
    } catch (error) {
      console.error("Error fetching wallet transactions:", error)
      setTransactionsError("Failed to load wallet transactions. Please try again.")
    } finally {
      setTransactionsLoading(false)
    }
  }

  const exportTransactionsCSV = async () => {
    try {
      const instance = NetworkManager(API.USER.EXPORT_DEALER_WALLET_TRANSACTIONS_CSV)

      // Build query parameters
      const queryParams = {
        ...(transactionType && { type: transactionType }) // Only add type if it's not empty
      }

      const response = await instance.request({}, [id], { params: queryParams })

      // Create blob and download
      const blob = new Blob([response.data], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute(
        "download",
        `${dealer?.name || "dealer"}_wallet_transactions_${
          new Date().toISOString().split("T")[0]
        }.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      // You can add a toast notification here if you have one
    }
  }

  const getDealersStats = async (dealerId) => {
    setStatsLoading(true)
    setError(null)

    try {
      const instance = NetworkManager(API.USER.GET_DEALERS_STATS)
      const response = await instance.request({}, [dealerId])

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

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const handleTypeFilterChange = (event) => {
    setTransactionType(event.target.value)
    setPage(0)
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading dealer details...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ m: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (!dealer) {
    return (
      <Box sx={{ m: 3 }}>
        <Alert severity="info">No dealer found with the provided ID.</Alert>
      </Box>
    )
  }
  const getTransactionTypeCount = (type) => {
    return walletTransactions.filter((transaction) => transaction.type === type).length
  }
  return (
    <Box sx={{ p: 3 }}>
      {/* Dealer Header */}
      <Card
        sx={{
          mb: 3,
          overflow: "hidden",
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
        }}>
        <Box
          sx={{
            bgcolor: "primary.main",
            color: "white",
            p: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: "white",
                color: "primary.main",
                mr: 3,
                fontSize: 40
              }}>
              {dealer.name?.charAt(0).toUpperCase() || "D"}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {dealer.name}
              </Typography>
              <Typography variant="subtitle1">Dealer ID: {id.substring(id.length - 8)}</Typography>
            </Box>
          </Box>

          <Chip
            label={dealer.isOnboarded ? "Onboarded" : "Not Onboarded"}
            color={dealer.isOnboarded ? "success" : "warning"}
            sx={{ fontWeight: "bold" }}
          />
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Contact */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <PhoneIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="body1" fontWeight="medium">
                  {dealer.phoneNumber}
                </Typography>
              </Box>
            </Grid>

            {/* Location */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <LocationIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="body1">
                  {[
                    dealer.location?.village,
                    dealer.location?.taluka,
                    dealer.location?.district,
                    dealer.location?.state
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Typography>
              </Box>
            </Grid>

            {/* Birth Date */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CalendarIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="body1">
                  {dealer.birthDate
                    ? new Date(dealer.birthDate).toLocaleDateString("en-IN")
                    : "Not specified"}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Financial Overview
      </Typography>
      {!statsLoading && stats && (
        <>
          <Typography
            variant="h5"
            sx={{ mt: 4, mb: 2, fontWeight: 600, display: "flex", alignItems: "center" }}>
            <PieChartIcon sx={{ mr: 1 }} />
            Plant Distribution
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {stats.byPlantType &&
              stats.byPlantType.map((plantType) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={plantType.plantTypeId}>
                  <PlantTypeWithSubtypesCard
                    plantType={plantType}
                    subtypes={stats.byPlantAndSubtype || []}
                  />
                </Grid>
              ))}

            {(!stats.byPlantType || stats.byPlantType.length === 0) && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: "center" }}>
                  <InfoIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                  <Typography variant="h6">No plant statistics available</Typography>
                  <Typography variant="body2" color="text.secondary">
                    There is no plant distribution data for this dealer.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {statsLoading && (
        <Box sx={{ width: "100%", mt: 4, mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            Plant Distribution
          </Typography>
          <LinearProgress />
        </Box>
      )}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Available Amount */}
        <Grid item xs={12} sm={6} md={3}>
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
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Avatar sx={{ bgcolor: "primary.light", mr: 2 }}>
                  <WalletIcon sx={{ color: "primary.main" }} />
                </Avatar>
                <Typography variant="h6">Available Amount</Typography>
              </Box>
              <Typography
                variant="h3"
                component="div"
                sx={{ mt: 2, fontWeight: "bold", color: "primary.main" }}>
                {formatCurrency(dealerFinancial?.availableAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Order Amount */}
        <Grid item xs={12} sm={6} md={3}>
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
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Avatar sx={{ bgcolor: "info.light", mr: 2 }}>
                  <ReceiptIcon sx={{ color: "info.main" }} />
                </Avatar>
                <Typography variant="h6">Total Order Amount</Typography>
              </Box>
              <Typography
                variant="h3"
                component="div"
                sx={{ mt: 2, fontWeight: "bold", color: "info.main" }}>
                {formatCurrency(dealerFinancial?.totalOrderAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Paid Amount */}
        <Grid item xs={12} sm={6} md={3}>
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
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Avatar sx={{ bgcolor: "success.light", mr: 2 }}>
                  <PaymentIcon sx={{ color: "success.main" }} />
                </Avatar>
                <Typography variant="h6">Total Paid Amount</Typography>
              </Box>
              <Typography
                variant="h3"
                component="div"
                sx={{ mt: 2, fontWeight: "bold", color: "success.main" }}>
                {formatCurrency(dealerFinancial?.totalPaidAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Remaining Amount */}
        <Grid item xs={12} sm={6} md={3}>
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
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Avatar
                  sx={{
                    bgcolor: dealerFinancial?.remainingAmount < 0 ? "success.light" : "error.light",
                    mr: 2
                  }}>
                  {dealerFinancial?.remainingAmount < 0 ? (
                    <ArrowDownwardIcon sx={{ color: "success.main" }} />
                  ) : (
                    <ArrowUpwardIcon sx={{ color: "error.main" }} />
                  )}
                </Avatar>
                <Typography variant="h6">Remaining Amount</Typography>
              </Box>
              <Typography
                variant="h3"
                component="div"
                sx={{
                  mt: 2,
                  fontWeight: "bold",
                  color: dealerFinancial?.remainingAmount < 0 ? "success.main" : "error.main"
                }}>
                {formatCurrency(Math.abs(dealerFinancial?.remainingAmount || 0))}
                <Typography variant="caption" sx={{ ml: 1 }}>
                  {dealerFinancial?.remainingAmount < 0 ? "in advance" : "due"}
                </Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Inventory & Transactions Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": { fontWeight: "bold" }
          }}>
          <Tab label="Wallet Transactions" icon={<WalletIcon />} iconPosition="start" />
          <Tab label="Inventory Details" icon={<InventoryIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Transactions Tab Panel */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Add the DealerPDFExport component */}
            <DealerPDFExport
              dealer={dealer}
              dealerFinancial={dealerFinancial}
              dealerInventory={dealerInventory}
              transactions={walletTransactions}
            />

            {/* CSV Export Button */}
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportTransactionsCSV}
              disabled={!dealer || walletTransactions.length === 0}
              sx={{
                borderColor: "success.main",
                color: "success.main",
                "&:hover": { borderColor: "success.dark", bgcolor: "success.50" },
                padding: "10px 20px",
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: "bold"
              }}>
              Export CSV
            </Button>

            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="transaction-type-label">Filter by Type</InputLabel>
              <Select
                labelId="transaction-type-label"
                id="transaction-type-select"
                value={transactionType}
                label="Filter by Type"
                onChange={handleTypeFilterChange}>
                <MenuItem value="">All Transactions ({walletTransactions.length})</MenuItem>
                <MenuItem value="CREDIT">Credit ({getTransactionTypeCount("CREDIT")})</MenuItem>
                <MenuItem value="DEBIT">Debit ({getTransactionTypeCount("DEBIT")})</MenuItem>
                <MenuItem value="INVENTORY_ADD">
                  Inventory Add ({getTransactionTypeCount("INVENTORY_ADD")})
                </MenuItem>
                <MenuItem value="INVENTORY_BOOK">
                  Inventory Book ({getTransactionTypeCount("INVENTORY_BOOK")})
                </MenuItem>
                <MenuItem value="INVENTORY_RELEASE">
                  Inventory Release ({getTransactionTypeCount("INVENTORY_RELEASE")})
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          {transactionsLoading ? (
            <Box sx={{ width: "100%", mt: 3 }}>
              <LinearProgress />
            </Box>
          ) : transactionsError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {transactionsError}
            </Alert>
          ) : walletTransactions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <InfoIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6">No transactions found</Typography>
              <Typography variant="body2" color="text.secondary">
                There are no transactions matching your filter criteria.
              </Typography>
            </Paper>
          ) : (
            <TableContainer
              component={Paper}
              sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 2 }}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: "grey.100" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Balance Before</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Balance After</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {walletTransactions.map((transaction) => (
                    <TableRow
                      key={transaction._id}
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                        bgcolor:
                          transaction.type === "CREDIT"
                            ? "rgba(76, 175, 80, 0.04)"
                            : transaction.type === "DEBIT"
                            ? "rgba(244, 67, 54, 0.04)"
                            : "inherit"
                      }}
                      hover>
                      <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                      <TableCell>
                        <Chip
                          icon={
                            transaction.type === "CREDIT" ? (
                              <AddCircleIcon fontSize="small" />
                            ) : transaction.type === "DEBIT" ? (
                              <RemoveCircleIcon fontSize="small" />
                            ) : (
                              <CircleIcon fontSize="small" />
                            )
                          }
                          label={transaction.type}
                          size="small"
                          color={
                            transaction.type === "CREDIT" || transaction.type === "INVENTORY_ADD"
                              ? "success"
                              : transaction.type === "DEBIT" ||
                                transaction.type === "INVENTORY_BOOK"
                              ? "error"
                              : "info"
                          }
                          sx={{
                            fontWeight: "medium",
                            "& .MuiChip-icon": { ml: 0.5 }
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          color:
                            transaction.type === "CREDIT" || transaction.type === "INVENTORY_ADD"
                              ? "success.main"
                              : transaction.type === "DEBIT" ||
                                transaction.type === "INVENTORY_BOOK"
                              ? "error.main"
                              : "text.primary"
                        }}>
                        {transaction.type === "CREDIT" || transaction.type === "INVENTORY_ADD"
                          ? "+ "
                          : "- "}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.balanceBefore)}</TableCell>
                      <TableCell>{formatCurrency(transaction.balanceAfter)}</TableCell>
                      <TableCell>
                        <Tooltip title={transaction.description} arrow>
                          <Typography
                            sx={{
                              maxWidth: 250,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}>
                            {(() => {
                              // Extract just farmer name and village from description
                              if (
                                transaction.description.includes(
                                  "Wallet payment collected for Order #"
                                )
                              ) {
                                if (transaction.description.includes(" - Dealer Order")) {
                                  return "Dealer Order"
                                } else if (transaction.description.includes(" - ")) {
                                  const farmerInfo = transaction.description.split(" - ")[1]
                                  if (farmerInfo && !farmerInfo.includes("Unknown")) {
                                    return farmerInfo // Just the farmer name and village
                                  }
                                }
                              } else if (
                                transaction.description.includes("Wallet payment for Order #")
                              ) {
                                if (transaction.description.includes(" - Dealer Order")) {
                                  return "Dealer Order"
                                } else if (transaction.description.includes(" - ")) {
                                  const farmerInfo = transaction.description.split(" - ")[1]
                                  if (farmerInfo && !farmerInfo.includes("Unknown")) {
                                    return farmerInfo // Just the farmer name and village
                                  }
                                }
                              } else if (
                                transaction.description.includes("Payment collected for Order #")
                              ) {
                                if (transaction.description.includes(" - Dealer Order")) {
                                  return "Dealer Order"
                                } else if (transaction.description.includes(" - ")) {
                                  const farmerInfo = transaction.description.split(" - ")[1]
                                  if (farmerInfo && !farmerInfo.includes("Unknown")) {
                                    return farmerInfo // Just the farmer name and village
                                  }
                                }
                              }
                              // For other descriptions, show as is
                              return transaction.description
                            })()}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.status}
                          size="small"
                          color={
                            transaction.status === "COMPLETED"
                              ? "success"
                              : transaction.status === "PENDING"
                              ? "warning"
                              : "error"
                          }
                          variant="outlined"
                          sx={{ fontWeight: "medium" }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={totalTransactions}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          )}
        </Box>
      )}

      {/* Inventory Tab Panel */}
      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Plant Inventory
          </Typography>

          {dealerInventory.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <InfoIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6">No inventory found</Typography>
              <Typography variant="body2" color="text.secondary">
                This dealer doesnt have any plant inventory yet.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {dealerInventory.map((plant) => (
                <Grid item xs={12} key={`${plant.plantType}-${plant.subType}`}>
                  <Card sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 2 }}>
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2
                        }}>
                        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                          {plant.plantName} - {plant.subtypeName}
                        </Typography>

                        <Box>
                          <Chip
                            label={`Total: ${plant.totalQuantity.toLocaleString()} units`}
                            color="primary"
                            sx={{ mr: 1, fontWeight: "medium" }}
                          />
                          <Chip
                            label={`Available: ${plant.totalRemainingQuantity.toLocaleString()} units`}
                            color={plant.totalRemainingQuantity > 0 ? "success" : "error"}
                            sx={{ fontWeight: "medium" }}
                          />
                        </Box>
                      </Box>

                      <WalletUtilization
                        used={plant.totalBookedQuantity}
                        total={plant.totalQuantity}
                      />

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "medium" }}>
                        Slot Details
                      </Typography>

                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead sx={{ bgcolor: "grey.50" }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: "bold" }}>Period</TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>Total Quantity</TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>Booked Quantity</TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>Remaining Quantity</TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>Utilization</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {plant.slotDetails.map((slot) => (
                              <TableRow
                                key={slot.slotId}
                                hover
                                sx={{
                                  bgcolor:
                                    slot.remainingQuantity === 0
                                      ? "rgba(244, 67, 54, 0.04)"
                                      : "inherit"
                                }}>
                                <TableCell>
                                  <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <CalendarIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                                        {slot.dates.startDay} to {slot.dates.endDay}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {slot.dates.month} {new Date().getFullYear()}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>{slot.quantity.toLocaleString()}</TableCell>
                                <TableCell>{slot.bookedQuantity.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Typography
                                    sx={{
                                      fontWeight: "bold",
                                      color:
                                        slot.remainingQuantity > 0 ? "success.main" : "error.main"
                                    }}>
                                    {slot.remainingQuantity.toLocaleString()}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <WalletUtilization
                                    used={slot.bookedQuantity}
                                    total={slot.quantity}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  )
}

export default DealerDetails
