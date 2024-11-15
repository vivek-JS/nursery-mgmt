import React, { useState } from 'react';
import {
    Box,
    Button,
    Grid,
    IconButton
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { makeStyles } from 'tss-react/mui';
import WashingModal from './washingModal';

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

const Washing = () => {
    const { classes } = useStyles();
    const [formData, setFormData] = useState({
        numberOfBottles: '',
        numberOfEmployeeEngaged: '',
        listOfEmployeeEngaged: '',
        in: '',
        out: ''
    });

    const [washRooms, setWashRooms] = useState([
        { id: 1, numberOfBottles: 20, numberOfEmployeeEngaged: 5, listOfEmployeeEngaged: 'Alice, Bob', in: 12, out: 10 },
        { id: 2, numberOfBottles: 15, numberOfEmployeeEngaged: 3, listOfEmployeeEngaged: 'Charlie', in: 10, out: 8 }
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editIndex, setEditIndex] = useState(null);

    const handleOpenModal = (index = null) => {
        if (index !== null) {
            setFormData(washRooms[index]);
        } else {
            setFormData({
                numberOfBottles: '',
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
        const updatedRooms = washRooms.filter((_, i) => i !== index);
        setWashRooms(updatedRooms);
    };

    const handleSubmit = () => {
        if (editIndex !== null) {
            const updatedRooms = [...washRooms];
            updatedRooms[editIndex] = { ...formData, id: updatedRooms[editIndex].id };
            setWashRooms(updatedRooms);
        } else {
            setWashRooms([...washRooms, { ...formData, id: Date.now() }]);
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
                Add New Washing
            </Button>
            <Grid container className={classes.inventoryContainer}>
                <Grid container className={classes.tableHead}>
                    <Grid item xs={2} className={classes.label}>Number of Bottles</Grid>
                    <Grid item xs={2} className={classes.label}>Employees Engaged</Grid>
                    <Grid item xs={3} className={classes.label}>List of Employees</Grid>
                    <Grid item xs={1} className={classes.label}>In</Grid>
                    <Grid item xs={1} className={classes.label}>Out</Grid>
                    <Grid item xs={2} className={`${classes.label} ${classes.noMarginRight}`}>Actions</Grid>
                </Grid>
                {washRooms.map((room, index) => (
                    <Grid container className={classes.tableRow} key={room.id}>
                        <Grid item xs={2} className={classes.tableCell}>{room.numberOfBottles}</Grid>
                        <Grid item xs={2} className={classes.tableCell}>{room.numberOfEmployeeEngaged}</Grid>
                        <Grid item xs={3} className={classes.tableCell}>{room.listOfEmployeeEngaged}</Grid>
                        <Grid item xs={1} className={classes.tableCell}>{room.in}</Grid>
                        <Grid item xs={1} className={classes.tableCell}>{room.out}</Grid>
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

            <WashingModal
                open={isModalOpen}
                handleClose={handleCloseModal}
                formData={formData}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
            />
        </Box>
    );
};

export default Washing;
