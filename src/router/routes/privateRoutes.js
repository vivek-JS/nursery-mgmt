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
const RaisingSeedCollectPage = React.lazy(() => import("pages/private/inventory/RaisingSeedCollectPage"))
const ReturnRequestList = React.lazy(() => import("pages/private/inventory/ReturnRequestList"))
const AgriSellReturnsList = React.lazy(() => import("pages/private/inventory/AgriSellReturnsList"))
const PurchaseReturnsList = React.lazy(() => import("pages/private/inventory/PurchaseReturnsList"))
const RamAgriStockPage = React.lazy(() => import("pages/private/inventory/RamAgriStockPage"))
const RamAgriInputsProductMaster = React.lazy(() => import("pages/private/inventory/RamAgriInputsProductMaster"))
const BiotechSeedProductMaster = React.lazy(() => import("pages/private/inventory/BiotechSeedProductMaster"))
const SeedDualInventoryLinks = React.lazy(() => import("pages/private/inventory/SeedDualInventoryLinks"))
const AgriInputSalesOrderPage = React.lazy(() => import("pages/private/inventory/AgriInputSalesOrderPage"))
const RamAgriSalesDashboard = React.lazy(() => import("pages/private/inventory/RamAgriSalesDashboard"))
const RamAgriInputHub = React.lazy(() => import("pages/private/ram-agri-input/RamAgriInputHub"))
const OldSalesAnalytics = React.lazy(() => import("pages/private/inventory/OldSalesAnalytics"))

