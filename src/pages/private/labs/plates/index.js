import React, { useState } from 'react';
import {
    Box,
    Button,
    Grid,
    IconButton
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { makeStyles } from 'tss-react/mui';
import PlateModal from './plateModal';

const useStyles = makeStyles()(() => ({
    inventoryContainer: {
        padding: 5,
        background: "#F0F0F0",
        marginTop: 12,
        width: '100%'
    },
    noMarginRight: {
        marginRight: 0
    },
    label: {
        height: 35,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 17,
        fontWeight: 700,
        background: "#FFF",
        color: "#3A4BB6",
        marginRight: "0.7%"
    },
    tableHead: {
        boxShadow: "0px 3px 3px 0px rgba(0, 0, 0, 0.15)",
        background: "#FFF"
    },
    tableCell: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFF",
        height: 43,
        fontWeight: 500,
        fontSize: 17,
        marginRight: "0.7%"
    },
    tableRow: {
        marginTop: 4
    },
    actionCell: {
        display: 'flex',
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

const Plate = () => {
    const { classes } = useStyles();
    const [formData, setFormData] = useState({
        numberOfPlates: '',
        numberOfEmployeeEngaged: '',
        listOfEmployeeEngaged: '',
        in: '',
        out: ''
    });

    const [plateEntries, setPlateEntries] = useState([
        { id: 1, numberOfPlates: 10, numberOfEmployeeEngaged: 2, listOfEmployeeEngaged: 'John, Doe', in: 8, out: 6 },
        { id: 2, numberOfPlates: 12, numberOfEmployeeEngaged: 3, listOfEmployeeEngaged: 'Jane', in: 9, out: 7 }
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editIndex, setEditIndex] = useState(null);

    const handleOpenModal = (index = null) => {
        if (index !== null) {
            setFormData(plateEntries[index]);
        } else {
            setFormData({
                numberOfPlates: '',
                numberOfEmployeeEngaged: '',
                listOfEmployeeEngaged: '',
                in: '',
                out: ''
            });
        }
        setEditIndex(index);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleDelete = (index) => {
        const updatedEntries = plateEntries.filter((_, i) => i !== index);
        setPlateEntries(updatedEntries);
    };

    const handleSubmit = () => {
        if (editIndex !== null) {
            const updatedEntries = [...plateEntries];
            updatedEntries[editIndex] = { ...formData, id: updatedEntries[editIndex].id };
            setPlateEntries(updatedEntries);
        } else {
            setPlateEntries([...plateEntries, { ...formData, id: Date.now() }]);
        }
        setIsModalOpen(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <Box sx={{ p: 3 }}>
            <Button variant="contained" onClick={() => handleOpenModal()} sx={{ mb: 2, fontSize: 'large' }}>
                Add New Plate Entry
            </Button>
            <Grid container className={classes.inventoryContainer}>
                <Grid container className={classes.tableHead}>
                    <Grid item xs={2} className={classes.label}>Number of Plates</Grid>
                    <Grid item xs={2} className={classes.label}>Employees Engaged</Grid>
                    <Grid item xs={3} className={classes.label}>List of Employees</Grid>
                    <Grid item xs={1} className={classes.label}>In</Grid>
                    <Grid item xs={1} className={classes.label}>Out</Grid>
                    <Grid item xs={2} className={`${classes.label} ${classes.noMarginRight}`}>Actions</Grid>
                </Grid>
                {plateEntries.map((entry, index) => (
                    <Grid container className={classes.tableRow} key={entry.id}>
                        <Grid item xs={2} className={classes.tableCell}>{entry.numberOfPlates}</Grid>
                        <Grid item xs={2} className={classes.tableCell}>{entry.numberOfEmployeeEngaged}</Grid>
                        <Grid item xs={3} className={classes.tableCell}>{entry.listOfEmployeeEngaged}</Grid>
                        <Grid item xs={1} className={classes.tableCell}>{entry.in}</Grid>
                        <Grid item xs={1} className={classes.tableCell}>{entry.out}</Grid>
                        <Grid item xs={2} className={`${classes.tableCell} ${classes.noMarginRight} ${classes.actionCell}`}>
                            <IconButton color="primary" onClick={() => handleOpenModal(index)} className={classes.actionButton}>
                                <Edit />
                            </IconButton>
                            <IconButton color="error" onClick={() => handleDelete(index)} className={classes.actionButton}>
                                <Delete />
                            </IconButton>
                        </Grid>
                    </Grid>
                ))}
            </Grid>

            <PlateModal
                open={isModalOpen}
                handleClose={handleCloseModal}
                formData={formData}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
            />
        </Box>
    );
};

export default Plate;
