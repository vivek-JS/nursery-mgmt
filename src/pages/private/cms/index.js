import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import PrimaryHardening from './primaryHardening';

export default function TabbedStructure() {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>

      <Tabs value={selectedTab} onChange={handleTabChange} aria-label="basic tabs example">
        <Tab label="Primary Hardening" />
        <Tab label="Secondary Hardening" />
      </Tabs>


      <Box sx={{ p: 3 }}>
        {selectedTab === 0 && <PrimaryHardening />}
        {selectedTab === 1 && <PrimaryHardening />}
      </Box>
    </Box>
  );
}