const Transactions = React.lazy(() => import("pages/private/transaction"))
const Patients = React.lazy(() => import("pages/private/employee"))
const Admin = React.lazy(() => import("pages/private/admin"))
const Cms = React.lazy(() => import("pages/private/cms"))
const Labs = React.lazy(() => import("pages/private/labs"))
const Plants = React.lazy(() => import("pages/private/Plants/slots"))
const Slots = React.lazy(() => import("pages/private/SlotsView/index"))
const SlotSubtypeManagePage = React.lazy(() =>
  import("pages/private/SlotsView/SlotSubtypeManagePage")
)
const Hardening = React.lazy(() => import("pages/private/hardening/Index"))
const Stats = React.lazy(() => import("pages/private/slotsStats"))
const FarmerComponent = React.lazy(() => import("pages/private/farmer/Farmer"))
const FarmerDetails = React.lazy(() => import("pages/private/farmer/FarmerDetails"))
const OrdersUpload = React.lazy(() => import("pages/private/ordersUpload/OrdersUpload"))
const Dealers = React.lazy(() => import("pages/private/dealers/Dealer"))
const DealersDetails = React.lazy(() => import("pages/private/dealers/DelaerDetails"))
const DealerMyLedgerPage = React.lazy(() => import("pages/private/dealers/DealerMyLedgerPage"))
const CapacityInsights = React.lazy(() => import("pages/private/capacityinsights/CapacityInsights"))
const AccountantDashboard = React.lazy(() => import("pages/private/accountant-dashboard"))
const WhatsAppManagement = React.lazy(() => import("pages/private/whatsapp/WhatsAppManagement"))
const SowingManagement = React.lazy(() => import("pages/private/Sowing/SowingManagement"))
const PlantAvailability = React.lazy(() => import("pages/private/Sowing/PlantAvailability"))
const SowingGapAnalysis = React.lazy(() => import("pages/private/Sowing/SowingGapAnalysis"))
const SowingBookingGapAnalysis = React.lazy(() => import("pages/private/Sowing/SowingBookingGapAnalysis"))
const OldSowingGapAnalysis = React.lazy(() => import("pages/private/Sowing/OldSowingGapAnalysis"))
const AdminDirectSowPortal = React.lazy(() => import("pages/private/Sowing/AdminDirectSowPortal"))
const SowingAdminCardsPortal = React.lazy(() => import("pages/private/Sowing/SowingAdminCardsPortal"))
const PrimarySowingEntry = React.lazy(() => import("pages/private/Sowing/PrimarySowingEntry"))
const PrimaryMobileOps = React.lazy(() => import("pages/private/primary/PrimaryMobileOps"))
const SecondaryMobileOps = React.lazy(() => import("pages/private/secondary/SecondaryMobileOps"))
const PublicFarmerLinks = React.lazy(() => import("pages/private/publicLinks/PublicFarmerLinks"))
const FlowCharts = React.lazy(() => import("pages/private/FlowCharts"))
const OrderBucketing = React.lazy(() => import("pages/private/OrderBucketing"))
const TaskManagement = React.lazy(() => import("pages/private/tasks"))
const DispatchedVehiclesPage = React.lazy(() =>
  import("pages/private/DispatchedVehicles/DispatchedVehiclesPage")
)
const DispatchedListPage = React.lazy(() => import("pages/private/Dispatch/DispatchedListPage"))
const PlantPipelineAdminPage = React.lazy(() =>
  import("pages/private/plantPipeline/PlantPipelineAdminPage")
)
const SecondaryDispatchMonitorPage = React.lazy(() =>
  import("pages/private/secondaryDispatchMonitor/SecondaryDispatchMonitorPage")
)
const CallAssignmentList = React.lazy(() => import("pages/private/callAssignment/CallAssignmentList"))
const CashierPage = React.lazy(() => import("pages/private/cashier"))
const UpiReceiptPage = React.lazy(() => import("pages/private/upi-receipt"))
const VoiceFeedbackList = React.lazy(() => import("pages/private/voiceFeedback/VoiceFeedbackList"))
const VoiceFeedbackDetail = React.lazy(() => import("pages/private/voiceFeedback/VoiceFeedbackDetail"))
const RateApprovalsPage = React.lazy(() => import("pages/private/rateApprovals/RateApprovalsPage"))
const CommissionManagementPage = React.lazy(() =>
  import("pages/private/commission/CommissionManagementPage")
)
const RewardProgramsAdmin = React.lazy(() => import("pages/private/rewards/RewardProgramsAdmin"))
const MyRewardsPage = React.lazy(() => import("pages/private/rewards/MyRewardsPage"))
const DatabaseBackupPage = React.lazy(() => import("pages/private/backup/DatabaseBackupPage"))
const AdminStatsPage = React.lazy(() => import("pages/private/adminStats/AdminStatsPage"))
const DeliveryReportPage = React.lazy(() => import("pages/private/deliveryReport/DeliveryReportPage"))
const NurseryAIAgentPage = React.lazy(() => import("pages/private/aiAgent/NurseryAIAgentPage"))
const FleetManagementPage = React.lazy(() => import("pages/private/fleet/FleetManagementPage"))
const AttendanceManagementPage = React.lazy(() => import("pages/private/attendance"))

