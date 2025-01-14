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
import { API } from 'network/core'
import axios from 'axios'
import { Cookies } from "react-cookie"
import { CookieKeys } from "constants/cookieKeys"

const DataBackupRestore = () => {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [status, setStatus] = useState(null)
  const fileInputRef = useRef(null)

  const handleBackup = async () => {
    try {
      setIsBackingUp(true)
      setStatus(null)

      // Override axios defaults for this specific request
      const cookie = new Cookies()
      const authToken = cookie.get(CookieKeys.Auth)

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
        message: 'Failed to create backup. Please try again.' 
      })
      console.error('Backup error:', error)
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      setIsImporting(true)
      setStatus(null)
      
      const cookie = new Cookies()
      const authToken = cookie.get(CookieKeys.Auth)

      const formData = new FormData()
      formData.append('backup', file)

      const customAxios = axios.create({
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`
        }
      })

      await customAxios.post(`${API.DATA.IMPORT_BACKUP.baseURL}/${API.DATA.IMPORT_BACKUP.endpoint}`, formData)
      
      setStatus({ 
        severity: 'success', 
        title: 'Success',
        message: 'Data imported successfully!' 
      })
    } catch (error) {
      setStatus({ 
        severity: 'error', 
        title: 'Error',
        message: 'Failed to import data. Please try again.' 
      })
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
          disabled={isBackingUp || isImporting}
          sx={{
            minWidth: 180,
            '&:hover': {
              backgroundColor: 'primary.dark',
            }
          }}
        >
          {isBackingUp ? 'Creating Backup...' : 'Backup Data'}
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
              disabled={isBackingUp || isImporting}
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