import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack
} from "@mui/material"
import { Send, X } from "lucide-react"
import { API, NetworkManager } from "network/core"

const ViewBroadcastListModal = ({
  open,
  onClose,
  list,
  onSendMessage,
  templates = []
}) => {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !list) {
      setDetails(null)
      return
    }
    const fetchDetails = async () => {
      setLoading(true)
      try {
        if (list.type === "farmer") {
          const endpoint = { ...API.FARMER_LIST.GET_LIST_BY_ID, endpoint: `farmer-list/${list.id}` }
          const instance = NetworkManager(endpoint)
          const res = await instance.request()
          const data = res?.data?.data
          setDetails({
            name: data?.name,
            description: data?.description,
            type: "farmer",
            members: (data?.farmers || []).map((f) => ({
              name: f.name,
              phone: f.mobileNumber,
              village: f.village,
              district: f.district
            }))
          })
        } else {
          const endpoint = { ...API.WHATSAPP_CONTACT_LIST.GET_BY_ID, endpoint: `whatsapp-contact-list/${list.id}` }
          const instance = NetworkManager(endpoint)
          const res = await instance.request()
          const data = res?.data?.data
          setDetails({
            name: data?.name,
            description: data?.description,
            type: "contact",
            source: data?.source,
            members: (data?.contacts || []).map((c) => ({ name: c.name, phone: c.phone }))
          })
        }
      } catch (err) {
        console.error("Failed to load list details:", err)
        setDetails({ name: list.name, members: [], error: "Failed to load" })
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [open, list])

  const hasApprovedTemplates = (templates || []).some((t) => t.status === "APPROVED")

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <span>{details?.name ?? list?.name ?? "List"}</span>
          <Chip
            size="small"
            label={list?.type === "farmer" ? "Farmer list" : "Contact list"}
            color={list?.type === "farmer" ? "primary" : "secondary"}
            variant="outlined"
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : details?.error ? (
          <Typography color="error">{details.error}</Typography>
        ) : (
          <>
            {details?.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {details.description}
              </Typography>
            )}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Members ({details?.members?.length ?? 0})
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Phone</TableCell>
                    {details?.type === "farmer" && (
                      <>
                        <TableCell>Village</TableCell>
                        <TableCell>District</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(details?.members || []).slice(0, 50).map((m, i) => (
                    <TableRow key={i}>
                      <TableCell>{m.name || "—"}</TableCell>
                      <TableCell>{m.phone || "—"}</TableCell>
                      {details?.type === "farmer" && (
                        <>
                          <TableCell>{m.village || "—"}</TableCell>
                          <TableCell>{m.district || "—"}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {(details?.members?.length ?? 0) > 50 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Showing first 50 of {details.members.length}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<X size={18} />} onClick={onClose}>
          Close
        </Button>
        {onSendMessage && hasApprovedTemplates && details?.members?.length > 0 && (
          <Button
            variant="contained"
            startIcon={<Send size={18} />}
            onClick={() => {
              onClose()
              onSendMessage(list)
            }}
          >
            Send message
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default ViewBroadcastListModal