export const PrivateRoutes = [
  { path: "/u/dashboard", component: Dashboard },
  { path: "/u/weekly", component: Weekly },
  { path: "/u/transactions", component: Transactions },
  { path: "/u/employeese", component: Patients },
  { path: "/u/attendance", component: AttendanceManagementPage },

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
  { path: "/u/inventory/raising-seeds", component: RaisingSeedCollectPage },
  { path: "/u/inventory/purchase-orders", component: PurchaseOrderList },
  { path: "/u/inventory/purchase-orders/new", component: PurchaseOrderForm },
  { path: "/u/inventory/purchase-orders/:id/edit", component: PurchaseOrderForm },
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
  { path: "/u/inventory/purchase-returns", component: PurchaseReturnsList },
  { path: "/u/inventory/agri-sales-returns", component: AgriSellReturnsList },
  { path: "/u/inventory/ram-agri-stock", component: RamAgriStockPage },
  { path: "/u/inventory/ram-agri-inputs-master", component: RamAgriInputsProductMaster },
  { path: "/u/inventory/biotech-seed-master", component: BiotechSeedProductMaster },
  { path: "/u/inventory/seed-dual-links", component: SeedDualInventoryLinks },
  { path: "/u/inventory/ram-agri-input-order/new", component: AgriInputSalesOrderPage },
  { path: "/u/inventory/ram-agri-sales-dashboard", component: RamAgriSalesDashboard },
  { path: "/u/ram-agri-input", component: RamAgriInputHub },
  { path: "/u/inventory/old-sales-analytics", component: OldSalesAnalytics },

  { path: "/u/settings", component: Settings },

  { path: "/u/admin", component: Admin },
  { path: "/u/cms", component: Cms },
  { path: "/u/labs", component: Labs },
  { path: "/u/plants", component: Plants },
  { path: "/u/slots/:plantId/:subtypeId", component: SlotSubtypeManagePage },
  { path: "/u/slots", component: Slots },
  { path: "/u/hardening", component: Hardening },
  { path: "/u/stats", component: Stats },
  { path: "/u/farmers", component: FarmerComponent },
  { path: "/u/farmers/:id", component: FarmerDetails },
  { path: "/u/upload-orders", component: OrdersUpload },
  { path: "/u/dealers", component: Dealers },
  { path: "/u/dealers/:id", component: DealersDetails },
  { path: "/u/my-ledger", component: DealerMyLedgerPage },
  { path: "/u/capacity-insights", component: CapacityInsights },
  { path: "/u/accountant-dashboard", component: AccountantDashboard },
  { path: "/u/whatsapp", component: WhatsAppManagement },
  { path: "/u/sowing", component: SowingManagement },
  { path: "/u/plant-availability", component: PlantAvailability },
  { path: "/u/sowing-gap-analysis", component: SowingGapAnalysis },
  { path: "/u/sowing-booking-gap-analysis", component: SowingBookingGapAnalysis },
  { path: "/u/old-sowing-gap-analysis", component: OldSowingGapAnalysis },
  { path: "/u/admin-direct-sow", component: AdminDirectSowPortal },
  { path: "/u/sowing-admin-cards", component: SowingAdminCardsPortal },
  { path: "/u/primary-sowing-entry", component: PrimarySowingEntry },
  { path: "/u/primary-mobile", component: PrimaryMobileOps },
  { path: "/u/secondary-sowing-entry", component: SecondaryMobileOps },
  { path: "/u/secondary-mobile", component: SecondaryMobileOps },
  { path: "/u/public-links", component: PublicFarmerLinks },
  { path: "/u/flow-charts", component: FlowCharts },
  { path: "/u/order-bucketing", component: OrderBucketing },
  { path: "/u/tasks", component: TaskManagement },
  { path: "/u/task-manager", component: TaskManagement },
  { path: "/u/dispatched-vehicles", component: DispatchedVehiclesPage },
  { path: "/u/dispatch-orders", component: DispatchedListPage },
  { path: "/u/plant-pipeline", component: PlantPipelineAdminPage },
  { path: "/u/secondary-dispatch-monitor", component: SecondaryDispatchMonitorPage },
  { path: "/u/fleet", component: FleetManagementPage },
  { path: "/u/cashier", component: CashierPage },
  { path: "/u/call-assignment", component: CallAssignmentList },
  { path: "/u/upi-receipt", component: UpiReceiptPage },
  { path: "/u/voice-feedback", component: VoiceFeedbackList },
  { path: "/u/voice-feedback/:id", component: VoiceFeedbackDetail },
  { path: "/u/rate-approvals", component: RateApprovalsPage },
  { path: "/u/commission", component: CommissionManagementPage },
  { path: "/u/rewards-admin", component: RewardProgramsAdmin },
  { path: "/u/my-rewards", component: MyRewardsPage },
  { path: "/u/database-backup", component: DatabaseBackupPage },
  { path: "/u/admin-stats", component: AdminStatsPage },
  { path: "/u/delivery-report", component: DeliveryReportPage },
  { path: "/u/ai-agent", component: NurseryAIAgentPage },
]
