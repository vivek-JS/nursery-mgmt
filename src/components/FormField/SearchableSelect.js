import React, { useState, useEffect } from "react"
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  InputAdornment
} from "@mui/material"
import { Search as SearchIcon } from "@mui/icons-material"

export default function SearchableSelect({
  label,
  items,
  onChange,
  value,
  style,
  placeholder = "Search...",
  disabled = false
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredItems, setFilteredItems] = useState(items)

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredItems(items)
    } else {
      const filtered = items.filter((item) =>
        item.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredItems(filtered)
    }
  }, [searchTerm, items])

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
  }

  const handleSelectChange = (event) => {
    console.log("=== SearchableSelect DEBUG ===")
    console.log("SearchableSelect onChange called with:", event)
    console.log("Event target value:", event.target.value)
    console.log("Label:", label)
    onChange(event)
    setSearchTerm("") // Clear search when selection is made
  }

  return (
    <Box sx={{ width: "100%", ...style }}>
      <FormControl fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value || ""}
          label={label}
          onChange={handleSelectChange}
          disabled={disabled}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 300
              }
            }
          }}>
          {/* Search input at the top */}
          <MenuItem sx={{ p: 0 }}>
            <TextField
              fullWidth
              placeholder={placeholder}
              value={searchTerm}
              onChange={handleSearchChange}
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </MenuItem>

          {/* Divider */}
          <MenuItem disabled sx={{ borderBottom: "1px solid #e0e0e0", minHeight: "auto", py: 0 }}>
            <Box sx={{ width: "100%", height: "1px", bgcolor: "#e0e0e0" }} />
          </MenuItem>

          {/* Filtered options */}
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled>No options found</MenuItem>
          )}
        </Select>
      </FormControl>
    </Box>
  )
}
