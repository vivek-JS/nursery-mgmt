import React, { useEffect, useState } from "react"
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Box
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EmployeeTable from "./EmployeeTable"
import AddEmployeeModal from "./addEmployee"
import { API, NetworkManager } from "network/core"

const EmployeeManagement = () => {
  const getEmployees = async () => {
    const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE)
    const emps = await instance.request({})
    setEmployees(emps?.data?.data)
  }

  useEffect(() => {
    getEmployees()
  }, [])
  const [employees, setEmployees] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterJobTitle, setFilterJobTitle] = useState("")
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    phoneNumber: "",
    jobTitle: "",
    birthDate: null
  })

  const jobTitles = [
    "Manager",
    "HR",
    "SALES",
    "OFFICE_STAFF",
    "PRIMARY",
    "DRIVER",
    "LABORATORY_MANAGER"
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewEmployee((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isEdit) {
      console.log("new", newEmployee)
      const instance = NetworkManager(API.EMPLOYEE.UPDATE_EMPLOYEE)
      const response = await instance.request(newEmployee)
      console.log(response)
    } else {
      const instance = NetworkManager(API.EMPLOYEE.ADD_EMPLOYEE_LOGIN)
      const response = await instance.request(newEmployee)
      console.log(response)
    }

    //  setNewEmployee({ name: "", phoneNumber: "", jobTitle: "" })
    //setIsModalOpen(false)
    getEmployees()
  }

  const handleEdit = (employee) => {
    setNewEmployee(employee)
    setIsEdit(true)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    const instance = NetworkManager(API.EMPLOYEE.DELETE_EMPLOYEE)
    const response = await instance.request({ id })
    console.log("del", response)
    getEmployees()
  }

  const filteredEmployees = employees?.filter((employee) => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesJobTitle = !filterJobTitle || employee.jobTitle === filterJobTitle
    return matchesSearch && matchesJobTitle
  })

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setIsEdit(false)
            setIsModalOpen(true)
          }}>
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

      <EmployeeTable employees={filteredEmployees} onEdit={handleEdit} onDelete={handleDelete} />

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        employeeData={newEmployee}
        onInputChange={handleInputChange}
        jobTitles={jobTitles}
        isEdit={isEdit}
      />
    </Box>
  )
}

export default EmployeeManagement
