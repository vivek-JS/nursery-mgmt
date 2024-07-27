import { styled } from "@mui/material/styles"
import { TextField } from "@mui/material"

const InputField = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    height: 45
  },
  minHeight: 45,
  "& .MuiInputLabel-root ": {
    marginTop: "-4px"
    // marginTop: theme.spacing(3)
  }

  // "label + &": {
  //   //marginTop: theme.spacing(3),
  // },
  // "& .MuiInputBase-input": {
  //   borderRadius: 4,
  //   position: "relative",
  //   backgroundColor: theme.palette.mode === "light" ? "#F0F0F0" : "#F0F0F0",
  //   border: "1px solid",
  //   borderColor: theme.palette.mode === "light" ? "#E0E3E7" : "#2D3843",
  //   fontSize: 16,
  //   //width: "auto",
  //   padding: "13px 12px",
  //   transition: theme.transitions.create(["border-color", "background-color", "box-shadow"]),
  //   // Use the system font instead of the default Roboto font.
  //   fontFamily: [
  //     "-apple-system",
  //     "BlinkMacSystemFont",
  //     '"Segoe UI"',
  //     "Roboto",
  //     '"Helvetica Neue"',
  //     "Arial",
  //     "sans-serif",
  //     '"Apple Color Emoji"',
  //     '"Segoe UI Emoji"',
  //     '"Segoe UI Symbol"'
  //   ].join(","),
  //   // "&:focus": {
  //   //   boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 0.2rem`,
  //   //   borderColor: theme.palette.primary.main
  //   // }
  // }
}))
export default InputField
