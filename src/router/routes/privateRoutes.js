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
const MerchantList = React.lazy(() => import("pages/private/inventory/MerchantList"))
const MerchantForm = React.lazy(() => import("pages/private/inventory/MerchantForm"))
const MerchantDashboard = React.lazy(() => import("pages/private/inventory/MerchantDashboard"))
const SellOrderList = React.lazy(() => import("pages/private/inventory/SellOrderList"))
const SellOrderForm = React.lazy(() => import("pages/private/inventory/SellOrderForm"))
const SellOrderDetails = React.lazy(() => import("pages/private/inventory/SellOrderDetails"))
const TransactionList = React.lazy(() => import("pages/private/inventory/TransactionList"))
const InventoryLedger = React.lazy(() => import("pages/private/inventory/InventoryLedger"))
const SowingRequestsList = React.lazy(() => import("pages/private/inventory/SowingRequestsList"))
const ReturnRequestList = React.lazy(() => import("pages/private/inventory/ReturnRequestList"))

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
const PlantAvailability = React.lazy(() => import("pages/private/Sowing/PlantAvailability"))
const SowingGapAnalysis = React.lazy(() => import("pages/private/Sowing/SowingGapAnalysis"))
const PrimarySowingEntry = React.lazy(() => import("pages/private/Sowing/PrimarySowingEntry"))
const PublicFarmerLinks = React.lazy(() => import("pages/private/publicLinks/PublicFarmerLinks"))
const FlowCharts = React.lazy(() => import("pages/private/FlowCharts"))
const OrderBucketing = React.lazy(() => import("pages/private/OrderBucketing"))

export const PrivateRoutes = [
  { path: "/u/dashboard", component: Dashboard },
  { path: "/u/weekly", component: Weekly },
  { path: "/u/transactions", component: Transactions },
  { path: "/u/employeese", component: Patients },

  { path: "/u/sub-admins", component: SubAdmins },
  
  // Inventory Management Routes
  { path: "/u/inventory", component: InventoryDashboard },
  { path: "/u/inventory/products", component: ProductList },
  { path: "/u/inventory/products/new", component: ProductForm },
  { path: "/u/inventory/products/:id/edit", component: ProductForm },
  { path: "/u/inventory/products/:id", component: ProductDetails },
  { path: "/u/inventory/grn", component: GRNList },
  { path: "/u/inventory/grn/new", component: GRNForm },
  { path: "/u/inventory/grn/:id", component: GRNDetails },
  { path: "/u/inventory/purchase-orders", component: PurchaseOrderList },
  { path: "/u/inventory/purchase-orders/new", component: PurchaseOrderForm },
  { path: "/u/inventory/purchase-orders/:id", component: PurchaseOrderDetails },
  { path: "/u/inventory/outward", component: OutwardList },
  { path: "/u/inventory/outward/new", component: OutwardForm },
  { path: "/u/inventory/outward/:id", component: OutwardDetails },
  { path: "/u/inventory/suppliers", component: SupplierList },
  { path: "/u/inventory/suppliers/new", component: SupplierForm },
  { path: "/u/inventory/suppliers/:id/edit", component: SupplierForm },
  { path: "/u/inventory/merchants", component: MerchantList },
  { path: "/u/inventory/merchants/new", component: MerchantForm },
  { path: "/u/inventory/merchants/:id/edit", component: MerchantForm },
  { path: "/u/inventory/merchants/:id/ledger", component: MerchantDashboard },
  { path: "/u/inventory/sell-orders", component: SellOrderList },
  { path: "/u/inventory/sell-orders/new", component: SellOrderForm },
  { path: "/u/inventory/sell-orders/:id", component: SellOrderDetails },
  { path: "/u/inventory/transactions", component: TransactionList },
  { path: "/u/inventory/ledger", component: InventoryLedger },
  { path: "/u/inventory/sowing-requests", component: SowingRequestsList },
  { path: "/u/inventory/return-requests", component: ReturnRequestList },

  { path: "/u/settings", component: Settings },

  { path: "/u/admin", component: Admin },
  { path: "/u/cms", component: Cms },
  { path: "/u/labs", component: Labs },
  { path: "/u/orders", component: Order },
  { path: "/u/plants", component: Plants },
  { path: "/u/slots", component: Slots },
  { path: "/u/hardening", component: Hardening },
  { path: "/u/stats", component: Stats },
  { path: "/u/data", component: DataBackupRestore },
  { path: "/u/farmers", component: FarmerComponent },
  { path: "/u/upload-orders", component: OrdersUpload },
  { path: "/u/dealers", component: Dealers },
  { path: "/u/dealers/:id", component: DealersDetails },
  { path: "/u/capacity-insights", component: CapacityInsights },
  { path: "/u/payments", component: Payments },
  { path: "/u/whatsapp", component: WhatsAppManagement },
  { path: "/u/sowing", component: SowingManagement },
  { path: "/u/plant-availability", component: PlantAvailability },
  { path: "/u/sowing-gap-analysis", component: SowingGapAnalysis },
  { path: "/u/primary-sowing-entry", component: PrimarySowingEntry },
  { path: "/u/public-links", component: PublicFarmerLinks },
  { path: "/u/flow-charts", component: FlowCharts },
  { path: "/u/order-bucketing", component: OrderBucketing }
]
