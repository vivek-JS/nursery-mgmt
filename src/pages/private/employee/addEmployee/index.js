import React from "react"
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
  Stack
} from "@mui/material"

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2
}

const AddEmployeeModal = ({
  isOpen,
  onClose,
  onSubmit,
  employeeData,
  onInputChange,
  jobTitles,
  isEdit
}) => {
  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {isEdit ? "Edit Employee" : "Add New Employee"}
        </Typography>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              name="name"
              label="Employee Name"
              value={employeeData.name}
              onChange={onInputChange}
              required
              fullWidth
            />
            <TextField
              name="phoneNumber"
              label="Phone Number"
              value={employeeData.phoneNumber}
              onChange={onInputChange}
              required
              fullWidth
            />
            <TextField
              name="birthDate"
              label="Date of Birth"
              type="date"
              value={employeeData.birthDate || ""}
              onChange={onInputChange}
              fullWidth
              InputLabelProps={{
                shrink: true
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Job Title</InputLabel>
              <Select
                name="jobTitle"
                value={employeeData.jobTitle}
                label="Job Title"
                onChange={onInputChange}
                required>
                {jobTitles.map((title) => (
                  <MenuItem key={title} value={title}>
                    {title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button type="submit" variant="contained">
              {isEdit ? "Save" : "Add Employee"}
            </Button>
          </Stack>
        </form>
      </Box>
    </Modal>
  )
}

export default AddEmployeeModal
