// Export all the private routes
import React from "react"

// Temporarily use regular imports for debugging
import Dashboard from "pages/private/dashboard/TestDashboard"
import Settings from "pages/private/settings"
import SubAdmins from "pages/private/sub-admins"
import Weekly from "pages/private/weekly"
import Inventory from "pages/private/inventory"
import Transactions from "pages/private/transaction"
import Patients from "pages/private/employee"
import Admin from "pages/private/admin"
import Cms from "pages/private/cms"
import Labs from "pages/private/labs"
import Order from "pages/private/order"
import Plants from "pages/private/Plants/slots"
import Slots from "pages/private/SlotsView/index"
import Hardening from "pages/private/hardening/Index"
import Stats from "pages/private/slotsStats"
import DataBackupRestore from "pages/private/backup"
import FarmerComponent from "pages/private/farmer/Farmer"
import OrdersUpload from "pages/private/ordersUpload/OrdersUpload"
import Dealers from "pages/private/dealers/Dealer"
import DealersDetails from "pages/private/dealers/DelaerDetails"
import CapacityInsights from "pages/private/capacityinsights/CapacityInsights"

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
  { path: "/u/farmers", exact: true, component: FarmerComponent },
  { path: "/u/upload-orders", exact: true, component: OrdersUpload },
  { path: "/u/dealers", exact: true, component: Dealers },
  { path: "/u/dealers/:id", exact: true, component: DealersDetails },
  { path: "/u/capacity-insights", exact: true, component: CapacityInsights }
]
