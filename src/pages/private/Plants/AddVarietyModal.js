import React from "react"
import { Modal, Box, Typography, TextField, Button, Stack, IconButton } from "@mui/material"
import { Plus, Trash2 } from "lucide-react"

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 500,
  maxHeight: "90vh",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  overflow: "auto"
}

const AddVarietyModal = ({
  isOpen,
  onClose,
  onSubmit,
  varietyData,
  onInputChange,
  loading = false
}) => {
  const handleAddRate = () => {
    const newRates = [...varietyData.rates, ""]
    onInputChange({ target: { name: "rates", value: newRates } })
  }

  const handleRemoveRate = (index) => {
    const newRates = varietyData.rates.filter((_, i) => i !== index)
    onInputChange({ target: { name: "rates", value: newRates } })
  }

  const handleRateChange = (index, value) => {
    const newRates = [...varietyData.rates]
    newRates[index] = value
    onInputChange({ target: { name: "rates", value: newRates } })
  }

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Add Variety to Plant
        </Typography>
        <form onSubmit={onSubmit}>
          <Stack spacing={3}>
            <TextField
              name="varietyName"
              label="Variety Name"
              value={varietyData.varietyName}
              onChange={onInputChange}
              required
              fullWidth
            />
            <TextField
              name="plantName"
              label="Plant Name"
              value={varietyData.plantName}
              onChange={onInputChange}
              required
              fullWidth
              disabled
            />
            <TextField
              name="description"
              label="Description"
              value={varietyData.description}
              onChange={onInputChange}
              fullWidth
              multiline
              rows={2}
            />

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Rates
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                {varietyData.rates.map((rate, index) => (
                  <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Rate"
                      value={rate}
                      onChange={(e) => handleRateChange(index, e.target.value)}
                      sx={{ width: 120 }}
                    />
                    {varietyData.rates.length > 1 && (
                      <IconButton
                        onClick={() => handleRemoveRate(index)}
                        color="error"
                        size="small">
                        <Trash2 size={14} />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Box>
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={handleAddRate}
                startIcon={<Plus size={16} />}>
                Add Rate
              </Button>
            </Box>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button type="button" variant="outlined" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? "Adding..." : "Add Variety"}
              </Button>
            </Box>
          </Stack>
        </form>
      </Box>
    </Modal>
  )
}

export default AddVarietyModal
