// WashingModal.js
import React from 'react';
import { Modal, Box, Stack, TextField, Button, Typography } from '@mui/material';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
};

const WashingModal = ({ open, handleClose, formData, onInputChange, onSubmit }) => (
    <Modal open={open} onClose={handleClose} aria-labelledby="modal-modal-title">
        <Box sx={modalStyle}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                {formData.numberOfBottles ? 'Edit Wash Entry' : 'Add Wash Entry'}
            </Typography>
            <Stack spacing={2}>
                <TextField
                    label="Number of Bottles"
                    name="numberOfBottles"
                    value={formData.numberOfBottles}
                    type="number"
                    onChange={onInputChange}
                    fullWidth
                />
                <TextField
                    label="Number of Employees Engaged"
                    name="numberOfEmployeeEngaged"
                    value={formData.numberOfEmployeeEngaged}
                    type="number"
                    onChange={onInputChange}
                    fullWidth
                />
                <TextField
                    label="List of Employees Engaged"
                    name="listOfEmployeeEngaged"
                    value={formData.listOfEmployeeEngaged}
                    onChange={onInputChange}
                    fullWidth
                />
                <TextField
                    label="In"
                    name="in"
                    value={formData.in}
                    type="number"
                    onChange={onInputChange}
                    fullWidth
                />
                <TextField
                    label="Out"
                    name="out"
                    value={formData.out}
                    type="number"
                    onChange={onInputChange}
                    fullWidth
                />
                <Button
                    variant="contained"
                    onClick={() => {
                        onSubmit();
                        handleClose();
                    }}
                    fullWidth
                >
                    {formData.numberOfBottles ? 'Update' : 'Add'}
                </Button>
            </Stack>
        </Box>
    </Modal>
);

export default WashingModal;
