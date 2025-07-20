import React, { useState, useEffect } from "react"
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  IconButton,
  Divider,
  Alert,
  CircularProgress
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import EditIcon from "@mui/icons-material/Edit"
import LockIcon from "@mui/icons-material/Lock"

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 500,
  maxWidth: "90vw",
  maxHeight: "90vh",
  bgcolor: "background.paper",
  boxShadow: 24,
  borderRadius: 3,
  overflow: "auto"
}

const AddEmployeeModal = ({
  isOpen,
  onClose,
  onSubmit,
  employeeData,
  onInputChange,
  jobTitles,
  isEdit,
  loading = false,
  isSuperAdmin = false
}) => {
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset errors when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrors({})
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors = {}

    // Name validation
    if (!employeeData.name?.trim()) {
      newErrors.name = "Employee name is required"
    } else if (employeeData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    // Phone number validation
    if (!employeeData.phoneNumber) {
      newErrors.phoneNumber = "Phone number is required"
    } else if (!/^\d{10}$/.test(employeeData.phoneNumber.toString())) {
      newErrors.phoneNumber = "Please enter a valid 10-digit phone number"
    }

    // Job title validation
    if (!employeeData.jobTitle) {
      newErrors.jobTitle = "Job title is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isSuperAdmin) {
      return
    }

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e) => {
    if (!isSuperAdmin) {
      return
    }

    const { name, value } = e.target

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }

    onInputChange(e)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  // If not super admin, show permission denied message
  if (!isSuperAdmin) {
    return (
      <Modal open={isOpen} onClose={handleClose} aria-labelledby="employee-modal-title">
        <Box sx={modalStyle}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 3,
              pb: 2
            }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LockIcon sx={{ color: "warning.main", fontSize: 24 }} />
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Access Denied
              </Typography>
            </Box>
            <IconButton
              onClick={handleClose}
              sx={{
                color: "grey.500",
                "&:hover": { color: "grey.700" }
              }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider />

          <Box sx={{ p: 3, pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              You don&apos;t have permission to manage employees.
            </Alert>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Only Super Admins can add, edit, or delete employees. Please contact your system
              administrator if you need access to this functionality.
            </Typography>
            <Button variant="contained" onClick={handleClose} sx={{ mt: 2 }}>
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    )
  }

  return (
    <Modal open={isOpen} onClose={handleClose} aria-labelledby="employee-modal-title">
      <Box sx={modalStyle}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 3,
            pb: 2
          }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isEdit ? (
              <EditIcon sx={{ color: "primary.main", fontSize: 24 }} />
            ) : (
              <PersonAddIcon sx={{ color: "primary.main", fontSize: 24 }} />
            )}
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
              {isEdit ? "Edit Employee" : "Add New Employee"}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{
              color: "grey.500",
              "&:hover": { color: "grey.700" }
            }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Form */}
        <Box sx={{ p: 3, pt: 2 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Employee Name */}
              <TextField
                name="name"
                label="Employee Name *"
                value={employeeData.name || ""}
                onChange={handleInputChange}
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
                variant="outlined"
                placeholder="Enter employee name"
                disabled={isSubmitting}
              />

              {/* Phone Number */}
              <TextField
                name="phoneNumber"
                label="Phone Number *"
                value={employeeData.phoneNumber || ""}
                onChange={handleInputChange}
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber}
                fullWidth
                variant="outlined"
                placeholder="Enter 10-digit phone number"
                inputProps={{ maxLength: 10 }}
                disabled={isSubmitting}
              />

              {/* Date of Birth */}
              <TextField
                name="birthDate"
                label="Date of Birth"
                type="date"
                value={employeeData.birthDate || ""}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                InputLabelProps={{
                  shrink: true
                }}
                disabled={isSubmitting}
              />

              {/* Job Title */}
              <FormControl fullWidth error={!!errors.jobTitle}>
                <InputLabel>Job Title *</InputLabel>
                <Select
                  name="jobTitle"
                  value={employeeData.jobTitle || ""}
                  label="Job Title *"
                  onChange={handleInputChange}
                  disabled={isSubmitting}>
                  <MenuItem value="" disabled>
                    Select a job title
                  </MenuItem>
                  {jobTitles.map((title) => (
                    <MenuItem key={title} value={title}>
                      {title.replace(/_/g, " ")}
                    </MenuItem>
                  ))}
                </Select>
                {errors.jobTitle && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.jobTitle}
                  </Typography>
                )}
              </FormControl>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting || loading}
                sx={{
                  mt: 2,
                  py: 1.5,
                  fontSize: "1.1rem",
                  fontWeight: 600
                }}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : isEdit ? (
                    <EditIcon />
                  ) : (
                    <PersonAddIcon />
                  )
                }>
                {isSubmitting ? "Saving..." : isEdit ? "Update Employee" : "Add Employee"}
              </Button>
            </Stack>
          </form>
        </Box>
      </Box>
    </Modal>
  )
}

export default AddEmployeeModal
