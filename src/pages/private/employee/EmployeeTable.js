import React from 'react';
import {
    Grid,
    Button,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';

const EmployeeTable = ({ employees, onEdit, onDelete }) => {
    const { classes } = useStyles();

    const getDynamicStyle = (span, totalColumns, gap) => ({
        width: `calc(${(span / totalColumns) * 100}% - ${gap}px)`,
        marginRight: gap + 'px'
    });

    return (
        <Grid container className={classes.inventoryContainer}>
            <Grid container className={classes.tableHead}>
                <Grid item style={getDynamicStyle(2, 12, 14, true)} className={classes.label}>
                    Employee Name
                </Grid>
                <Grid item style={getDynamicStyle(3, 12, 14, true)} className={classes.label}>
                    Email
                </Grid>
                <Grid item style={getDynamicStyle(2, 12, 14, true)} className={classes.label}>
                    Phone Number
                </Grid>
                <Grid item style={getDynamicStyle(2, 12, 14, true)} className={classes.label}>
                    Job Title
                </Grid>
                <Grid item style={getDynamicStyle(3, 12, 14, true)} className={`${classes.label} ${classes.noMarginRight}`}>
                    Actions
                </Grid>
            </Grid>
            {employees.map((employee, index) => (
                <Grid container className={classes.tableRow} key={employee.id || index}>
                    <Grid
                        item
                        style={getDynamicStyle(2, 12, 14)}
                        className={`${classes.tableCell} ${classes.nameClass}`}
                    >
                        {employee.name}
                    </Grid>
                    <Grid
                        item
                        style={getDynamicStyle(3, 12, 14)}
                        className={classes.tableCell}
                    >
                        {employee.email}
                    </Grid>
                    <Grid
                        item
                        style={getDynamicStyle(2, 12, 14)}
                        className={classes.tableCell}
                    >
                        {employee.phoneNumber}
                    </Grid>
                    <Grid
                        item
                        style={getDynamicStyle(2, 12, 14)}
                        className={classes.tableCell}
                    >
                        {employee.jobTitle}
                    </Grid>
                    <Grid
                        item
                        style={getDynamicStyle(3, 12, 14)}
                        className={`${classes.tableCell} ${classes.noMarginRight} ${classes.actionCell}`}
                    >
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => onEdit(employee)}
                            className={classes.actionButton}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => onDelete(employee?._id)}
                            className={classes.actionButton}
                        >
                            Delete
                        </Button>
                    </Grid>
                </Grid>
            ))}
        </Grid>
    );
};

const useStyles = makeStyles()(() => ({
    inventoryContainer: {
        padding: 5,
        background: "#F0F0F0",
        marginTop: 12
    },
    noMarginRight: {
        marginRight: 0
    },
    label: {
        height: 35,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 5,
        fontSize: 17,
        fontWeight: 700,
        flexDirection: "column",
        background: "#FFF",
        color: "#3A4BB6",
        marginRight: "0.7%"
    },
    tableHead: {
        boxShadow: "0px 3px 3px 0px rgba(0, 0, 0, 0.15)",
        color: "black",
        background: "#FFF"
    },
    tableCell: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 5,
        flexDirection: "column",
        background: "#FFF",
        height: 43,
        fontWeight: 500,
        fontSize: 17,
        marginRight: "0.7%"
    },
    tableRow: {
        marginTop: 4
    },
    nameClass: {
        alignItems: "flex-start",
        paddingLeft: 10
    },
    actionCell: {
        flexDirection: "row",
        gap: 8,
        justifyContent: "center"
    },
    actionButton: {
        height: 30,
        fontSize: 14,
        boxShadow: 'none',
        '&:hover': {
            boxShadow: 'none'
        }
    }
}));

export default EmployeeTable;