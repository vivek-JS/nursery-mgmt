import React, { useState } from 'react';
import { TextField, Button, Stack, Box, Typography } from '@mui/material';

const InoculationRoom = () => {
    const [formData, setFormData] = useState({
        date: '',
        batchNumber: '',
        operatorName: '',
        in: '',
        out: '',
        cycleRatio: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Submitted data:', formData);
    };

    return (
        <Box sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Inoculation Room
            </Typography>
            <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                    <TextField
                        label="Batch Number"
                        name="batchNumber"
                        value={formData.batchNumber}
                        onChange={handleInputChange}
                        sx={{ width: '300px' }}
                    />
                    <TextField
                        label="Operator Name"
                        name="operatorName"
                        value={formData.operatorName}
                        onChange={handleInputChange}
                        sx={{ width: '300px' }}
                    />
                    <TextField
                        label="In"
                        name="in"
                        value={formData.in}
                        type='number'
                        onChange={handleInputChange}
                        sx={{ width: '300px' }}
                    />
                    <TextField
                        label="Out"
                        name="out"
                        value={formData.out}
                        type='number'
                        onChange={handleInputChange}
                        sx={{ width: '300px' }}
                    />
                    <TextField
                        label="Cycle Ratio"
                        name="cycleRatio"
                        value={formData.cycleRatio}
                        onChange={handleInputChange}
                        sx={{ width: '300px' }}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        sx={{ width: '100px', mt: 2 }}
                    >
                        Submit
                    </Button>
                </Stack>
            </form>
        </Box>
    );
};

export default InoculationRoom;
