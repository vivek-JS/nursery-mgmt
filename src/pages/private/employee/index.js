import React, { useEffect, useState } from "react"
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Box,
  Alert
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EmployeeTable from "./EmployeeTable"
import AddEmployeeModal from "./addEmployee"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { useSelector } from "react-redux"

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterJobTitle, setFilterJobTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    phoneNumber: "",
    jobTitle: "",
    birthDate: ""
  })

  // Get user data from Redux store
  const userData = useSelector((state) => state?.userData?.userData)
  const appUser = useSelector((state) => state?.app?.user)
  const user = userData || appUser || {}

  // Check if current user is super admin
  const isSuperAdmin = user?.role === "SUPER_ADMIN"

  const jobTitles = [
    "Manager",
    "HR",
    "SALES",
    "OFFICE_STAFF",
    "PRIMARY",
    "DRIVER",
    "LABORATORY_MANAGER",
    "DEALER",
    "OFFICE_ADMIN",
    "ACCOUNTANT",
    "DISPATCH_MANAGER"
  ]

  const getEmployees = async () => {
    try {
      setLoading(true)
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE)
      const emps = await instance.request({})
      setEmployees(emps?.data?.data || [])
    } catch (error) {
      console.error("Error fetching employees:", error)
      Toast.error("Failed to fetch employees")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getEmployees()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewEmployee((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const resetForm = () => {
    setNewEmployee({
      name: "",
      phoneNumber: "",
      jobTitle: "",
      birthDate: ""
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Check if user has permission
    if (!isSuperAdmin) {
      Toast.error("Only Super Admins can manage employees")
      return
    }

    // Basic validation
    if (!newEmployee.name || !newEmployee.phoneNumber || !newEmployee.jobTitle) {
      Toast.error("Please fill in all required fields")
      return
    }

    // Phone number validation
    if (!/^\d{10}$/.test(newEmployee.phoneNumber.toString())) {
      Toast.error("Please enter a valid 10-digit phone number")
      return
    }

    try {
      if (isEdit) {
        const instance = NetworkManager(API.EMPLOYEE.UPDATE_EMPLOYEE)
        const response = await instance.request(newEmployee)

        if (response?.data?.status === "success" || response?.code === 200) {
          Toast.success("Employee updated successfully")
          setIsModalOpen(false)
          resetForm()
          getEmployees()
        } else {
          Toast.error(response?.data?.message || "Failed to update employee")
        }
      } else {
        const instance = NetworkManager(API.EMPLOYEE.ADD_EMPLOYEE_LOGIN)
        const response = await instance.request(newEmployee)

        if (response?.data?.status === "success" || response?.code === 201) {
          Toast.success("Employee added successfully")
          setIsModalOpen(false)
          resetForm()
          getEmployees()
        } else {
          Toast.error(response?.data?.message || "Failed to add employee")
        }
      }
    } catch (error) {
      console.error("Error saving employee:", error)
      const errorMessage = error?.data?.message || error?.message || "Failed to save employee"
      Toast.error(errorMessage)
    }
  }

  const handleEdit = (employee) => {
    if (!isSuperAdmin) {
      Toast.error("Only Super Admins can edit employees")
      return
    }

    setNewEmployee({
      name: employee.name || "",
      phoneNumber: employee.phoneNumber || "",
      jobTitle: employee.jobTitle || "",
      birthDate: employee.birthDate || "",
      _id: employee._id
    })
    setIsEdit(true)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!isSuperAdmin) {
      Toast.error("Only Super Admins can delete employees")
      return
    }

    if (!window.confirm("Are you sure you want to delete this employee?")) {
      return
    }

    try {
      const instance = NetworkManager(API.EMPLOYEE.DELETE_EMPLOYEE)
      const response = await instance.request({ id })

      if (response?.data?.status === "success" || response?.code === 200) {
        Toast.success("Employee deleted successfully")
        getEmployees()
      } else {
        Toast.error(response?.data?.message || "Failed to delete employee")
      }
    } catch (error) {
      console.error("Error deleting employee:", error)
      Toast.error("Failed to delete employee")
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setIsEdit(false)
    resetForm()
  }

  const filteredEmployees = employees?.filter((employee) => {
    const matchesSearch = employee.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesJobTitle = !filterJobTitle || employee.jobTitle === filterJobTitle
    return matchesSearch && matchesJobTitle
  })

  return (
    <Box sx={{ p: 3 }}>
      {/* Permission Alert */}
      {!isSuperAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You are viewing employees in read-only mode. Only Super Admins can add, edit, or delete
          employees.
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            if (!isSuperAdmin) {
              Toast.error("Only Super Admins can add employees")
              return
            }
            setIsEdit(false)
            resetForm()
            setIsModalOpen(true)
          }}
          disabled={!isSuperAdmin}>
          Add Employee
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Search Employees"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 300 }}
        />
        <FormControl size="small" sx={{ width: 200 }}>
          <InputLabel>Filter by Job Title</InputLabel>
          <Select
            value={filterJobTitle}
            label="Filter by Job Title"
            onChange={(e) => setFilterJobTitle(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {jobTitles.map((title) => (
              <MenuItem key={title} value={title}>
                {title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <EmployeeTable
        employees={filteredEmployees}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        isSuperAdmin={isSuperAdmin}
      />

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        employeeData={newEmployee}
        onInputChange={handleInputChange}
        jobTitles={jobTitles}
        isEdit={isEdit}
        loading={loading}
        isSuperAdmin={isSuperAdmin}
      />
    </Box>
  )
}

export default EmployeeManagement
