import React, { useState } from 'react';
import {
    Box,
    Button,
    Grid,
    IconButton,
    TextField,
    Typography,
    Stack,
    Modal
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { makeStyles } from 'tss-react/mui';

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

const Media = () => {
    const { classes } = useStyles();

    const [formData, setFormData] = useState({
        numberOfBottles: '',
        numberOfLitersCreated: '',
        numberOfEmployeeEngaged: '',
        listOfEmployeeEngaged: '',
        in: '',
        out: ''
    });

    const [mediaRecords, setMediaRecords] = useState([
        {
            id: 1,
            numberOfBottles: '50',
            numberOfLitersCreated: '100',
            numberOfEmployeeEngaged: '5',
            listOfEmployeeEngaged: 'Alice, Bob',
            in: '10',
            out: '8'
        },
        {
            id: 2,
            numberOfBottles: '30',
            numberOfLitersCreated: '60',
            numberOfEmployeeEngaged: '3',
            listOfEmployeeEngaged: 'Charlie, David',
            in: '12',
            out: '10'
        }
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editIndex, setEditIndex] = useState(null);

    const handleOpenModal = (index = null) => {
        if (index !== null) {
            setFormData(mediaRecords[index]);
        } else {
            setFormData({
                numberOfBottles: '',
                numberOfLitersCreated: '',
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
        const updatedRecords = mediaRecords.filter((_, i) => i !== index);
        setMediaRecords(updatedRecords);
    };

    const handleSubmit = () => {
        if (editIndex !== null) {
            const updatedRecords = [...mediaRecords];
            updatedRecords[editIndex] = formData;
            setMediaRecords(updatedRecords);
        } else {
            setMediaRecords([...mediaRecords, { ...formData, id: Date.now() }]);
        }
        setIsModalOpen(false);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Button variant="contained" onClick={() => handleOpenModal()} sx={{ mb: 2, fontSize: 'large' }}>
                Add New Media Record
            </Button>

            <Grid container className={classes.inventoryContainer}>
                <Grid container className={classes.tableHead}>
                    <Grid item style={{ width: '15%' }} className={classes.label}>Bottles</Grid>
                    <Grid item style={{ width: '20%' }} className={classes.label}>Liters Created</Grid>
                    <Grid item style={{ width: '15%' }} className={classes.label}>Employees Engaged</Grid>
                    <Grid item style={{ width: '25%' }} className={classes.label}>List of Employees</Grid>
                    <Grid item style={{ width: '10%' }} className={classes.label}>In</Grid>
                    <Grid item style={{ width: '10%' }} className={`${classes.label} ${classes.noMarginRight}`}>Actions</Grid>
                </Grid>
                {mediaRecords.map((record, index) => (
                    <Grid container className={classes.tableRow} key={record.id}>
                        <Grid item style={{ width: '15%' }} className={classes.tableCell}>{record.numberOfBottles}</Grid>
                        <Grid item style={{ width: '20%' }} className={classes.tableCell}>{record.numberOfLitersCreated}</Grid>
                        <Grid item style={{ width: '15%' }} className={classes.tableCell}>{record.numberOfEmployeeEngaged}</Grid>
                        <Grid item style={{ width: '25%' }} className={classes.tableCell}>{record.listOfEmployeeEngaged}</Grid>
                        <Grid item style={{ width: '10%' }} className={classes.tableCell}>{record.in}</Grid>
                        <Grid item style={{ width: '10%' }} className={`${classes.tableCell} ${classes.noMarginRight} ${classes.actionCell}`}>
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

            <Modal open={isModalOpen} onClose={handleCloseModal}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2
                }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {editIndex !== null ? 'Edit Media Record' : 'Add Media Record'}
                    </Typography>
                    <Stack spacing={2}>
                        <TextField label="Number of Bottles" name="numberOfBottles" value={formData.numberOfBottles} onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })} fullWidth />
                        <TextField label="Number of Liters Created" name="numberOfLitersCreated" value={formData.numberOfLitersCreated} onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })} fullWidth />
                        <TextField label="Number of Employees Engaged" name="numberOfEmployeeEngaged" value={formData.numberOfEmployeeEngaged} onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })} fullWidth />
                        <TextField label="List of Employees Engaged" name="listOfEmployeeEngaged" value={formData.listOfEmployeeEngaged} onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })} fullWidth />
                        <TextField label="In" name="in" value={formData.in} onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })} fullWidth />
                        <TextField label="Out" name="out" value={formData.out} onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })} fullWidth />
                        <Button variant="contained" onClick={() => { handleSubmit(); handleCloseModal(); }} fullWidth>
                            {editIndex !== null ? 'Update' : 'Add'}
                        </Button>
                    </Stack>
                </Box>
            </Modal>
        </Box>
    );
};

export default Media;
