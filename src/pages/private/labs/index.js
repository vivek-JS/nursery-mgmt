import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import InoculationRoom from './inoculationRoom';
import Media from './media'
import Washing from './washing';
import Plate from './plates';
import GrowthRoom from './growthRoom';
import RootingOut from './rootingOut';

export default function TabbedStructure() {
    const [selectedTab, setSelectedTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setSelectedTab(newValue);
    };

    return (
        <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>

            <Tabs value={selectedTab} onChange={handleTabChange} aria-label="basic tabs example">
                <Tab label="Inoculation Room" />
                <Tab label="Media" />
                <Tab label='Washing' />
                <Tab label='Plates' />
                <Tab label='Growth Room' />
                <Tab label='Rooting Out' />
            </Tabs>


            <Box sx={{ p: 3 }}>
                {selectedTab === 0 && <InoculationRoom />}
                {selectedTab === 1 && <Media />}
                {selectedTab === 2 && <Washing />}
                {selectedTab === 3 && <Plate />}
                {selectedTab === 4 && <GrowthRoom />}
                {selectedTab === 5 && <RootingOut />}
            </Box>
        </Box>
    );
}

