import React from "react"
import { Modal, Box, Typography, TextField, Button, Stack, IconButton } from "@mui/material"
import { Plus, Trash2 } from "lucide-react"

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  maxHeight: "90vh",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  overflow: "auto"
}

const AddPlantModal = ({
  isOpen,
  onClose,
  onSubmit,
  plantData,
  onInputChange,
  loading = false
}) => {
  const handleAddSubtype = () => {
    const newSubtypes = [
      ...plantData.subtypes,
      { name: "", description: "", rates: [""], buffer: 0 }
    ]
    onInputChange({ target: { name: "subtypes", value: newSubtypes } })
  }

  const handleRemoveSubtype = (index) => {
    const newSubtypes = plantData.subtypes.filter((_, i) => i !== index)
    onInputChange({ target: { name: "subtypes", value: newSubtypes } })
  }

  const handleSubtypeChange = (index, field, value) => {
    const newSubtypes = [...plantData.subtypes]
    newSubtypes[index] = { ...newSubtypes[index], [field]: value }
    onInputChange({ target: { name: "subtypes", value: newSubtypes } })
  }

  const handleAddRate = (subtypeIndex) => {
    const newSubtypes = [...plantData.subtypes]
    newSubtypes[subtypeIndex].rates.push("")
    onInputChange({ target: { name: "subtypes", value: newSubtypes } })
  }

  const handleRemoveRate = (subtypeIndex, rateIndex) => {
    const newSubtypes = [...plantData.subtypes]
    newSubtypes[subtypeIndex].rates.splice(rateIndex, 1)
    onInputChange({ target: { name: "subtypes", value: newSubtypes } })
  }

  const handleRateChange = (subtypeIndex, rateIndex, value) => {
    const newSubtypes = [...plantData.subtypes]
    newSubtypes[subtypeIndex].rates[rateIndex] = value
    onInputChange({ target: { name: "subtypes", value: newSubtypes } })
  }

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Add New Plant
        </Typography>
        <form onSubmit={onSubmit}>
          <Stack spacing={3}>
            <TextField
              name="name"
              label="Plant Name"
              value={plantData.name}
              onChange={onInputChange}
              required
              fullWidth
            />
            <TextField
              name="slotSize"
              label="Slot Size"
              type="number"
              value={plantData.slotSize}
              onChange={onInputChange}
              required
              fullWidth
            />
            <TextField
              name="dailyDispatchCapacity"
              label="Daily Dispatch Capacity"
              type="number"
              value={plantData.dailyDispatchCapacity}
              onChange={onInputChange}
              required
              fullWidth
              helperText="Maximum number of plants that can be dispatched per day"
            />
            <TextField
              name="buffer"
              label="Buffer (%)"
              type="number"
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              value={plantData.buffer}
              onChange={onInputChange}
              fullWidth
              helperText="Additional buffer percentage at plant level (0-100%)"
            />

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Subtypes
              </Typography>
              {plantData.subtypes.map((subtype, index) => (
                <Box key={index} sx={{ mb: 3, p: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}>
                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    <TextField
                      label="Subtype Name"
                      value={subtype.name}
                      onChange={(e) => handleSubtypeChange(index, "name", e.target.value)}
                      required
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Description"
                      value={subtype.description}
                      onChange={(e) => handleSubtypeChange(index, "description", e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Buffer (%)"
                      type="number"
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      value={subtype.buffer || 0}
                      onChange={(e) => handleSubtypeChange(index, "buffer", e.target.value)}
                      sx={{ flex: 0.5 }}
                    />
                    {plantData.subtypes.length > 1 && (
                      <IconButton
                        onClick={() => handleRemoveSubtype(index)}
                        color="error"
                        size="small">
                        <Trash2 size={16} />
                      </IconButton>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Rates for {subtype.name || `Subtype ${index + 1}`}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                      {subtype.rates.map((rate, rateIndex) => (
                        <Box key={rateIndex} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <TextField
                            size="small"
                            placeholder="Rate"
                            value={rate}
                            onChange={(e) => handleRateChange(index, rateIndex, e.target.value)}
                            sx={{ width: 120 }}
                          />
                          {subtype.rates.length > 1 && (
                            <IconButton
                              onClick={() => handleRemoveRate(index, rateIndex)}
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
                      onClick={() => handleAddRate(index)}
                      startIcon={<Plus size={16} />}>
                      Add Rate
                    </Button>
                  </Box>
                </Box>
              ))}
              <Button
                type="button"
                variant="outlined"
                onClick={handleAddSubtype}
                startIcon={<Plus size={16} />}>
                Add Subtype
              </Button>
            </Box>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button type="button" variant="outlined" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? "Creating..." : "Add Plant"}
              </Button>
            </Box>
          </Stack>
        </form>
      </Box>
    </Modal>
  )
}

export default AddPlantModal
