import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    TextField,
    Chip
} from '@mui/material';
import { styled } from '@mui/system';

const StyledCard = styled(Card)(({ theme }) => ({
    marginBottom: theme.spacing(3),
}));

const PrimaryHardening = () => {

    const [inputText, setInputText] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);

    const handleInputChange = (e) => {
        setInputText(e.target.value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputText && !selectedItems.includes(inputText)) {
                setSelectedItems([...selectedItems, inputText]);
            }
            setInputText('');
        }
    };

    const handleRemoveItem = (itemToRemove) => {
        setSelectedItems(selectedItems.filter(item => item !== itemToRemove));
    };

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
                    <TextField
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        label="Type and press Enter"
                        fullWidth
                        sx={{ width: 320 }}
                    />

                    <Box sx={{
                        mt: 2,
                        display: 'flex',
                        flexWrap: 'wrap',
                        width: 300,
                        height: 200,
                        overflowY: 'auto',
                        border: '1px solid #ccc',
                        borderRadius: 2,
                        padding: 1,
                    }}>
                        {selectedItems.map((item, index) => (
                            <Chip
                                key={index}
                                label={item}
                                onDelete={() => handleRemoveItem(item)}
                                sx={{ mr: 1, mb: 1 }}
                            />
                        ))}
                    </Box>
                </CardContent>
            </StyledCard>
        </Box>
    );
};

export default PrimaryHardening;
