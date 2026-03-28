import React from "react"
import { Autocomplete, TextField } from "@mui/material"

export default function SearchableSelectField({
  options = [],
  value = "",
  onChange,
  label = "",
  placeholder = "",
  size = "small",
  disabled = false,
  fullWidth = true,
  clearable = true,
  noOptionsText = "No options",
  sx = {},
  textFieldSx = {},
}) {
  const normalizedOptions = (options || []).map((opt) =>
    typeof opt === "string"
      ? { label: opt, value: opt }
      : { label: opt?.label ?? String(opt?.value ?? ""), value: opt?.value ?? "" }
  )

  const selectedOption =
    normalizedOptions.find((opt) => String(opt.value) === String(value)) || null

  return (
    <Autocomplete
      size={size}
      disabled={disabled}
      fullWidth={fullWidth}
      options={normalizedOptions}
      value={selectedOption}
      disableClearable={!clearable}
      noOptionsText={noOptionsText}
      onChange={(_, nextOption) => {
        onChange?.(nextOption?.value ?? "")
      }}
      isOptionEqualToValue={(option, val) => String(option?.value) === String(val?.value)}
      getOptionLabel={(option) => option?.label ?? ""}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          sx={textFieldSx}
        />
      )}
    />
  )
}
