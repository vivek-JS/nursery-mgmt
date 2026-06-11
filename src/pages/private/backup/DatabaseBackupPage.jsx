import React, { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import { Backup, CloudDownload, Computer, FolderOpen, Refresh } from "@mui/icons-material"
import axios from "axios"
import moment from "moment"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { CookieKeys } from "constants/cookieKeys"

function parseBackupListResponse(response) {
  if (!response?.success && response?.data?.status !== "Success") {
    return null
  }
  return response?.data?.data || response?.data || null
}

function DatabaseBackupPage() {
  const [backups, setBackups] = useState([])
  const [backupDir, setBackupDir] = useState("")
  const [totalSizeFormatted, setTotalSizeFormatted] = useState("")
  const [retentionDays, setRetentionDays] = useState(30)
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [alsoDownloadLocally, setAlsoDownloadLocally] = useState(true)

  const downloadBackupFile = useCallback(async (filename, { silent = false } = {}) => {
    const authToken = localStorage.getItem(CookieKeys.Auth)
    const baseURL = process.env.REACT_APP_BASE_URL || "http://localhost:8000/api/v1"

    const response = await axios({
      method: "GET",
      url: `${baseURL}/backup/download/${encodeURIComponent(filename)}`,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      responseType: "blob",
    })

    const blob = new Blob([response.data], { type: "application/gzip" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    if (!silent) {
      Toast.success("Saved to your computer (Downloads folder)")
    }
  }, [])

  const fetchBackups = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const instance = NetworkManager(API.BACKUP.LIST)
      const response = await instance.request({}, [])
      const payload = parseBackupListResponse(response)

      if (!payload) {
        setLoadError(response?.error || response?.message || "Failed to load backups")
        setBackups([])
        return
      }

      setBackups(payload.files || [])
      setBackupDir(payload.backupDir || "")
      setTotalSizeFormatted(payload.totalSizeFormatted || "")
      setRetentionDays(payload.retentionDays ?? 30)
    } catch (error) {
      console.error("Failed to load backups:", error)
      setLoadError(error?.message || "Failed to load backups")
      Toast.error(error?.response?.data?.message || "Failed to load backups")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBackups()
  }, [fetchBackups])

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const instance = NetworkManager(API.BACKUP.CREATE)
      const response = await instance.request({}, [])
      const payload = parseBackupListResponse(response)

      if (!payload) {
        Toast.error(response?.error || "Failed to create backup")
        return
      }

      Toast.success(
        `Backup saved on server: ${payload.filename} (${payload.sizeFormatted || ""})`
      )

      if (alsoDownloadLocally && payload.filename) {
        try {
          await downloadBackupFile(payload.filename, { silent: true })
          Toast.success("Copy also saved to your computer (Downloads folder)")
        } catch (downloadErr) {
          console.error("Local download failed:", downloadErr)
          Toast.error("Server backup OK, but local download failed — use Download button in the list")
        }
      }

      await fetchBackups()
    } catch (error) {
      console.error("Backup failed:", error)
      Toast.error(error?.response?.data?.message || "Failed to create backup")
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (filename) => {
    setDownloading(filename)
    try {
      await downloadBackupFile(filename)
    } catch (error) {
      console.error("Download failed:", error)
      Toast.error("Failed to download backup to your computer")
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Database Backup
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Full MongoDB backup — saved on the server and optionally on your computer.
          </Typography>
        </Box>
        <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
          <FormControlLabel
            control={
              <Switch
                checked={alsoDownloadLocally}
                onChange={(e) => setAlsoDownloadLocally(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                Also save copy on my computer
              </Typography>
            }
          />
          <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={18} /> : <Refresh />}
            onClick={fetchBackups}
            disabled={loading || creating}>
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={creating ? <CircularProgress size={18} color="inherit" /> : <Backup />}
            onClick={handleCreateBackup}
            disabled={creating || loading}>
            {creating
              ? "Creating backup…"
              : alsoDownloadLocally
                ? "Backup (server + my PC)"
                : "Backup to server only"}
          </Button>
          </Box>
        </Box>
      </Box>

      <Alert severity="info" icon={<FolderOpen />} sx={{ mb: 1 }}>
        <Typography variant="body2" fontWeight={600}>
          Two places backups can live
        </Typography>
        <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
          <strong>1. Server</strong> — always saved here first:
          {backupDir ? (
            <> <code>{backupDir}</code></>
          ) : (
            <> <code>FINAL_NURSERY_BE/backups/</code></>
          )}
          <br />
          <strong>2. Your computer</strong> — turn on &quot;Also save copy on my computer&quot; (or click
          Download) to get a <code>.tar.gz</code> in your browser Downloads folder.
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Server copies older than {retentionDays} days are auto-deleted. Keep important backups on your PC or external drive.
        </Typography>
      </Alert>

      <Alert severity="success" icon={<Computer />} sx={{ mb: 2 }} variant="outlined">
        <Typography variant="body2">
          <strong>Local backup from terminal</strong> (no browser): run{" "}
          <code>cd FINAL_NURSERY_BE && npm run backup</code> — file appears in{" "}
          <code>FINAL_NURSERY_BE/backups/</code> on this machine.
        </Typography>
      </Alert>

      {!loading && !loadError ? (
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <Chip label={`${backups.length} backup(s)`} color="primary" variant="outlined" />
          {totalSizeFormatted ? (
            <Chip label={`Total size: ${totalSizeFormatted}`} variant="outlined" />
          ) : null}
        </Box>
      ) : null}

      {loadError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}. Only SUPER_ADMIN can view backups.
        </Alert>
      ) : null}

      <Paper elevation={1}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Filename</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Modified</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Database</TableCell>
                <TableCell>Created by</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Server path</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No backups found in the server folder yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                backups.map((item, index) => (
                  <TableRow key={item.filename} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {item.filename}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {moment(item.createdAt).format("DD MMM YYYY, HH:mm")}
                    </TableCell>
                    <TableCell>
                      {moment(item.modifiedAt).format("DD MMM YYYY, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={item.method || "unknown"}
                        color={item.method === "mongodump" ? "success" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{item.database || "—"}</TableCell>
                    <TableCell>{item.createdBy || "—"}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.sizeFormatted}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.size?.toLocaleString()} bytes
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                        {item.fullPath || `${backupDir}/${item.filename}`}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          downloading === item.filename ? (
                            <CircularProgress size={16} />
                          ) : (
                            <CloudDownload />
                          )
                        }
                        onClick={() => handleDownload(item.filename)}
                        disabled={downloading === item.filename}>
                        Save to my PC
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}

export default DatabaseBackupPage
