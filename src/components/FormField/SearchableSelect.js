import React, { useEffect, useRef, useState } from "react"
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  InputAdornment,
  ListSubheader
} from "@mui/material"
import { Search as SearchIcon } from "@mui/icons-material"

const sameValue = (a, b) => String(a ?? "") === String(b ?? "")

export default function SearchableSelect({
  label,
  items,
  onChange,
  value,
  style,
  placeholder = "Search...",
  disabled = false,
  onOpen,
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const searchInputRef = useRef(null)
  const labelRef = useRef("")
  const options = Array.isArray(items) ? items : []

  const selectedItem = options.find((item) => sameValue(item.value, value))
  if (selectedItem?.label) labelRef.current = selectedItem.label
  else if (value === undefined || value === null || value === "") labelRef.current = ""

  const filteredItems = options.filter((item) => {
    const labelText = String(item?.label ?? "")
    if (!searchTerm.trim()) return true
    return labelText.toLowerCase().includes(searchTerm.trim().toLowerCase())
  })

  // Keep the current choice in the list so closing the menu cannot drop it.
  const visibleItems =
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !filteredItems.some((item) => sameValue(item.value, value)) &&
    selectedItem
      ? [selectedItem, ...filteredItems]
      : filteredItems

  useEffect(() => {
    if (!menuOpen) return undefined
    const timer = setTimeout(() => searchInputRef.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [menuOpen])

  const handleSelectChange = (event) => {
    const next = event.target.value
    if (next === undefined || next === null) return
    onChange(event)
    setSearchTerm("")
  }

  const handleMenuClose = () => {
    setMenuOpen(false)
    setSearchTerm("")
  }

  return (
    <Box sx={{ width: "100%", ...style }}>
      <FormControl fullWidth disabled={disabled}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value || ""}
          label={label}
          open={menuOpen}
          onChange={handleSelectChange}
          onOpen={(e) => {
            setMenuOpen(true)
            onOpen?.(e)
          }}
          onClose={handleMenuClose}
          disabled={disabled}
          renderValue={(selected) => {
            if (selected === "" || selected == null) return ""
            return selectedItem?.label || labelRef.current || ""
          }}
          MenuProps={{
            autoFocus: false,
            disableAutoFocus: true,
            disableAutoFocusItem: true,
            disableEnforceFocus: true,
            disableRestoreFocus: true,
            PaperProps: {
              style: {
                maxHeight: 300
              }
            },
            TransitionProps: {
              onEntered: () => searchInputRef.current?.focus()
            }
          }}>
          <ListSubheader
            sx={{ p: 1, lineHeight: "unset", bgcolor: "background.paper" }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}>
            <TextField
              inputRef={searchInputRef}
              fullWidth
              placeholder={placeholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") return
                if (e.key === "Tab" || e.key === "`" || e.code === "Backquote") return
                if (e.key === "ArrowDown" || e.key === "ArrowUp") return
                if (e.key === "Enter") {
                  e.preventDefault()
                }
                e.stopPropagation()
              }}
            />
          </ListSubheader>

          {visibleItems.length > 0 ? (
            visibleItems.map((item, index) => (
              <MenuItem key={`${String(item.value)}-${index}`} value={item.value}>
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
