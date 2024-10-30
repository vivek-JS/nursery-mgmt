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

]
