import React from "react"
import { Grid, Button, Typography, Box, CircularProgress } from "@mui/material"
import { makeStyles } from "tss-react/mui"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import LockIcon from "@mui/icons-material/Lock"

const EmployeeTable = ({ employees, onEdit, onDelete, loading = false, isSuperAdmin = false }) => {
  const { classes } = useStyles()

  const getDynamicStyle = (span, totalColumns, gap) => ({
    width: `calc(${(span / totalColumns) * 100}% - ${gap}px)`,
    marginRight: gap + "px"
  })

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
          background: "#F0F0F0",
          borderRadius: 2,
          mt: 2
        }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading employees...
        </Typography>
      </Box>
    )
  }

  if (!employees || employees.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
          background: "#F0F0F0",
          borderRadius: 2,
          mt: 2
        }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          No employees found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {employees?.length === 0
            ? "No employees have been added yet."
            : "Try adjusting your search or filters."}
        </Typography>
      </Box>
    )
  }

  return (
    <Grid container className={classes.inventoryContainer}>
      <Grid container className={classes.tableHead}>
        <Grid item style={getDynamicStyle(3, 12, 14, true)} className={classes.label}>
          Employee Name
        </Grid>

        <Grid item style={getDynamicStyle(3, 12, 14, true)} className={classes.label}>
          Phone Number
        </Grid>
        <Grid item style={getDynamicStyle(3, 12, 14, true)} className={classes.label}>
          Job Title
        </Grid>
        <Grid
          item
          style={getDynamicStyle(3, 12, 14, true)}
          className={`${classes.label} ${classes.noMarginRight}`}>
          {isSuperAdmin ? "Actions" : "Access"}
        </Grid>
      </Grid>
      {employees?.map((employee, index) => (
        <Grid container className={classes.tableRow} key={employee._id || employee.id || index}>
          <Grid
            item
            style={getDynamicStyle(3, 12, 14)}
            className={`${classes.tableCell} ${classes.nameClass}`}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {employee.name || "N/A"}
            </Typography>
          </Grid>

          <Grid item style={getDynamicStyle(3, 12, 14)} className={classes.tableCell}>
            <Typography variant="body2">{employee.phoneNumber || "N/A"}</Typography>
          </Grid>
          <Grid item style={getDynamicStyle(3, 12, 14)} className={classes.tableCell}>
            <Typography variant="body2">
              {employee.jobTitle ? employee.jobTitle.replace(/_/g, " ") : "N/A"}
            </Typography>
          </Grid>
          <Grid
            item
            style={getDynamicStyle(3, 12, 14)}
            className={`${classes.tableCell} ${classes.noMarginRight} ${classes.actionCell}`}>
            {isSuperAdmin ? (
              <>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => onEdit(employee)}
                  className={classes.actionButton}
                  startIcon={<EditIcon sx={{ fontSize: 16 }} />}>
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => onDelete(employee?._id)}
                  className={classes.actionButton}
                  startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}>
                  Delete
                </Button>
              </>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LockIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  Read Only
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      ))}
    </Grid>
  )
}

const useStyles = makeStyles()(() => ({
  inventoryContainer: {
    padding: 5,
    background: "#F0F0F0",
    marginTop: 12,
    borderRadius: 2
  },
  noMarginRight: {
    marginRight: 0
  },
  label: {
    height: 45,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 5,
    fontSize: 16,
    fontWeight: 700,
    flexDirection: "column",
    background: "#FFF",
    color: "#3A4BB6",
    marginRight: "0.7%",
    borderRadius: "4px 4px 0 0"
  },
  tableHead: {
    boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.1)",
    color: "black",
    background: "#FFF",
    borderRadius: "4px 4px 0 0"
  },
  tableCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 5,
    flexDirection: "column",
    background: "#FFF",
    height: 50,
    fontWeight: 400,
    fontSize: 14,
    marginRight: "0.7%",
    borderBottom: "1px solid #f0f0f0"
  },
  tableRow: {
    marginTop: 0,
    "&:hover": {
      backgroundColor: "#f8f9fa"
    }
  },
  nameClass: {
    alignItems: "flex-start",
    paddingLeft: 10,
    justifyContent: "center"
  },
  actionCell: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center"
  },
  actionButton: {
    height: 32,
    fontSize: 12,
    boxShadow: "none",
    textTransform: "none",
    fontWeight: 500,
    "&:hover": {
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }
  }
}))

export default EmployeeTable
