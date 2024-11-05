
import React, { useState } from 'react';
import { Box, TextField, Chip } from '@mui/material';

const ChipInput = ({ label = "Type and press Enter", placeholder = "Add item", width = 320, onItemsChange }) => {
    const [inputText, setInputText] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);

    const handleInputChange = (e) => {
        setInputText(e.target.value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputText && !selectedItems.includes(inputText)) {
                const updatedItems = [...selectedItems, inputText];
                setSelectedItems(updatedItems);
                if (onItemsChange) onItemsChange(updatedItems);  // Notify parent
            }
            setInputText('');
        }
    };

    const handleRemoveItem = (itemToRemove) => {
        const updatedItems = selectedItems.filter(item => item !== itemToRemove);
        setSelectedItems(updatedItems);
        if (onItemsChange) onItemsChange(updatedItems);  // Notify parent
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <TextField
                value={inputText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                label={label}
                placeholder={placeholder}
                fullWidth
                sx={{ width }}
            />
            <Box sx={{
                mt: 2,
                display: 'flex',
                flexWrap: 'wrap',
                width,
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
        </Box>
    );
};

export default ChipInput;
