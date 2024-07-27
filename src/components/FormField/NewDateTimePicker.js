import { DateTimePicker } from "@mui/x-date-pickers"
import { styled } from "@mui/material/styles"

const NewDateTimePicker = styled(DateTimePicker)(({ theme }) => ({
  "label + &": {
    // marginTop: theme.spacing(3)
  },
  "& .MuiTextField-root": {
    backgroundColor: "red"
  },
  "& .MuiInputBase-input": {
    borderRadius: 4,
    position: "relative",
    border: "1px solid",
    borderColor: theme.palette.mode === "light" ? "#E0E3E7" : "#2D3843",
    fontSize: 16,
    //width: "auto",
    padding: "10px 12px",
    transition: theme.transitions.create(["border-color", "background-color", "box-shadow"]),
    // Use the system font instead of the default Roboto font.
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"'
    ].join(",")
  }
}))

export default NewDateTimePicker
