import React, { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stepper,
  Step,
  StepLabel
} from "@mui/material"
import {
  UploadCloud,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  CheckSquare,
  Upload,
  RefreshCw,
  UserPlus,
  Plus
} from "lucide-react"
import { API, NetworkManager } from "network/core"
import AddEmployeeModal from "../employee/addEmployee"
import { Toast } from "helpers/toasts/toastHelper"
import AddPlantModal from "../Plants/AddPlantModal"
import AddVarietyModal from "../Plants/AddVarietyModal"

const ExcelUpload = () => {
  const [file, setFile] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [isValid, setIsValid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failedImports, setFailedImports] = useState(null)
  const [importSummary, setImportSummary] = useState(null)
  const [activeStep, setActiveStep] = useState(0)

  // Employee modal state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false)
  const [newEmployeeData, setNewEmployeeData] = useState({
    name: "",
    phoneNumber: "",
    jobTitle: "SALES",
    birthDate: ""
  })
  const [creatingEmployee, setCreatingEmployee] = useState(false)
  const [employeeCreated, setEmployeeCreated] = useState(false)
  const [resolvedSalesPersons, setResolvedSalesPersons] = useState(new Set())

  // Plant modal state
  const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
  const [newPlantData, setNewPlantData] = useState({
    name: "",
    slotSize: 5,
    dailyDispatchCapacity: 2000,
    buffer: 0,
    subtypes: [{ name: "", description: "", rates: [""], buffer: 0 }]
  })
  const [creatingPlant, setCreatingPlant] = useState(false)
  const [plantCreated, setPlantCreated] = useState(false)
  const [resolvedPlants, setResolvedPlants] = useState(new Set())

  // Variety modal state
  const [isVarietyModalOpen, setIsVarietyModalOpen] = useState(false)
  const [newVarietyData, setNewVarietyData] = useState({
    varietyName: "",
    plantName: "",
    description: "",
    rates: [""]
  })
  const [creatingVariety, setCreatingVariety] = useState(false)
  const [varietyCreated, setVarietyCreated] = useState(false)
  const [resolvedVarieties, setResolvedVarieties] = useState(new Set())

  const steps = ["Select File", "Validate Data", "Import Data"]

  const jobTitles = [
    "Manager",
    "HR",
    "SALES",
    "OFFICE_STAFF",
    "PRIMARY",
    "DRIVER",
    "LABORATORY_MANAGER",
    "DEALER",
    "OFFICE_ADMIN"
  ]

  // Parse error message to extract sales person name
  const extractSalesPersonName = (errorMessage) => {
    const match = errorMessage.match(/Sales person "([^"]+)" not found/)
    return match ? match[1] : null
  }

  // Parse error message to extract plant name
  const extractPlantName = (errorMessage) => {
    const match = errorMessage.match(/Plant type "([^"]+)" not found/)
    return match ? match[1] : null
  }

  // Parse error message to extract variety and plant name
  const extractVarietyAndPlant = (errorMessage) => {
    const match = errorMessage.match(/Variety "([^"]+)" not found for ([^"]+)/)
    return match ? { variety: match[1], plantName: match[2] } : null
  }

  // Handle employee input change
  const handleEmployeeInputChange = (e) => {
    const { name, value } = e.target
    setNewEmployeeData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle employee creation
  const handleCreateEmployee = async (e) => {
    e.preventDefault()

    // Basic validation
    if (!newEmployeeData.name || !newEmployeeData.phoneNumber) {
      Toast.error("Please fill in all required fields")
      return
    }

    // Phone number validation
    if (!/^\d{10}$/.test(newEmployeeData.phoneNumber.toString())) {
      Toast.error("Please enter a valid 10-digit phone number")
      return
    }

    setCreatingEmployee(true)

    try {
      const instance = NetworkManager(API.EMPLOYEE.ADD_EMPLOYEE_LOGIN)
      const response = await instance.request(newEmployeeData)

      if (response?.data?.status === "success" || response?.code === 201) {
        setEmployeeCreated(true)
        setIsEmployeeModalOpen(false)

        // Add the sales person to resolved list
        setResolvedSalesPersons((prev) => new Set([...prev, newEmployeeData.name]))

        // Show success message
        Toast.success("Sales person created successfully")

        // Reset employee data
        setNewEmployeeData({
          name: "",
          phoneNumber: "",
          jobTitle: "SALES",
          birthDate: ""
        })

        // Optionally retry the import
        setTimeout(() => {
          setEmployeeCreated(false)
        }, 3000)
      }
    } catch (err) {
      console.error("Error creating employee:", err)

      // Extract error message from API response
      const errorMessage = err?.data?.message || err?.message || "Failed to create sales person"
      Toast.error(errorMessage)
    } finally {
      setCreatingEmployee(false)
    }
  }

  // Open employee modal with pre-filled name
  const openEmployeeModal = (salesPersonName) => {
    setNewEmployeeData({
      name: salesPersonName,
      phoneNumber: "",
      jobTitle: "SALES",
      birthDate: ""
    })
    setIsEmployeeModalOpen(true)
  }

  // Handle plant input change
  const handlePlantInputChange = (e) => {
    const { name, value } = e.target
    setNewPlantData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle plant creation
  const handleCreatePlant = async (e) => {
    e.preventDefault()

    // Basic validation
    if (!newPlantData.name || !newPlantData.slotSize || !newPlantData.dailyDispatchCapacity) {
      Toast.error("Please fill in all required fields")
      return
    }

    // Validate buffer percentage
    if (newPlantData.buffer < 0 || newPlantData.buffer > 100) {
      Toast.error("Buffer must be between 0% and 100%")
      return
    }

    // Validate subtypes
    if (!newPlantData.subtypes || newPlantData.subtypes.length === 0) {
      Toast.error("At least one subtype is required")
      return
    }

    const hasEmptySubtypeName = newPlantData.subtypes.some((subtype) => !subtype.name.trim())
    if (hasEmptySubtypeName) {
      Toast.error("All subtypes must have names")
      return
    }

    setCreatingPlant(true)

    try {
      const instance = NetworkManager(API.plantCms.POST_NEWPLANT)
      const response = await instance.request(newPlantData)

      if (response?.data?.status === "success" || response?.code === 201) {
        setPlantCreated(true)
        setIsPlantModalOpen(false)

        // Add the plant to resolved list
        setResolvedPlants((prev) => new Set([...prev, newPlantData.name]))

        // Show success message
        Toast.success("Plant created successfully")

        // Reset plant data
        setNewPlantData({
          name: "",
          slotSize: 5,
          dailyDispatchCapacity: 2000,
          buffer: 0,
          subtypes: [{ name: "", description: "", rates: [""], buffer: 0 }]
        })

        // Optionally retry the import
        setTimeout(() => {
          setPlantCreated(false)
        }, 3000)
      }
    } catch (err) {
      console.error("Error creating plant:", err)

      // Extract error message from API response
      const errorMessage = err?.data?.message || err?.message || "Failed to create plant"
      Toast.error(errorMessage)
    } finally {
      setCreatingPlant(false)
    }
  }

  // Open plant modal with pre-filled name
  const openPlantModal = (plantName) => {
    setNewPlantData({
      name: plantName,
      slotSize: 5,
      dailyDispatchCapacity: 2000,
      buffer: 0,
      subtypes: [{ name: "", description: "", rates: [""], buffer: 0 }]
    })
    setIsPlantModalOpen(true)
  }

  // Handle variety input change
  const handleVarietyInputChange = (e) => {
    const { name, value } = e.target
    setNewVarietyData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle variety creation
  const handleCreateVariety = async (e) => {
    e.preventDefault()

    // Basic validation
    if (!newVarietyData.varietyName || !newVarietyData.plantName) {
      Toast.error("Please fill in all required fields")
      return
    }

    setCreatingVariety(true)

    try {
      // First, get the existing plant to add the variety to it
      const getPlantInstance = NetworkManager(API.plantCms.GET_PLANTS)
      const plantsResponse = await getPlantInstance.request()

      if (plantsResponse?.data?.data) {
        const existingPlant = plantsResponse.data.data.find(
          (plant) => plant.name.toLowerCase() === newVarietyData.plantName.toLowerCase()
        )

        if (existingPlant) {
          // Add the new variety to the existing plant
          const updatedSubtypes = [
            ...existingPlant.subtypes,
            {
              name: newVarietyData.varietyName,
              description: newVarietyData.description,
              rates: newVarietyData.rates.filter((rate) => rate.trim() !== "")
            }
          ]

          const updatePayload = {
            name: existingPlant.name,
            slotSize: existingPlant.slotSize,
            dailyDispatchCapacity: existingPlant.dailyDispatchCapacity,
            subtypes: updatedSubtypes
          }

          const updateInstance = NetworkManager(API.plantCms.UPDATE_PLANT)
          const response = await updateInstance.request(updatePayload, [existingPlant._id])

          if (response?.data?.status === "success" || response?.code === 200) {
            setVarietyCreated(true)
            setIsVarietyModalOpen(false)

            // Add the variety to resolved list
            const varietyKey = `${newVarietyData.plantName}-${newVarietyData.varietyName}`
            setResolvedVarieties((prev) => new Set([...prev, varietyKey]))

            // Show success message
            Toast.success(
              `Variety "${newVarietyData.varietyName}" added to plant "${newVarietyData.plantName}" successfully`
            )

            // Reset variety data
            setNewVarietyData({
              varietyName: "",
              plantName: "",
              description: "",
              rates: [""]
            })

            // Optionally retry the import
            setTimeout(() => {
              setVarietyCreated(false)
            }, 3000)
          }
        } else {
          Toast.error(
            `Plant "${newVarietyData.plantName}" not found. Please create the plant first.`
          )
        }
      }
    } catch (err) {
      console.error("Error creating variety:", err)

      // Extract error message from API response
      const errorMessage = err?.data?.message || err?.message || "Failed to create variety"
      Toast.error(errorMessage)
    } finally {
      setCreatingVariety(false)
    }
  }

  // Open variety modal with pre-filled data
  const openVarietyModal = (varietyName, plantName) => {
    setNewVarietyData({
      varietyName: varietyName,
      plantName: plantName,
      description: "",
      rates: [""]
    })
    setIsVarietyModalOpen(true)
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setValidationResult(null)
      setIsValid(false)
      setFailedImports(null)
      setImportSummary(null)
      setActiveStep(1) // Move to validation step
    }
  }

  const handleValidate = async () => {
    if (!file) return

    setLoading(true)
    try {
      const instance = NetworkManager(API.plantCms.VALIDATE_EXCEL, true)
      const response = await instance.request({ file })

      if (response?.data?.status === "success") {
        setValidationResult(response.data)
        setIsValid(true)
        setActiveStep(2) // Move to import step
      } else {
        setValidationResult(response?.fullError || ["Validation failed"])
        setIsValid(false)
      }
    } catch (err) {
      console.log("Caught Error:", err)

      const { message, colError, fullError } = err.data || {}

      if (colError || fullError) {
        setValidationResult({
          message: message || "Validation failed",
          errors: colError || [],
          rowErrors: fullError || []
        })
      } else {
        setValidationResult({ errors: ["Server error while validating"] })
      }

      setIsValid(false)
    }

    setLoading(false)
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    try {
      const instance = NetworkManager(API.plantCms.IMPORT_EXCEL, true)
      const response = await instance.request({ file })

      if (response?.data?.status === "success") {
        if (response?.data?.data?.failedImports && response.data.data.failedImports.length > 0) {
          setFailedImports(response.data.data.failedImports)
        }

        setImportSummary({
          total: response.data.data.summary?.totalProcessed || 0,
          success: response.data.data.summary?.successfulImports || 0,
          failed: response.data.data.summary?.failedImports || 0
        })

        if (!response?.data?.data?.failedImports || response.data.data.failedImports.length === 0) {
          // Success toast or notification could go here
        }
      } else {
        // Error toast or notification could go here
      }
    } catch (err) {
      console.log(err)
      // Error toast or notification could go here
    }

    setLoading(false)
  }

  const resetProcess = () => {
    setFile(null)
    setValidationResult(null)
    setIsValid(false)
    setFailedImports(null)
    setImportSummary(null)
    setActiveStep(0)
  }

  return (
    <Box className="max-w-4xl mx-auto my-10 px-4">
      <Paper elevation={3} className="mb-8 overflow-hidden">
        <Box className="bg-blue-50 px-6 py-4 border-b border-blue-100">
          <Typography variant="h5" className="font-bold text-blue-800">
            <FileSpreadsheet className="inline mr-2 mb-1" size={22} />
            Excel Data Import
          </Typography>
          <Typography variant="body2" color="textSecondary" className="mt-1">
            Import farmer and order data from Excel spreadsheets
          </Typography>
        </Box>

        <Box className="p-6">
          <Stepper activeStep={activeStep} className="mb-8">
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {loading && <LinearProgress className="mb-6" />}

          <Box className="mb-6">
            {activeStep === 0 ? (
              <Box
                className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => document.getElementById("file-upload").click()}>
                <UploadCloud className="mx-auto mb-4 text-blue-500" size={48} />
                <Typography variant="h6" className="mb-2">
                  Drag & drop or click to upload Excel file
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Supported formats: .xlsx, .xls
                </Typography>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </Box>
            ) : (
              <Box className="mb-4">
                <Box className="flex items-center p-3 bg-blue-50 rounded-md mb-4">
                  <CheckSquare className="text-blue-500 mr-3" size={20} />
                  <Box>
                    <Typography variant="subtitle2" className="font-medium">
                      Selected File
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      {file?.name} ({Math.round(file?.size / 1024)} KB)
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<RefreshCw size={16} />}
                    onClick={resetProcess}
                    className="ml-auto">
                    Change
                  </Button>
                </Box>

                {activeStep === 1 && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleValidate}
                    disabled={loading}
                    className="mt-2"
                    startIcon={<CheckSquare size={16} />}
                    fullWidth>
                    Validate Excel Data
                  </Button>
                )}

                {activeStep === 2 && isValid && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleImport}
                    disabled={loading}
                    className="mt-2"
                    startIcon={<Upload size={16} />}
                    fullWidth>
                    Import Data Now
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Success Message for Employee Creation */}
      {employeeCreated && (
        <Paper elevation={3} className="mb-6 overflow-hidden">
          <Box className="bg-green-50 px-6 py-4 border-b border-green-100">
            <Typography variant="h6" className="font-bold text-green-800">
              <CheckCircle className="inline mr-2 mb-1" size={18} />
              Sales Person Created Successfully
            </Typography>
          </Box>
          <Box className="p-6">
            <Typography variant="body2" className="text-green-700 mb-4">
              The sales person has been added to the system. You can now retry the import.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleImport}
              disabled={loading}
              startIcon={<Upload size={16} />}>
              Retry Import
            </Button>
          </Box>
        </Paper>
      )}

      {/* Success Message for Plant Creation */}
      {plantCreated && (
        <Paper elevation={3} className="mb-6 overflow-hidden">
          <Box className="bg-green-50 px-6 py-4 border-b border-green-100">
            <Typography variant="h6" className="font-bold text-green-800">
              <CheckCircle className="inline mr-2 mb-1" size={18} />
              Plant Created Successfully
            </Typography>
          </Box>
          <Box className="p-6">
            <Typography variant="body2" className="text-green-700 mb-4">
              The plant has been added to the system. You can now retry the import.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleImport}
              disabled={loading}
              startIcon={<Upload size={16} />}>
              Retry Import
            </Button>
          </Box>
        </Paper>
      )}

      {/* Success Message for Variety Creation */}
      {varietyCreated && (
        <Paper elevation={3} className="mb-6 overflow-hidden">
          <Box className="bg-green-50 px-6 py-4 border-b border-green-100">
            <Typography variant="h6" className="font-bold text-green-800">
              <CheckCircle className="inline mr-2 mb-1" size={18} />
              Variety Added Successfully
            </Typography>
          </Box>
          <Box className="p-6">
            <Typography variant="body2" className="text-green-700 mb-4">
              The variety has been added to the plant. You can now retry the import.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleImport}
              disabled={loading}
              startIcon={<Upload size={16} />}>
              Retry Import
            </Button>
          </Box>
        </Paper>
      )}

      {/* Import Summary */}
      {importSummary && (
        <Paper elevation={3} className="mb-6 overflow-hidden">
          <Box className="bg-green-50 px-6 py-4 border-b border-green-100">
            <Typography variant="h6" className="font-bold text-green-800">
              <CheckCircle className="inline mr-2 mb-1" size={18} />
              Import Summary
            </Typography>
          </Box>
          <Box className="p-6">
            <Box className="flex flex-wrap gap-4 mb-6">
              <Chip
                icon={<CheckCircle size={16} />}
                label={`${importSummary.success} Orders Imported`}
                color="success"
                variant="outlined"
                className="px-3"
              />
              <Chip
                icon={<XCircle size={16} />}
                label={`${importSummary.failed} Failed`}
                color="error"
                variant="outlined"
                className="px-3"
              />
              <Chip
                label={`${importSummary.total} Total Processed`}
                color="primary"
                variant="outlined"
                className="px-3"
              />
            </Box>

            <Box className="bg-gray-50 rounded-lg p-4">
              <Box className="flex items-center">
                <Box className="w-full bg-gray-200 rounded-full h-2.5">
                  <Box
                    className="bg-green-500 h-2.5 rounded-full"
                    style={{
                      width: `${(importSummary.success / importSummary.total) * 100}%`
                    }}></Box>
                </Box>
                <Typography className="ml-3 text-gray-600 whitespace-nowrap">
                  {Math.round((importSummary.success / importSummary.total) * 100)}% Success
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Failed Imports Display */}
      {failedImports && failedImports.length > 0 && (
        <Paper elevation={3} className="mb-6 overflow-hidden">
          <Box className="bg-red-50 px-6 py-4 border-b border-red-100">
            <Typography variant="h6" className="font-bold text-red-800">
              <AlertTriangle className="inline mr-2 mb-1" size={18} />
              Failed Imports ({failedImports.length})
            </Typography>
          </Box>

          <Box className="divide-y divide-gray-200">
            {failedImports.map((item, index) => {
              const salesPersonName = extractSalesPersonName(item.error)
              const plantName = extractPlantName(item.error)
              const varietyData = extractVarietyAndPlant(item.error)
              const isSalesPersonResolved =
                salesPersonName && resolvedSalesPersons.has(salesPersonName)
              const isPlantResolved = plantName && resolvedPlants.has(plantName)
              const isVarietyResolved =
                varietyData &&
                resolvedVarieties.has(`${varietyData.plantName}-${varietyData.variety}`)
              const isResolved = isSalesPersonResolved || isPlantResolved || isVarietyResolved

              return (
                <Box key={index} className="p-4 hover:bg-gray-50">
                  <Box className="flex">
                    <Box className="flex-shrink-0 mr-3">
                      {isResolved ? (
                        <CheckCircle size={20} className="text-green-500 mt-1" />
                      ) : (
                        <XCircle size={20} className="text-red-500 mt-1" />
                      )}
                    </Box>
                    <Box className="flex-1">
                      <Typography variant="subtitle1" className="font-medium">
                        Booking: {item.bookingNo}
                      </Typography>
                      {isResolved ? (
                        <Typography variant="body2" className="text-green-700 mt-1">
                          {isSalesPersonResolved &&
                            `✅ Sales person &ldquo;${salesPersonName}&rdquo; has been created successfully`}
                          {isPlantResolved &&
                            `✅ Plant &ldquo;${plantName}&rdquo; has been created successfully`}
                          {isVarietyResolved &&
                            `✅ Variety &ldquo;${varietyData.variety}&rdquo; has been added to plant &ldquo;${varietyData.plantName}&rdquo;`}
                        </Typography>
                      ) : (
                        <Typography variant="body2" className="text-red-700 mt-1">
                          {item.error}
                        </Typography>
                      )}
                      {salesPersonName && !isSalesPersonResolved && (
                        <Box className="mt-3">
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<UserPlus size={16} />}
                            onClick={() => openEmployeeModal(salesPersonName)}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50">
                            Add Sales Person &ldquo;{salesPersonName}&rdquo;
                          </Button>
                        </Box>
                      )}
                      {plantName && !isPlantResolved && (
                        <Box className="mt-3">
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<Plus size={16} />}
                            onClick={() => openPlantModal(plantName)}
                            className="text-green-600 border-green-600 hover:bg-green-50">
                            Add Plant &ldquo;{plantName}&rdquo;
                          </Button>
                        </Box>
                      )}
                      {varietyData && !isVarietyResolved && (
                        <Box className="mt-3">
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<Plus size={16} />}
                            onClick={() =>
                              openVarietyModal(varietyData.variety, varietyData.plantName)
                            }
                            className="text-purple-600 border-purple-600 hover:bg-purple-50">
                            Add Variety &ldquo;{varietyData.variety}&rdquo; to &ldquo;
                            {varietyData.plantName}&rdquo;
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </Box>

          <Box className="bg-red-50 p-4 border-t border-red-100">
            <Typography className="text-sm text-gray-700 flex items-center">
              <AlertTriangle size={16} className="text-red-500 mr-2" />
              These orders could not be imported. Please review the errors and try again.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Validation Errors Display */}
      {validationResult?.length > 0 && (
        <Paper elevation={3} className="mb-6 overflow-hidden">
          <Box className="bg-yellow-50 px-6 py-4 border-b border-yellow-100">
            <Typography variant="h6" className="font-bold text-yellow-800">
              <AlertTriangle className="inline mr-2 mb-1" size={18} />
              Validation Issues
            </Typography>
          </Box>

          <Box className="p-6">
            {validationResult.map((rowErr, idx) => {
              const salesPersonName = extractSalesPersonName(rowErr?.errors?.[0] || "")
              const plantName = extractPlantName(rowErr?.errors?.[0] || "")
              const varietyData = extractVarietyAndPlant(rowErr?.errors?.[0] || "")
              return (
                <Box key={idx} className="mb-4 last:mb-0 bg-gray-50 rounded-lg p-4">
                  <Typography variant="subtitle2" className="font-medium mb-2">
                    Row {rowErr.row}:
                  </Typography>
                  <Box className="ml-4 pl-3 border-l-2 border-yellow-400">
                    {rowErr?.errors?.map((e, j) => {
                      const extractedSalesPerson = extractSalesPersonName(e)
                      const extractedPlant = extractPlantName(e)
                      const extractedVariety = extractVarietyAndPlant(e)
                      const isSalesPersonResolved =
                        extractedSalesPerson && resolvedSalesPersons.has(extractedSalesPerson)
                      const isPlantResolved = extractedPlant && resolvedPlants.has(extractedPlant)
                      const isVarietyResolved =
                        extractedVariety &&
                        resolvedVarieties.has(
                          `${extractedVariety.plantName}-${extractedVariety.variety}`
                        )
                      const isResolved =
                        isSalesPersonResolved || isPlantResolved || isVarietyResolved

                      return (
                        <Box key={j} className="mb-1 last:mb-0">
                          {isResolved ? (
                            <Typography variant="body2" className="text-green-700">
                              {isSalesPersonResolved &&
                                `✅ Sales person &ldquo;${extractedSalesPerson}&rdquo; has been created successfully`}
                              {isPlantResolved &&
                                `✅ Plant &ldquo;${extractedPlant}&rdquo; has been created successfully`}
                              {isVarietyResolved &&
                                `✅ Variety &ldquo;${extractedVariety.variety}&rdquo; has been added to plant &ldquo;${extractedVariety.plantName}&rdquo;`}
                            </Typography>
                          ) : (
                            <Typography variant="body2" className="text-gray-700">
                              • {e}
                            </Typography>
                          )}
                          {extractedSalesPerson && !isSalesPersonResolved && (
                            <Box className="mt-2">
                              <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                startIcon={<UserPlus size={16} />}
                                onClick={() => openEmployeeModal(extractedSalesPerson)}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50">
                                Add Sales Person &ldquo;{extractedSalesPerson}&rdquo;
                              </Button>
                            </Box>
                          )}
                          {extractedPlant && !isPlantResolved && (
                            <Box className="mt-2">
                              <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                startIcon={<Plus size={16} />}
                                onClick={() => openPlantModal(extractedPlant)}
                                className="text-green-600 border-green-600 hover:bg-green-50">
                                Add Plant &ldquo;{extractedPlant}&rdquo;
                              </Button>
                            </Box>
                          )}
                          {extractedVariety && !isVarietyResolved && (
                            <Box className="mt-2">
                              <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                startIcon={<Plus size={16} />}
                                onClick={() =>
                                  openVarietyModal(
                                    extractedVariety.variety,
                                    extractedVariety.plantName
                                  )
                                }
                                className="text-purple-600 border-purple-600 hover:bg-purple-50">
                                Add Variety &ldquo;{extractedVariety.variety}&rdquo; to &ldquo;
                                {extractedVariety.plantName}&rdquo;
                              </Button>
                            </Box>
                          )}
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Paper>
      )}

      {/* Employee Modal */}
      <AddEmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSubmit={handleCreateEmployee}
        employeeData={newEmployeeData}
        onInputChange={handleEmployeeInputChange}
        jobTitles={jobTitles}
        isEdit={false}
        loading={creatingEmployee}
      />

      {/* Plant Modal */}
      <AddPlantModal
        isOpen={isPlantModalOpen}
        onClose={() => setIsPlantModalOpen(false)}
        onSubmit={handleCreatePlant}
        plantData={newPlantData}
        onInputChange={handlePlantInputChange}
        loading={creatingPlant}
      />

      {/* Variety Modal */}
      <AddVarietyModal
        isOpen={isVarietyModalOpen}
        onClose={() => setIsVarietyModalOpen(false)}
        onSubmit={handleCreateVariety}
        varietyData={newVarietyData}
        onInputChange={handleVarietyInputChange}
        loading={creatingVariety}
      />
    </Box>
  )
}

export default ExcelUpload
