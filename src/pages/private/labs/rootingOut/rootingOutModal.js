import React from 'react';
import { Modal, Box, TextField, Button, Typography, Stack } from '@mui/material';

const RootingOutModal = ({ open, handleClose, formData, onInputChange, onSubmit }) => {
    return (
        <Modal open={open} onClose={handleClose}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2
                }}
            >
                <Typography variant="h6" sx={{ mb: 2 }}>
                    {formData.id ? 'Edit Rooting Out Entry' : 'Add New Rooting Out Entry'}
                </Typography>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}>
                    <Stack spacing={2}>
                        <TextField
                            label="Number of Trays"
                            name="numberOfTrays"
                            value={formData.numberOfTrays}
                            type="number"
                            onChange={onInputChange}
                            fullWidth
                        />
                        <TextField
                            label="Number of Bottles"
                            name="numberOfBottles"
                            value={formData.numberOfBottles}
                            type="number"
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
                            type="submit"
                            variant="contained"
                            fullWidth
                            sx={{ mt: 2 }}
                        >
                            {formData.id ? 'Update' : 'Add Rooting Out Entry'}
                        </Button>
                    </Stack>
                </form>
            </Box>
        </Modal>
    );
};

export default RootingOutModal;
