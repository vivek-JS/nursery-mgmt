import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip
} from "@mui/material"
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from "@mui/icons-material"
import { makeStyles } from "tss-react/mui"
import NetworkManager from "../../network/core/networkManager"
import { API } from "../../network/config/endpoints"
import { Toast } from "../../helpers/toasts/toastHelper"

const useStyles = makeStyles()(() => ({
  dialog: {
    "& .MuiDialog-paper": {
      minWidth: 800,
      maxWidth: 1000,
      maxHeight: "80vh"
    }
  },
  dialogTitle: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid #e0e0e0"
  },
  dialogContent: {
    padding: "24px"
  },
  tableContainer: {
    maxHeight: 400,
    marginTop: 16
  },
  table: {
    minWidth: 650
  },
  tableHead: {
    backgroundColor: "#f5f5f5"
  },
  tableHeadCell: {
    fontWeight: 600,
    color: "#333"
  },
  editRow: {
    backgroundColor: "#fff3e0"
  },
  phoneInput: {
    width: 150
  },
  actionCell: {
    width: 120
  },
  statusChip: {
    fontSize: "0.75rem"
  },
  noDataMessage: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#666"
  }
}))

const FarmerPhoneCorrectionModal = ({ open, onClose }) => {
  const { classes } = useStyles()
  const [farmers, setFarmers] = useState([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editPhone, setEditPhone] = useState("")
  const [error, setError] = useState("")

  // Fetch farmers with invalid phone numbers
  const fetchInvalidPhoneFarmers = async () => {
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.FARMER.GET_INVALID_PHONE_FARMERS)
      const response = await instance.request()

      if (response?.data?.status === "success") {
        setFarmers(response.data.data || [])
      } else {
        setError("Failed to fetch farmers with invalid phone numbers")
      }
    } catch (err) {
      console.error("Error fetching invalid phone farmers:", err)
      setError("Failed to fetch farmers with invalid phone numbers")
    } finally {
      setLoading(false)
    }
  }

  // Update farmer phone number
  const updateFarmerPhone = async (farmerId, phoneNumber) => {
    setUpdating(true)
    try {
      const instance = NetworkManager(API.FARMER.UPDATE_FARMER_PHONE)
      const response = await instance.request({ phoneNumber }, [farmerId, "phone"])

      if (response?.data?.status === "success") {
        Toast.success("Phone number updated successfully")
        // Update the local state
        setFarmers((prev) =>
          prev.map((farmer) =>
            farmer._id === farmerId
              ? { ...farmer, mobileNumber: phoneNumber, isInvalidPhone: false }
              : farmer
          )
        )
        setEditingId(null)
        setEditPhone("")
      } else {
        Toast.error("Failed to update phone number")
      }
    } catch (err) {
      console.error("Error updating farmer phone:", err)
      Toast.error("Failed to update phone number")
    } finally {
      setUpdating(false)
    }
  }

  // Handle edit button click
  const handleEdit = (farmer) => {
    setEditingId(farmer._id)
    setEditPhone(farmer.mobileNumber?.toString() || "")
  }

  // Handle save button click
  const handleSave = () => {
    if (!editPhone || editPhone.length < 10) {
      Toast.error("Please enter a valid 10-digit phone number")
      return
    }

    if (!/^\d{10}$/.test(editPhone)) {
      Toast.error("Phone number must contain only digits")
      return
    }

    updateFarmerPhone(editingId, parseInt(editPhone))
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditPhone("")
  }

  // Handle modal close
  const handleClose = () => {
    setEditingId(null)
    setEditPhone("")
    setError("")
    onClose()
  }

  // Fetch data when modal opens
  useEffect(() => {
    if (open) {
      fetchInvalidPhoneFarmers()
    }
  }, [open])

  return (
    <Dialog open={open} onClose={handleClose} className={classes.dialog} maxWidth="md" fullWidth>
      <DialogTitle className={classes.dialogTitle}>
        <Typography variant="h6">Correct Invalid Phone Numbers</Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className={classes.dialogContent}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : farmers.length === 0 ? (
          <Box className={classes.noDataMessage}>
            <Typography variant="h6" color="textSecondary">
              No farmers with invalid phone numbers found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              All farmer phone numbers are valid
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Found {farmers.length} farmer(s) with invalid phone numbers. Please correct them
              below.
            </Typography>

            <TableContainer component={Paper} className={classes.tableContainer}>
              <Table className={classes.table} stickyHeader>
                <TableHead className={classes.tableHead}>
                  <TableRow>
                    <TableCell className={classes.tableHeadCell}>Name</TableCell>
                    <TableCell className={classes.tableHeadCell}>Village</TableCell>
                    <TableCell className={classes.tableHeadCell}>District</TableCell>
                    <TableCell className={classes.tableHeadCell}>Current Phone</TableCell>
                    <TableCell className={classes.tableHeadCell}>Original Phone</TableCell>
                    <TableCell className={classes.tableHeadCell}>Status</TableCell>
                    <TableCell className={classes.tableHeadCell} align="center">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {farmers.map((farmer) => (
                    <TableRow
                      key={farmer._id}
                      className={editingId === farmer._id ? classes.editRow : ""}>
                      <TableCell>{farmer.name}</TableCell>
                      <TableCell>{farmer.village}</TableCell>
                      <TableCell>{farmer.districtName || farmer.district}</TableCell>
                      <TableCell>
                        {editingId === farmer._id ? (
                          <TextField
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="Enter 10-digit number"
                            size="small"
                            className={classes.phoneInput}
                            inputProps={{ maxLength: 10 }}
                          />
                        ) : (
                          <Typography variant="body2" color="error">
                            {farmer.mobileNumber || "Invalid"}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {farmer.originalPhoneNumber || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Invalid Phone"
                          color="error"
                          size="small"
                          className={classes.statusChip}
                        />
                      </TableCell>
                      <TableCell align="center" className={classes.actionCell}>
                        {editingId === farmer._id ? (
                          <Box display="flex" gap={1}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={handleSave}
                              disabled={updating}>
                              <SaveIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="default"
                              onClick={handleCancelEdit}
                              disabled={updating}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(farmer)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: "16px 24px", borderTop: "1px solid #e0e0e0" }}>
        <Button onClick={handleClose} color="primary">
          Close
        </Button>
        {farmers.length > 0 && (
          <Button
            onClick={fetchInvalidPhoneFarmers}
            color="primary"
            variant="outlined"
            disabled={loading}>
            Refresh
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default FarmerPhoneCorrectionModal
