import React, { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Tooltip
} from "@mui/material"
import { green } from "@mui/material/colors"
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline"
import LocalFloristIcon from "@mui/icons-material/LocalFlorist"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"

const theme = createTheme({
  palette: {
    primary: {
      main: green[700]
    },
    secondary: {
      main: green[500]
    }
  },
  components: {
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: green[50]
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        }
      }
    }
  }
})

const PlantTrackingTable = () => {
  const formatDate = (date) => {
    return new Date(date)
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })
      .replace(/\//g, "-")
  }

  const [entries, setEntries] = useState([
    {
      outwardDate: "2025-01-01",
      batchNo: "B001",
      bottles: 100,
      size: "Large",
      plants: 500,
      rootingDate: "2024-12-15"
    }
  ])

  const [open, setOpen] = useState(false)
  const [newEntry, setNewEntry] = useState({
    outwardDate: new Date().toISOString().split("T")[0],
    batchNo: "",
    bottles: "",
    size: "",
    plants: "",
    rootingDate: ""
  })
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    getBatches()
    getOutwards()
  }, [])

  const getBatches = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.BATCH.GET_BATCHES)
      const response = await instance.request({})

      if (response.data?.data) {
        setBatches(response.data.data?.data)
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
    } finally {
      setLoading(false)
    }
  }
  const getOutwards = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.PLANT_OUTWARD.GET_OUTWARDS)
      const response = await instance.request({})

      if (response.data?.data) {
        console.log(response.data?.data)
        setEntries(response.data?.data)
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
    } finally {
      setLoading(false)
    }
  }
  const sizes = ["R1", "R2", "R3"]
  const calculateAge = (rootingDate, outwardDate) => {
    const diffTime = Math.abs(new Date(outwardDate) - new Date(rootingDate))
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const handleLabSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const instance = NetworkManager(API.PLANT_OUTWARD.ADD_LAB)
      const payload = {
        labData: {
          outwardDate: newEntry.outwardDate,
          size: newEntry.size,
          bottles: newEntry.bottles,
          plants: newEntry.plants,
          rootingDate: newEntry.rootingDate
        },
        batchId: newEntry?.batchNo
      }

      const response = await instance.request(payload)

      if (response.data) {
        //  setIsFormOpen(false)
        setNewEntry({
          outwardDate: new Date().toISOString().split("T")[0],
          size: "",
          bottles: "",
          plants: "",
          rootingDate: ""
        })
        getOutwards()

        //setRefresh(!refresh)
        setOpen(false)
      }
    } catch (error) {
      console.error("Error adding lab entry:", error)
    } finally {
      setLoading(false)
    }
  }
  const calculatePlants = (size, bottles) => {
    const multipliers = {
      R1: 10,
      R2: 10,
      R3: 9
    }
    return bottles * multipliers[size]
  }
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ p: 4, backgroundColor: "#f5f9f5", minHeight: "100vh" }}>
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          {loading && <PageLoader />}

          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <LocalFloristIcon sx={{ fontSize: 40, color: green[700] }} />
              <Typography variant="h4" component="h1" sx={{ color: green[900], fontWeight: 600 }}>
                Plant Outwards
              </Typography>
            </Box>
            <Tooltip title="Add New Entry">
              <IconButton
                color="primary"
                onClick={() => setOpen(true)}
                sx={{
                  backgroundColor: green[50],
                  "&:hover": { backgroundColor: green[100] },
                  p: 2
                }}>
                <AddCircleOutlineIcon sx={{ fontSize: 30 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <TableContainer component={Paper} elevation={2}>
            {entries?.map((batchEntry) => (
              <Box key={batchEntry._id} sx={{ mb: 4 }}>
                <Typography
                  variant="h6"
                  sx={{
                    p: 2,
                    bgcolor: green[100],
                    color: green[900],
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 2
                  }}>
                  <LocalFloristIcon />
                  Batch Number: {batchEntry?.batchId?.batchNumber}
                  <Typography variant="body2" sx={{ ml: 2, color: green[800] }}>
                    (Added on: {formatDate(batchEntry.batchId?.dateAdded)})
                  </Typography>
                </Typography>

                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold", color: green[900] }}>
                        Outward Date
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", color: green[900] }}>Size</TableCell>
                      <TableCell sx={{ fontWeight: "bold", color: green[900] }}>Bottles</TableCell>
                      <TableCell sx={{ fontWeight: "bold", color: green[900] }}>Plants</TableCell>
                      <TableCell sx={{ fontWeight: "bold", color: green[900] }}>
                        Rooting Date
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", color: green[900] }}>
                        Age (Days)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batchEntry.outward?.map((outward) => (
                      <TableRow
                        key={outward._id}
                        sx={{ "&:hover": { backgroundColor: green[50] } }}>
                        <TableCell>{formatDate(outward?.outwardDate)}</TableCell>
                        <TableCell>{outward.size}</TableCell>
                        <TableCell>{outward.bottles}</TableCell>
                        <TableCell>{outward.plants}</TableCell>
                        <TableCell>{formatDate(outward.rootingDate)}</TableCell>
                        <TableCell>
                          {calculateAge(outward.rootingDate, outward.outwardDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!batchEntry.outward?.length && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: green[700] }}>
                          No outward entries yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            ))}
          </TableContainer>
        </Paper>

        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 2
            }
          }}>
          <DialogTitle sx={{ color: green[900], fontWeight: 600 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <AddCircleOutlineIcon sx={{ color: green[700] }} />
              Add New Plant Entry
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
              <TextField
                type="date"
                label="Outward Date"
                value={newEntry.outwardDate}
                onChange={(e) => setNewEntry({ ...newEntry, outwardDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <TextField
                select
                label="Batch No."
                value={newEntry.batchNo}
                onChange={(e) => setNewEntry({ ...newEntry, batchNo: e.target.value })}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}>
                {batches?.map(({ batchNumber, id }) => (
                  <MenuItem key={batchNumber} value={id}>
                    {batchNumber}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="number"
                label="No. of Bottles"
                value={newEntry.bottles}
                onChange={(e) => setNewEntry({ ...newEntry, bottles: e.target.value })}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <TextField
                select
                label="Size"
                value={newEntry.size}
                onChange={(e) => {
                  const size = e.target.value
                  const bottles = newEntry.bottles || 0
                  setNewEntry({
                    ...newEntry,
                    size,
                    plants: calculatePlants(size, bottles)
                  })
                }}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}>
                {sizes.map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="number"
                label="No. of Plants"
                value={newEntry.plants}
                onChange={(e) => setNewEntry({ ...newEntry, plants: e.target.value })}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <TextField
                type="date"
                label="Date of Rooting"
                value={newEntry.rootingDate}
                onChange={(e) => setNewEntry({ ...newEntry, rootingDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 2, px: 4 }}>
              Cancel
            </Button>
            <Button onClick={handleLabSubmit} variant="contained" sx={{ borderRadius: 2, px: 4 }}>
              Add Entry
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  )
}

export default PlantTrackingTable
