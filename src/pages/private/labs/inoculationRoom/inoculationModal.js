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

const InoculationModal = ({ open, handleClose, formData, onInputChange, onSubmit }) => (
    <Modal open={open} onClose={handleClose} aria-labelledby="modal-modal-title">
        <Box sx={modalStyle}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                {formData.batchNumber ? 'Edit Inoculation Room' : 'Add Inoculation Room'}
            </Typography>
            <Stack spacing={2}>
                <TextField
                    label="Batch Number"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={onInputChange}
                    fullWidth
                />
                <TextField
                    label="Operator Name"
                    name="operatorName"
                    value={formData.operatorName}
                    onChange={onInputChange}
                    fullWidth
                />
                <TextField
                    label="In"
                    name="in"
                    type="number"
                    value={formData.in}
                    onChange={onInputChange}
                    fullWidth
                />
                <TextField
                    label="Out"
                    name="out"
                    type="number"
                    value={formData.out}
                    onChange={onInputChange}
                    fullWidth
                />
                <TextField
                    label="Cycle Ratio"
                    name="cycleRatio"
                    value={formData.cycleRatio}
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
                    {formData.batchNumber ? 'Update' : 'Add'}
                </Button>
            </Stack>
        </Box>
    </Modal>
);

export default InoculationModal;
