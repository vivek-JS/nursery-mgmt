import React, { useState } from "react"
import { Box, Card, CardContent, Typography, TextField, Button, Stack, Alert } from "@mui/material"

const WhatsAppAutomation = () => {
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [videoFile, setVideoFile] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0]
    setVideoFile(f || null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Minimal implementation: collect values and show success
    const payload = {
      name: name.trim(),
      message: message.trim(),
      video: videoFile ? videoFile.name : null
    }
    console.log("Create campaign:", payload)
    setSuccess("Campaign created (local-only): " + payload.name)
    // reset form
    setName("")
    setMessage("")
    setVideoFile(null)
    // clear file input (best-effort)
    e.target.reset && e.target.reset()
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight="bold">
              WhatsApp Automation — Create Campaign
            </Typography>
            {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Campaign Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  multiline
                  minRows={4}
                  fullWidth
                />
                <input
                  accept="video/*"
                  id="campaign-video"
                  type="file"
                  onChange={handleFileChange}
                  style={{ marginTop: 8 }}
                />
                <Stack direction="row" spacing={2}>
                  <Button type="submit" variant="contained">Create Campaign</Button>
                  <Button type="button" variant="outlined" onClick={() => { setName(""); setMessage(""); setVideoFile(null); }}>
                    Reset
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default WhatsAppAutomation

