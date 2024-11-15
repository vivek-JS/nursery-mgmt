import React, { useState } from 'react';
import {
    Box,
    Button,
    Grid,
    IconButton
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { makeStyles } from 'tss-react/mui';
import InoculationModal from './inoculationModal';

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

const InoculationRoom = () => {
    const { classes } = useStyles();
    const [formData, setFormData] = useState({
        date: '',
        batchNumber: '',
        operatorName: '',
        in: '',
        out: '',
        cycleRatio: ''
    });

    const [rooms, setRooms] = useState([
        { id: 1, batchNumber: 'B001', operatorName: 'John Doe', in: 10, out: 8, cycleRatio: '1.25' },
        { id: 2, batchNumber: 'B002', operatorName: 'Jane Smith', in: 12, out: 10, cycleRatio: '1.20' },
        { id: 3, batchNumber: 'B003', operatorName: 'Alice Johnson', in: 15, out: 12, cycleRatio: '1.30' }
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editIndex, setEditIndex] = useState(null);

    const handleOpenModal = (index = null) => {
        if (index !== null) {
            setFormData(rooms[index]);
        } else {
            setFormData({
                date: '',
                batchNumber: '',
                operatorName: '',
                in: '',
                out: '',
                cycleRatio: ''
            });
        }
        setEditIndex(index);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleDelete = (index) => {
        const updatedRooms = rooms.filter((_, i) => i !== index);
        setRooms(updatedRooms);
    };

    const handleSubmit = () => {
        if (editIndex !== null) {
            const updatedRooms = [...rooms];
            updatedRooms[editIndex] = formData;
            setRooms(updatedRooms);
        } else {
            setRooms([...rooms, { ...formData, id: Date.now() }]);
        }
        setIsModalOpen(false);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Button variant="contained" onClick={() => handleOpenModal()} sx={{ mb: 2, fontSize: 'large' }}>
                Add New Inoculation Room
            </Button>

            <Grid container className={classes.inventoryContainer}>
                <Grid container className={classes.tableHead}>
                    <Grid item style={{ width: '14%' }} className={classes.label}>Batch Number</Grid>
                    <Grid item style={{ width: '24%' }} className={classes.label}>Operator Name</Grid>
                    <Grid item style={{ width: '14%' }} className={classes.label}>In</Grid>
                    <Grid item style={{ width: '14%' }} className={classes.label}>Out</Grid>
                    <Grid item style={{ width: '14%' }} className={classes.label}>Cycle Ratio</Grid>
                    <Grid item style={{ width: '14%' }} className={`${classes.label} ${classes.noMarginRight}`}>Actions</Grid>
                </Grid>
                {rooms.map((room, index) => (
                    <Grid container className={classes.tableRow} key={room.id}>
                        <Grid item style={{ width: '14%' }} className={classes.tableCell}>{room.batchNumber}</Grid>
                        <Grid item style={{ width: '24%' }} className={classes.tableCell}>{room.operatorName}</Grid>
                        <Grid item style={{ width: '14%' }} className={classes.tableCell}>{room.in}</Grid>
                        <Grid item style={{ width: '14%' }} className={classes.tableCell}>{room.out}</Grid>
                        <Grid item style={{ width: '14%' }} className={classes.tableCell}>{room.cycleRatio}</Grid>
                        <Grid item style={{ width: '14%' }} className={`${classes.tableCell} ${classes.noMarginRight} ${classes.actionCell}`}>
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

            <InoculationModal
                open={isModalOpen}
                handleClose={handleCloseModal}
                formData={formData}
                onInputChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                onSubmit={handleSubmit}
            />
        </Box>
    );
};

export default InoculationRoom;
