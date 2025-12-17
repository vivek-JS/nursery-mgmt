import React, { useState, useRef } from 'react'
import {
  Box,
  Button,
  Stack,
  Typography,
  Alert,
  AlertTitle,
  Paper,
  CircularProgress,
  Fade
} from '@mui/material'
import BackupIcon from '@mui/icons-material/Backup'
import RestoreIcon from '@mui/icons-material/Restore'
import SaveIcon from '@mui/icons-material/Save'
import { API } from 'network/core'
import NetworkManager from 'network/core/networkManager'
import axios from 'axios'
import { CookieKeys } from "constants/cookieKeys"

const DataBackupRestore = () => {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isSavingBackup, setIsSavingBackup] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [status, setStatus] = useState(null)
  const fileInputRef = useRef(null)

  const handleBackup = async () => {
    try {
      setIsBackingUp(true)
      setStatus(null)

      // Get token from localStorage (same as NetworkManager)
      const authToken = localStorage.getItem(CookieKeys.Auth)

      if (!authToken || authToken === 'undefined' || authToken === 'null') {
        setStatus({ 
          severity: 'error', 
          title: 'Error',
          message: 'Authentication token not found. Please login again.' 
        })
        return
      }

      // Override axios defaults for this specific request
      const customAxios = axios.create({
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token to headers
          'Authorization': `Bearer ${authToken}`
        }
      })

      // Make the request using the base URL from your router
      const result = await customAxios.get(`${API.DATA.CREATE_BACKUP.baseURL}/${API.DATA.CREATE_BACKUP.endpoint}`)
      
      // Create download from blob response
      const url = window.URL.createObjectURL(new Blob([result.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `backup-${new Date().toISOString()}.zip`
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
      
      setStatus({ 
        severity: 'success', 
        title: 'Success',
        message: 'Backup downloaded successfully!' 
      })
    } catch (error) {
      setStatus({ 
        severity: 'error', 
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create backup. Please try again.' 
      })
      console.error('Backup error:', error)
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleSaveBackup = async () => {
    try {
      setIsSavingBackup(true)
      setStatus(null)

      // Get token from localStorage
      const authToken = localStorage.getItem(CookieKeys.Auth)

      if (!authToken || authToken === 'undefined' || authToken === 'null') {
        setStatus({ 
          severity: 'error', 
          title: 'Error',
          message: 'Authentication token not found. Please login again.' 
        })
        return
      }

      // Use axios with increased timeout for backup operation (10 minutes)
      const customAxios = axios.create({
        timeout: 600000, // 10 minutes
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      setStatus({ 
        severity: 'info', 
        title: 'Processing',
        message: 'Backup is being created. This may take a few minutes...' 
      })

      const result = await customAxios.post(`${API.DATA.SAVE_BACKUP.baseURL}/${API.DATA.SAVE_BACKUP.endpoint}`, {})
      
      // Handle 202 Accepted (async processing) or 200 OK (immediate completion)
      if (result.status === 202 || result.status === 200) {
        if (result.data?.success) {
          if (result.data.data?.status === 'processing') {
            setStatus({ 
              severity: 'info', 
              title: 'Processing',
              message: `Backup process started! File will be saved as: ${result.data.data.fileName}. Check the server backups folder when complete.` 
            })
          } else {
            setStatus({ 
              severity: 'success', 
              title: 'Success',
              message: `Backup saved to server successfully! File: ${result.data.data.fileName} (${result.data.data.fileSize})` 
            })
          }
        } else {
          setStatus({ 
            severity: 'error', 
            title: 'Error',
            message: result.data?.message || 'Failed to save backup to server. Please try again.' 
          })
        }
      } else {
        setStatus({ 
          severity: 'error', 
          title: 'Error',
          message: 'Unexpected response from server. Please try again.' 
        })
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setStatus({ 
          severity: 'error', 
          title: 'Timeout',
          message: 'Backup operation timed out. The backup might still be processing on the server. Please check the server logs or try again later.' 
        })
      } else {
        setStatus({ 
          severity: 'error', 
          title: 'Error',
          message: error.response?.data?.message || error.message || 'Failed to save backup to server. Please try again.' 
        })
      }
      console.error('Save backup error:', error)
    } finally {
      setIsSavingBackup(false)
    }
  }

  const handleImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      setIsImporting(true)
      setStatus(null)
      
      // Get token from localStorage (same as NetworkManager)
      const authToken = localStorage.getItem(CookieKeys.Auth)

      if (!authToken || authToken === 'undefined' || authToken === 'null') {
        setStatus({ 
          severity: 'error', 
          title: 'Error',
          message: 'Authentication token not found. Please login again.' 
        })
        return
      }

      const formData = new FormData()
      formData.append('backup', file)

      const customAxios = axios.create({
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`
        }
      })

      const result = await customAxios.post(`${API.DATA.IMPORT_BACKUP.baseURL}/${API.DATA.IMPORT_BACKUP.endpoint}`, formData)
      
      setStatus({ 
        severity: 'success', 
        title: 'Success',
        message: result.data?.message || 'Data imported successfully!' 
      })
    } catch (error) {
      setStatus({ 
        severity: 'error', 
        title: 'Error',
        message: error.response?.data?.message || 'Failed to import data. Please try again.' 
      })
      console.error('Import error:', error)
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 4,
        bgcolor: 'background.paper',
        borderRadius: 2
      }}
    >
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        Data Management
      </Typography>
      
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={2} 
        sx={{ mb: status ? 3 : 0 }}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={isBackingUp  ? <CircularProgress size={20} color="inherit" /> : <BackupIcon />}
          onClick={handleBackup}
          disabled={isBackingUp || isSavingBackup || isImporting}
          sx={{
            minWidth: 180,
            '&:hover': {
              backgroundColor: 'primary.dark',
            }
          }}
        >
          {isBackingUp ? 'Creating Backup...' : 'Download Backup'}
        </Button>

        <Button
          variant="contained"
          color="success"
          startIcon={isSavingBackup ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSaveBackup}
          disabled={isBackingUp || isSavingBackup || isImporting}
          sx={{
            minWidth: 180,
            '&:hover': {
              backgroundColor: 'success.dark',
            }
          }}
        >
          {isSavingBackup ? 'Saving...' : 'Save to Server'}
        </Button>

        <Box position="relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".zip"
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button
              variant="contained"
              color="secondary"
              component="span"
              startIcon={isImporting ? <CircularProgress size={20} color="inherit" /> : <RestoreIcon />}
              disabled={isBackingUp || isSavingBackup || isImporting}
              sx={{
                minWidth: 180,
                '&:hover': {
                  backgroundColor: 'secondary.dark',
                }
              }}
            >
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
          </label>
        </Box>
      </Stack>

      <Fade in={Boolean(status)} timeout={500}>
        <Box sx={{ mt: 3 }}>
          {status && (
            <Alert 
              severity={status.severity}
              variant="outlined"
              sx={{
                '& .MuiAlert-icon': {
                  fontSize: '24px'
                }
              }}
            >
              <AlertTitle>{status.title}</AlertTitle>
              {status.message}
            </Alert>
          )}
        </Box>
      </Fade>
    </Paper>
  )
}

export default DataBackupRestore