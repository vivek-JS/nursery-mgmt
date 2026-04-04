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
import { useIsSuperAdmin, useIsOfficeAdmin } from "utils/roleUtils"

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

  const isSuperAdmin = useIsSuperAdmin()
  const isOfficeAdmin = useIsOfficeAdmin()
  const canManageEmployees = isSuperAdmin || isOfficeAdmin

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
    "CASHIER",
    "DISPATCH_MANAGER",
    "RAM_AGRI_SALES",
    "RAM_AGRI_SALES_MANAGER"
  ]

  const getEmployees = async () => {
    try {
      setLoading(true)
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE)
      const emps = await instance.request({}, { limit: 1000 })
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

    if (!canManageEmployees) {
      Toast.error("Only Super Admin or Office Admin can manage employees")
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
    if (!canManageEmployees) {
      Toast.error("Only Super Admin or Office Admin can edit employees")
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
      {!canManageEmployees && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You are viewing employees in read-only mode. Super Admin or Office Admin can add and edit;
          only Super Admin can delete.
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            if (!canManageEmployees) {
              Toast.error("Only Super Admin or Office Admin can add employees")
              return
            }
            setIsEdit(false)
            resetForm()
            setIsModalOpen(true)
          }}
          disabled={!canManageEmployees}>
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
        canEditEmployees={canManageEmployees}
        canDeleteEmployees={isSuperAdmin}
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
        canManageEmployees={canManageEmployees}
      />
    </Box>
  )
}

export default EmployeeManagement
