import React, { useEffect, useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  CircularProgress
  ,Pagination
} from "@mui/material"
import { getCampaigns } from "network/whatsappAutomation"
import { API, NetworkManager } from "network/core"
import CampaignCreateModal from "./CampaignCreateModal"
import ContactListImporter from "./ContactListImporter"
import ExcelSendModal from "pages/private/whatsapp/ExcelSendModal"
import CampaignDetailModal from "./CampaignDetailModal"
import CampaignEditModal from "./CampaignEditModal"

const CampaignList = () => {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [showImporter, setShowImporter] = useState(false)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [viewCampaign, setViewCampaign] = useState(null)
  const [editCampaign, setEditCampaign] = useState(null)

  const fetch = async (p = page) => {
    setLoading(true)
    try {
      const res = await getCampaigns({ page: p, limit })
      if (res && res.success && res.data) {
        setCampaigns(res.data.campaigns || [])
        setTotal(res.data.total || 0)
      } else if (res && res.page !== undefined) {
        // custom response
        setCampaigns(res.campaigns || [])
        setTotal(res.total || 0)
      } else {
        setCampaigns([])
        setTotal(0)
      }
    } catch (err) {
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch(page) }, [page])

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h5" fontWeight="bold">WhatsApp Campaigns</Typography>
            <Button variant="contained" onClick={() => setShowCreate(true)}>Create Campaign</Button>
          </Stack>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : campaigns.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No campaigns yet.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Video</TableCell>
                  <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c._id || c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.message}</TableCell>
                      <TableCell>{c.videoFilename || c.video || "-"}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button size="small" onClick={() => setViewCampaign(c)}>View</Button>
                        <Button size="small" onClick={() => setEditCampaign(c)}>Edit</Button>
                        <Button size="small" color="success" onClick={async () => {
                          const instance = NetworkManager(API.CAMPAIGN.START)
                          await instance.request(null, [c._id])
                          fetch()
                        }}>Send All</Button>
                      </Stack>
                    </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={() => setShowImporter(true)}>Import Farmers</Button>
        <Button variant="outlined" onClick={() => setShowExcelModal(true)}>Upload Excel</Button>
        <Button variant="contained" onClick={() => setShowCreate(true)}>Create Campaign</Button>
      </Stack>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Pagination count={Math.ceil(total / limit) || 1} page={page} onChange={(_,v)=>setPage(v)} />
      </Box>

      <CampaignCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetch}
      />

      <ContactListImporter
        open={showImporter}
        onClose={() => setShowImporter(false)}
        onExtracted={() => { fetch(); setShowImporter(false) }}
      />

      <ExcelSendModal
        open={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        templates={[]}
        onListCreated={() => { fetch(); setShowExcelModal(false) }}
      />
      <CampaignDetailModal
        open={!!viewCampaign}
        onClose={() => setViewCampaign(null)}
        campaign={viewCampaign}
        onStart={() => fetch()}
      />
      <CampaignEditModal
        open={!!editCampaign}
        onClose={() => setEditCampaign(null)}
        campaign={editCampaign}
        onSaved={() => { fetch(); setEditCampaign(null) }}
      />
    </Box>
  )
}

export default CampaignList

