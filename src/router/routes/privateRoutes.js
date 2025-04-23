// Export all the private routes
import React from "react"

const Dashboard = React.lazy(() => import("pages/private/dashboard"))
const Settings = React.lazy(() => import("pages/private/settings"))
const SubAdmins = React.lazy(() => import("pages/private/sub-admins"))
const Weekly = React.lazy(() => import("pages/private/weekly"))
const Inventory = React.lazy(() => import("pages/private/inventory"))
const Transactions = React.lazy(() => import("pages/private/transaction"))
const Patients = React.lazy(() => import("pages/private/employee"))
const Admin = React.lazy(() => import("pages/private/admin"))
const Cms = React.lazy(() => import("pages/private/cms"))
const Labs = React.lazy(() => import("pages/private/labs"))
const Order = React.lazy(() => import("pages/private/order"))
const Plants = React.lazy(() => import("pages/private/Plants/slots"))
const Slots = React.lazy(() => import("pages/private/SlotsView/index"))
const Hardening = React.lazy(() => import("pages/private/hardening/Index"))
const Stats = React.lazy(() => import("pages/private/slotsStats"))
const DataBackupRestore = React.lazy(() => import("pages/private/backup"))
const FarmerComponent = React.lazy(() => import("pages/private/farmer/Farmer"))

export const PrivateRoutes = [
  { path: "/u/dashboard", exact: true, component: Dashboard },
  { path: "/u/weekly", exact: true, component: Weekly },
  { path: "/u/transactions", exact: true, component: Transactions },
  { path: "/u/employeese", exact: true, component: Patients },

  { path: "/u/sub-admins", exact: true, component: SubAdmins },
  { path: "/u/inventory", exact: true, component: Inventory },

  {
    path: "/u/settings",
    exact: false,
    component: Settings
  },

  { path: "/u/admin", exact: true, component: Admin },
  { path: "/u/cms", exact: true, component: Cms },
  { path: "/u/labs", exact: true, component: Labs },
  { path: "/u/orders", exact: true, component: Order },
  { path: "/u/plants", exact: true, component: Plants },
  { path: "/u/slots", exact: true, component: Slots },
  { path: "/u/hardening", exact: true, component: Hardening },
  { path: "/u/stats", exact: true, component: Stats },
  { path: "/u/data", exact: true, component: DataBackupRestore },
  { path: "/u/farmers", exact: true, component: FarmerComponent }
]
