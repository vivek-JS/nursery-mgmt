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
  CircularProgress,
  Fade,
  Paper
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import EditIcon from "@mui/icons-material/Edit"
import LockIcon from "@mui/icons-material/Lock"
import PhoneIcon from "@mui/icons-material/Phone"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"
import WorkIcon from "@mui/icons-material/Work"
import PersonIcon from "@mui/icons-material/Person"

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 550,
  maxWidth: "90vw",
  maxHeight: "90vh",
  bgcolor: "background.paper",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)",
  borderRadius: 4,
  overflow: "hidden",
  outline: "none"
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
      <Modal
        open={isOpen}
        onClose={handleClose}
        aria-labelledby="employee-modal-title"
        closeAfterTransition>
        <Fade in={isOpen}>
          <Box sx={modalStyle}>
            {/* Gradient Header */}
            <Box
              sx={{
                background: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                p: 3,
                pb: 2.5,
                position: "relative",
                overflow: "hidden"
              }}>
              <Box
                sx={{
                  position: "absolute",
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.1)",
                  filter: "blur(40px)"
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  position: "relative",
                  zIndex: 1
                }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(10px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                    <LockIcon sx={{ color: "white", fontSize: 28 }} />
                  </Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 700,
                      color: "white",
                      textShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}>
                    Access Denied
                  </Typography>
                </Box>
                <IconButton
                  onClick={handleClose}
                  sx={{
                    color: "white",
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(10px)",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.3)",
                      transform: "rotate(90deg)",
                      transition: "all 0.3s ease"
                    },
                    transition: "all 0.3s ease"
                  }}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ p: 4, pt: 3 }}>
              <Alert
                severity="warning"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  "& .MuiAlert-icon": {
                    fontSize: 28
                  }
                }}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  You don&apos;t have permission to manage employees.
                </Typography>
              </Alert>
              <Typography
                variant="body1"
                sx={{
                  mb: 3,
                  color: "text.secondary",
                  lineHeight: 1.7
                }}>
                Only Super Admins can add, edit, or delete employees. Please contact your system
                administrator if you need access to this functionality.
              </Typography>
              <Button
                variant="contained"
                onClick={handleClose}
                fullWidth
                sx={{
                  mt: 2,
                  py: 1.5,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                  boxShadow: "0 4px 12px rgba(255, 152, 0, 0.4)",
                  fontWeight: 600,
                  fontSize: "1rem",
                  textTransform: "none",
                  "&:hover": {
                    background: "linear-gradient(135deg, #f57c00 0%, #e65100 100%)",
                    boxShadow: "0 6px 16px rgba(255, 152, 0, 0.5)",
                    transform: "translateY(-2px)",
                    transition: "all 0.3s ease"
                  },
                  transition: "all 0.3s ease"
                }}>
                Close
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>
    )
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="employee-modal-title"
      closeAfterTransition>
      <Fade in={isOpen}>
        <Box sx={modalStyle}>
          {/* Gradient Header */}
          <Box
            sx={{
              background: isEdit
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              p: 3.5,
              pb: 3,
              position: "relative",
              overflow: "hidden"
            }}>
            {/* Decorative circles */}
            <Box
              sx={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 250,
                height: 250,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.15)",
                filter: "blur(50px)"
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -40,
                left: -40,
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.1)",
                filter: "blur(40px)"
              }}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
                zIndex: 1
              }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: "rgba(255, 255, 255, 0.25)",
                    backdropFilter: "blur(10px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}>
                  {isEdit ? (
                    <EditIcon sx={{ color: "white", fontSize: 28 }} />
                  ) : (
                    <PersonAddIcon sx={{ color: "white", fontSize: 28 }} />
                  )}
                </Box>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{
                    fontWeight: 700,
                    color: "white",
                    textShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    letterSpacing: "-0.02em"
                  }}>
                  {isEdit ? "Edit Employee" : "Add New Employee"}
                </Typography>
              </Box>
              <IconButton
                onClick={handleClose}
                disabled={isSubmitting}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.3)",
                    transform: "rotate(90deg)",
                    transition: "all 0.3s ease"
                  },
                  "&:disabled": {
                    opacity: 0.5
                  },
                  transition: "all 0.3s ease"
                }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Form */}
          <Box
            sx={{
              p: 4,
              pt: 3.5,
              background: "linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,1))"
            }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3.5}>
                {/* Employee Name */}
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <PersonIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      Employee Name
                    </Typography>
                  </Box>
                  <TextField
                    name="name"
                    label="Full Name *"
                    value={employeeData.name || ""}
                    onChange={handleInputChange}
                    error={!!errors.name}
                    helperText={errors.name}
                    fullWidth
                    variant="outlined"
                    placeholder="Enter employee full name"
                    disabled={isSubmitting}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.15)"
                        },
                        "&.Mui-focused": {
                          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.25)"
                        }
                      }
                    }}
                  />
                </Box>

                {/* Phone Number */}
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <PhoneIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      Contact Number
                    </Typography>
                  </Box>
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
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.15)"
                        },
                        "&.Mui-focused": {
                          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.25)"
                        }
                      }
                    }}
                  />
                </Box>

                {/* Date of Birth */}
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <CalendarTodayIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      Date of Birth
                    </Typography>
                  </Box>
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
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.15)"
                        },
                        "&.Mui-focused": {
                          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.25)"
                        }
                      }
                    }}
                  />
                </Box>

                {/* Job Title */}
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <WorkIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      Job Title
                    </Typography>
                  </Box>
                  <FormControl fullWidth error={!!errors.jobTitle}>
                    <InputLabel>Job Title *</InputLabel>
                    <Select
                      name="jobTitle"
                      value={employeeData.jobTitle || ""}
                      label="Job Title *"
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      sx={{
                        borderRadius: 2,
                        "& .MuiOutlinedInput-notchedOutline": {
                          transition: "all 0.3s ease"
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.15)"
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.25)"
                        }
                      }}>
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
                </Box>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting || loading}
                  fullWidth
                  sx={{
                    mt: 1,
                    py: 1.75,
                    borderRadius: 2,
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    textTransform: "none",
                    background: isEdit
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    boxShadow: "0 4px 16px rgba(102, 126, 234, 0.4)",
                    "&:hover": {
                      background: isEdit
                        ? "linear-gradient(135deg, #764ba2 0%, #667eea 100%)"
                        : "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                      boxShadow: "0 6px 20px rgba(102, 126, 234, 0.5)",
                      transform: "translateY(-2px)",
                      transition: "all 0.3s ease"
                    },
                    "&:disabled": {
                      background: "rgba(102, 126, 234, 0.3)",
                      boxShadow: "none"
                    },
                    transition: "all 0.3s ease"
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
      </Fade>
    </Modal>
  )
}

export default AddEmployeeModal
