import * as React from "react"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import Select from "@mui/material/Select"
import Box from "@mui/material/Box"
import InputLabel from "@mui/material/InputLabel"

export default function CustomSelect({ label, items, onChange, value, style }) {
  return (
    <Box sx={{ width: "100%", height: 50, ...style }}>
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">{label}</InputLabel>
        <Select
          sx={{}}
          style={{ height: 45 }}
          MenuProps={{
            anchorOrigin: {
              vertical: "bottom",
              horizontal: "left"
            },
            transformOrigin: {
              vertical: "top",
              horizontal: "left"
            },
            getContentAnchorEl: null,
            classes: {
              root: {
                backgroud: "red"
              },
              paper: {
                backgroud: "red"
              }
            }
          }}
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={value}
          label="Agce"
          onChange={onChange}>
          {items.map((item) => (
            <MenuItem key={item.value} value={item.value}>
              {item.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}
