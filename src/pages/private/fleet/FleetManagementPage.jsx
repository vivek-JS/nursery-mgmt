import React, { useState } from "react"
import { Tabs, Tab, Box } from "@mui/material"
import LocalShippingIcon from "@mui/icons-material/LocalShipping"
import FleetLedgerTable from "./FleetLedgerTable"
import FleetPlannedRoutesPanel from "./FleetPlannedRoutesPanel"
import VehicleOwnerTable from "../cms/VehicleOwnerTable"

export default function FleetManagementPage() {
  const [tab, setTab] = useState(0)

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <header className="mb-6 flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <LocalShippingIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900">Fleet</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Vehicle owners, drivers, dispatches, and trip settlement (km, rent, charges). Assign fleet when dispatching
            from Orders or the dispatch map — details appear here with linked orders and customer freight.
          </p>
        </div>
      </header>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Dispatches & trips" />
          <Tab label="Planned routes" />
          <Tab label="Owners, drivers & vehicles" />
        </Tabs>
      </Box>

      {tab === 0 && <FleetLedgerTable />}
      {tab === 1 && <FleetPlannedRoutesPanel />}
      {tab === 2 && <VehicleOwnerTable />}
    </div>
  )
}
