import React, { useState } from 'react';
import { TextField, Button, Stack, Box, Typography } from '@mui/material';

const RootingOut = () => {
    const [formData, setFormData] = useState({
        numberOfTrays: '',
        numberOfBottles: '',
        in: '',
        out: ''
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
                Rooting Out
            </Typography>
            <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                    <TextField
                        label="Number of Trays"
                        name="numberOfTrays"
                        value={formData.numberOfTrays}
                        type="number"
                        onChange={handleInputChange}
                        sx={{ width: '300px' }}
                    />
                    <TextField
                        label="Number of Bottles"
                        name="numberOfBottles"
                        value={formData.numberOfBottles}
                        type="number"
                        onChange={handleInputChange}
                        sx={{ width: '300px' }}
                    />
                    <TextField
                        label="In"
                        name="in"
                        value={formData.in}
                        type="number"
                        onChange={handleInputChange}
                        sx={{ width: '300px' }}
                    />
                    <TextField
                        label="Out"
                        name="out"
                        value={formData.out}
                        type="number"
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

export default RootingOut;
