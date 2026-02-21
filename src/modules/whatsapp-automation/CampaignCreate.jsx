import React, { useState } from "react"
import { Box, Card, CardContent, Typography, TextField, Button, Stack, Alert } from "@mui/material"
import { createCampaign } from "network/whatsappAutomation"
import { API, NetworkManager } from "network/core"


const CampaignCreate = () => {
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [videoFile, setVideoFile] = useState(null)
  const [excelFile, setExcelFile] = useState(null)
  const [status, setStatus] = useState({ loading: false, success: null, error: null })

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0]
    setVideoFile(f || null)
  }
  const handleExcelChange = (e) => {
    const f = e.target.files && e.target.files[0]
    setExcelFile(f || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ loading: true, success: null, error: null })
    try {
      let res
      if (excelFile) {
        // Use upload-and-create endpoint for Excel uploads
        const form = new FormData()
        form.append("file", excelFile)
        form.append("name", name.trim() || `Campaign ${Date.now()}`)
        form.append("message", message.trim())
        const instance = NetworkManager(API.WHATSAPP_AUTOMATION.UPLOAD_AND_CREATE, true)
        res = await instance.request(form)
      } else {
        const payload = { name: name.trim(), message: message.trim(), video: videoFile }
        res = await createCampaign(payload)
      }
      if (res && res.success) {
        setStatus({ loading: false, success: "Campaign created", error: null })
        setName("")
        setMessage("")
        setVideoFile(null)
        setExcelFile(null)
        e.target.reset && e.target.reset()
      } else {
        throw new Error(res?.message || "Failed to create campaign")
      }
    } catch (err) {
      setStatus({ loading: false, success: null, error: err?.message || "Request failed" })
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight="bold">Create WhatsApp Campaign</Typography>
            {status.success && <Alert severity="success">{status.success}</Alert>}
            {status.error && <Alert severity="error">{status.error}</Alert>}
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Campaign Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
                <TextField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} required multiline minRows={4} fullWidth />
                <input accept="video/*" id="campaign-video" type="file" onChange={handleFileChange} style={{ marginTop: 8 }} />
                <div>
                  <label style={{ display: "block", marginTop: 8 }}>
                    Upload Excel (optional, will create campaign from file)
                    <input accept=".xlsx,.xls,.csv" type="file" onChange={handleExcelChange} style={{ display: "block", marginTop: 6 }} />
                  </label>
                </div>
                <Stack direction="row" spacing={2}>
                  <Button type="submit" variant="contained" disabled={status.loading}>{status.loading ? "Creating..." : "Create Campaign"}</Button>
                  <Button type="button" variant="outlined" onClick={() => { setName(""); setMessage(""); setVideoFile(null); }}>Reset</Button>
                </Stack>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default CampaignCreate

