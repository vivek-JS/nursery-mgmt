// Export all the private routes
import React from "react"

const Dashboard = React.lazy(() => import("pages/private/dashboard"))
const Settings = React.lazy(() => import("pages/private/settings"))
const SubAdmins = React.lazy(() => import("pages/private/sub-admins"))
const Weekly = React.lazy(() => import("pages/private/weekly"))

// Inventory Management System
const InventoryDashboard = React.lazy(() => import("pages/private/inventory/InventoryDashboard"))
const ProductList = React.lazy(() => import("pages/private/inventory/ProductList"))
const ProductForm = React.lazy(() => import("pages/private/inventory/ProductForm"))
const ProductDetails = React.lazy(() => import("pages/private/inventory/ProductDetails"))
const GRNList = React.lazy(() => import("pages/private/inventory/GRNList"))
const GRNForm = React.lazy(() => import("pages/private/inventory/GRNForm"))
const GRNDetails = React.lazy(() => import("pages/private/inventory/GRNDetails"))
const PurchaseOrderList = React.lazy(() => import("pages/private/inventory/PurchaseOrderList"))
const PurchaseOrderForm = React.lazy(() => import("pages/private/inventory/PurchaseOrderForm"))
const PurchaseOrderDetails = React.lazy(() => import("pages/private/inventory/PurchaseOrderDetails"))
const OutwardList = React.lazy(() => import("pages/private/inventory/OutwardList"))
const OutwardForm = React.lazy(() => import("pages/private/inventory/OutwardForm"))
const OutwardDetails = React.lazy(() => import("pages/private/inventory/OutwardDetails"))
const SupplierList = React.lazy(() => import("pages/private/inventory/SupplierList"))
const SupplierForm = React.lazy(() => import("pages/private/inventory/SupplierForm"))
const TransactionList = React.lazy(() => import("pages/private/inventory/TransactionList"))

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
const OrdersUpload = React.lazy(() => import("pages/private/ordersUpload/OrdersUpload"))
const Dealers = React.lazy(() => import("pages/private/dealers/Dealer"))
const DealersDetails = React.lazy(() => import("pages/private/dealers/DelaerDetails"))
const CapacityInsights = React.lazy(() => import("pages/private/capacityinsights/CapacityInsights"))
const Payments = React.lazy(() => import("pages/private/payments"))
const WhatsAppManagement = React.lazy(() => import("pages/private/whatsapp/WhatsAppManagement"))
const SowingManagement = React.lazy(() => import("pages/private/Sowing/SowingManagement"))

export const PrivateRoutes = [
  { path: "/u/dashboard", exact: true, component: Dashboard },
  { path: "/u/weekly", exact: true, component: Weekly },
  { path: "/u/transactions", exact: true, component: Transactions },
  { path: "/u/employeese", exact: true, component: Patients },

  { path: "/u/sub-admins", exact: true, component: SubAdmins },
  
  // Inventory Management Routes
  { path: "/u/inventory", exact: true, component: InventoryDashboard },
  { path: "/u/inventory/products", exact: true, component: ProductList },
  { path: "/u/inventory/products/new", exact: true, component: ProductForm },
  { path: "/u/inventory/products/:id/edit", exact: true, component: ProductForm },
  { path: "/u/inventory/products/:id", exact: true, component: ProductDetails },
  { path: "/u/inventory/grn", exact: true, component: GRNList },
  { path: "/u/inventory/grn/new", exact: true, component: GRNForm },
  { path: "/u/inventory/grn/:id", exact: true, component: GRNDetails },
  { path: "/u/inventory/purchase-orders", exact: true, component: PurchaseOrderList },
  { path: "/u/inventory/purchase-orders/new", exact: true, component: PurchaseOrderForm },
  { path: "/u/inventory/purchase-orders/:id", exact: true, component: PurchaseOrderDetails },
  { path: "/u/inventory/outward", exact: true, component: OutwardList },
  { path: "/u/inventory/outward/new", exact: true, component: OutwardForm },
  { path: "/u/inventory/outward/:id", exact: true, component: OutwardDetails },
  { path: "/u/inventory/suppliers", exact: true, component: SupplierList },
  { path: "/u/inventory/suppliers/new", exact: true, component: SupplierForm },
  { path: "/u/inventory/suppliers/:id/edit", exact: true, component: SupplierForm },
  { path: "/u/inventory/transactions", exact: true, component: TransactionList },

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
  { path: "/u/capacity-insights", exact: true, component: CapacityInsights },
  { path: "/u/payments", exact: true, component: Payments },
  { path: "/u/whatsapp", exact: true, component: WhatsAppManagement },
  { path: "/u/sowing", exact: true, component: SowingManagement }
]
