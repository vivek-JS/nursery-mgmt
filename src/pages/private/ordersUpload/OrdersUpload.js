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
  RefreshCw
} from "lucide-react"
import { API, NetworkManager } from "network/core"

const ExcelUpload = () => {
  const [file, setFile] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [isValid, setIsValid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failedImports, setFailedImports] = useState(null)
  const [importSummary, setImportSummary] = useState(null)
  const [activeStep, setActiveStep] = useState(0)

  const steps = ["Select File", "Validate Data", "Import Data"]

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
            {failedImports.map((item, index) => (
              <Box key={index} className="p-4 hover:bg-gray-50">
                <Box className="flex">
                  <Box className="flex-shrink-0 mr-3">
                    <XCircle size={20} className="text-red-500 mt-1" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" className="font-medium">
                      Booking: {item.bookingNo}
                    </Typography>
                    <Typography variant="body2" className="text-red-700 mt-1">
                      {item.error}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
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
            {validationResult.map((rowErr, idx) => (
              <Box key={idx} className="mb-4 last:mb-0 bg-gray-50 rounded-lg p-4">
                <Typography variant="subtitle2" className="font-medium mb-2">
                  Row {rowErr.row}:
                </Typography>
                <Box className="ml-4 pl-3 border-l-2 border-yellow-400">
                  {rowErr?.errors?.map((e, j) => (
                    <Typography key={j} variant="body2" className="mb-1 last:mb-0 text-gray-700">
                      • {e}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  )
}

export default ExcelUpload
