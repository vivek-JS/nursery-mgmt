import React, { useState } from "react"
import { Link } from "react-router-dom"
import { Tabs, Tab, Box } from "@mui/material"
import VehicleOwnerTable from "./VehicleOwnerTable"
import TripsListPanel from "./TripsListPanel"
import ShadeTable from "./ShadeTable"
import TrayTable from "./Traytable"
import BatchTable from "./BatchTable"
import PollyHouseTable from "./PollyHouseTable"
import SlotConfigurationTable from "./SlotConfigurationTable"
import NurserySiteTable from "./NurserySiteTable"
import InvoiceSequencePanel from "./InvoiceSequencePanel"
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
          <Tab label="Fleet" />
          <Tab label="Shades" />
          <Tab label="Tray" />
          <Tab label="Batch" />
          <Tab label="Pollyhouse" />
          <Tab label="Slot Configuration" />
          <Tab label="Nursery sites" />
          <Tab label="Challan invoices" />
        </Tabs>
      </Box>

      <div className="mt-6 space-y-6">
        {activeTab === 0 && (
          <>
            <p className="text-sm text-slate-600 mb-4">
              Full fleet module with dispatches, trips (km/rent), and order links:{" "}
              <Link to="/u/fleet" className="text-indigo-600 font-medium hover:underline">
                Open Fleet →
              </Link>
            </p>
            <VehicleOwnerTable />
            <TripsListPanel />
          </>
        )}
        {activeTab === 1 && <ShadeTable />}
        {activeTab === 2 && <TrayTable />}
        {activeTab === 3 && <BatchTable />}
        {activeTab === 4 && <PollyHouseTable />}
        {activeTab === 5 && <SlotConfigurationTable />}
        {activeTab === 6 && <NurserySiteTable />}
        {activeTab === 7 && <InvoiceSequencePanel />}
      </div>
    </div>
  )
}

export default DispatchManagement
