// Export all the private routes
import React from "react"

const Dashboard = React.lazy(() => import("pages/private/dashboard"))
// const Settings = React.lazy(() => import("pages/private/settings"))
const SubAdmins = React.lazy(() => import("pages/private/sub-admins"))
const Weekly = React.lazy(() => import("pages/private/weekly"))
const Inventory = React.lazy(() => import("pages/private/inventory"))
const Transactions = React.lazy(() => import("pages/private/transaction"))
const Patients = React.lazy(() => import("pages/private/patients"))
const PatientDetails = React.lazy(() => import("pages/private/patients/PatientDetails"))
const Admin = React.lazy(() => import("pages/private/admin"))


export const PrivateRoutes = [
  { path: "/u/dashboard", exact: true, component: Dashboard },
  { path: "/u/weekly", exact: true, component: Weekly },
  { path: "/u/transactions", exact: true, component: Transactions },
  { path: "/u/patients", exact: true, component: Patients },
  { path: "/u/patients/patientDetails", exact: true, component: PatientDetails },

  { path: "/u/sub-admins", exact: true, component: SubAdmins },
  { path: "/u/inventory", exact: true, component: Inventory },

  // {
  //   path: "/u/settings",
  //   exact: false,
  //   component: Settings
  // },

  { path: "/u/admin", exact: true, component: Admin }
]