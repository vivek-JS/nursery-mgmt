import React from "react"
import Button from "@mui/material/Button"
import AddIcon from "@mui/icons-material/Add"
import { styled } from "@mui/material/styles"

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: "#3A4BB6",
  color: theme.palette.common.white,
  padding: "10px 20px",
  "&:hover": {
    backgroundColor: "#32CD32"
  },
  borderRadius: "20px",
  textTransform: "none",
  fontSize: "16px",
  fontWeight: "bold",
  boxShadow: "0 3px 5px 2px rgba(0, 0, 0, .3)"
}))

const AddEmployeeButton = () => {
  const handleClick = () => {}

  return (
    <StyledButton variant="contained" startIcon={<AddIcon />} onClick={handleClick}>
      Add Employee
    </StyledButton>
  )
}

export default AddEmployeeButton
