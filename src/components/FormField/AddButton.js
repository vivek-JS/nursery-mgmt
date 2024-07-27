import React from "react"
import { styled } from "@mui/material/styles"
import Button from "@mui/material/Button"
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt"

const BootstrapButton = styled(Button)({
  boxShadow: "none",
  textTransform: "none",
  fontSize: 16,
  fontWeight: 500,
  padding: "6px 12px",
  lineHeight: 1.5,
  // backgroundColor: "#0063cc",
  border: "1px solid #3A4BB6",
  color: "#3A4BB6",
  height: 40,

  "&:hover": {
    backgroundColor: "#d8dcf3",
    borderColor: "#d8dcf3",
    boxShadow: "none"
  },
  "&:active": {
    boxShadow: "none",
    //backgroundColor: "#0062cc",
    borderColor: "#005cbf"
  },
  "&:focus": {
    boxShadow: "0 0 0 0.2rem rgba(0,123,255,.5)"
  }
})
const AddButton = ({ onClick }) => {
  return (
    <BootstrapButton onClick={onClick} disableRipple endIcon={<PersonAddAltIcon />}>
      Add
    </BootstrapButton>
  )
}
export default AddButton
