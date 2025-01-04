import React, { useState } from "react"
import { Tabs, Tab, Box } from "@mui/material"
import VehicleTable from "./VehicleTable"
import ShadeTable from "./ShadeTable"
import TrayTable from "./Traytable"
import BatchTable from "./BatchTable"
import PollyHouseTable from "./PollyHouseTable"
// import DriverTable from "./tables/DriverTable"
const DispatchManagement = () => {
  const [activeTab, setActiveTab] = useState(0)

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Dispatch Management</h1>
      </div>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Vehicles" />
          <Tab label="Shades" />
          <Tab label="Tray" />
          <Tab label="Batch" />
          <Tab label="Pollyhouse" />
        </Tabs>
      </Box>

      <div className="mt-6">
        {activeTab === 0 && <VehicleTable />}
        {activeTab === 1 && <ShadeTable />}
        {activeTab === 2 && <TrayTable />}
        {activeTab === 3 && <BatchTable />}
        {activeTab === 4 && <PollyHouseTable />}
      </div>
    </div>
  )
}

export default DispatchManagement
