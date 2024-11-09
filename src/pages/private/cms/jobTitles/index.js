// PrimaryHardening.js
import React, { useState } from 'react';
import { Box, Card, CardContent, CardHeader, Button } from '@mui/material';
import { styled } from '@mui/system';
import ChipInput from '../../../../components/FormField/ChipInput';

const StyledCard = styled(Card)(({ theme }) => ({
    marginBottom: theme.spacing(3),
}));

const JobTitles = () => {
    const [jobs, setJobs] = useState([]);

    const handleItemsChange = (updatedJobs) => {
        setJobs(updatedJobs);  // Update local state with latest items
        console.log("Current items:", jobs);  // Optionally, log the data or handle it further
        console.log('upd', updatedJobs)
    };

    const handleSubmit = () => {
        console.log('submitting', jobs)
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'start',
            height: '100vh',
            maxWidth: '66%',
        }}>
            <StyledCard>
                <CardHeader title="Enter Data" />
                <CardContent>
                    <ChipInput label="Enter Data" placeholder="Add new item" width={320} onItemsChange={handleItemsChange} />
                </CardContent>
            </StyledCard>

            <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                sx={{ mt: 2 }}
            >
                Submit
            </Button>
        </Box>

    );
};

export default JobTitles;
