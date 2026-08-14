// List all endpoints here
import { OFFLINE } from "network/offline"
import { HTTP_METHODS, APIRouter, APIWithOfflineRouter, APICustomRouter } from "../core/httpHelper"
import { APIConfig } from "./serverConfig"

/** Host only (no /api/v1) — backend mounts `/api/payments/*` at server root. */
const PAYMENTS_API_HOST =
  String(APIConfig.BASE_URL || "http://localhost:8000")
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/$/, "") || "http://localhost:8000"

// ******************
// Endpoint class takes 3 params in constructor ==> "endpoint", "http-method", "API-version"
// By default, version is set to v2
// ******************
export const API = {
  /** ERP bank reconciliation + ICICI statement (mounted at `/api/payments`, not under `/api/v1`). */
  PAYMENTS: {
    POST_ICICI_BANK_STATEMENT: new APICustomRouter(
      PAYMENTS_API_HOST,
      "/api/payments/icici/bank-statement",
      HTTP_METHODS.POST
    ),
    GET_ICICI_STATUS: new APICustomRouter(PAYMENTS_API_HOST, "/api/payments/icici/status", HTTP_METHODS.GET),
    POST_RECONCILE: new APICustomRouter(PAYMENTS_API_HOST, "/api/payments/reconcile", HTTP_METHODS.POST),
    GET_RECONCILIATION_UNVERIFIED: new APICustomRouter(
      PAYMENTS_API_HOST,
      "/api/payments/reconciliation/unverified",
      HTTP_METHODS.GET
    ),
    GET_RECONCILIATION_FOR_APPROVAL: new APICustomRouter(
      PAYMENTS_API_HOST,
      "/api/payments/reconciliation/for-approval",
      HTTP_METHODS.GET
    ),
    /** Legacy hospital/v2 payments list (different from ERP ICICI routes above). */
    GET_PAYMENTS: new APIRouter("api/v2/other/getPayments", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PAYMENTS_CSV: new APIRouter("api/v2/other/getCSV", HTTP_METHODS.GET, OFFLINE.PROFILE),
  },
  AUTH: {
    // if you want to return offline json if api fails
    LOGIN: new APIWithOfflineRouter("/user/login", HTTP_METHODS.POST, OFFLINE.LOGIN),
    LOGIN_GOOGLE: new APIWithOfflineRouter(
      "/user/google-login/",
      HTTP_METHODS.POST,
      OFFLINE.LOGINGOOGLE
    ),
    LOGIN_FACEBOOK: new APIWithOfflineRouter(
      "/user/facebook-login/",
      HTTP_METHODS.POST,
      OFFLINE.LOGINFACEBOOK
    ),

    SIGNUP: new APIWithOfflineRouter("/user/signup/", HTTP_METHODS.POST, OFFLINE.SIGNUP),
    FORGOTPASSWORD: new APIWithOfflineRouter(
      "/user/forgot-password/",
      HTTP_METHODS.POST,
      OFFLINE.FORGOTPASSWORD
    ),
    RESETPASSWORD: new APIWithOfflineRouter(
      "/user/reset-password/",
      HTTP_METHODS.PATCH,
      OFFLINE.RESETPASSWORD
    ),
    VERIFYOTP: new APIWithOfflineRouter("/auth/login", HTTP_METHODS.POST, OFFLINE.LOGIN),
    REFRESH_TOKEN: new APIRouter("user/refresh-token", HTTP_METHODS.POST)
  },
  MOTIVATIONAL_QUOTE: {
    GET_TODAY: new APIRouter("/motivational-quote/today", HTTP_METHODS.GET)
  },
  DAILY_NOTE: {
    GET_TODAY: new APIRouter("/daily-notes/today", HTTP_METHODS.GET),
    UPSERT_TODAY: new APIRouter("/daily-notes/today", HTTP_METHODS.PUT),
    UPSERT: new APIRouter("/daily-notes", HTTP_METHODS.POST),
    LIST: new APIRouter("/daily-notes", HTTP_METHODS.GET),
    BY_DATE: new APIRouter("/daily-notes/by-date/:date", HTTP_METHODS.GET),
    UPDATE: new APIRouter("/daily-notes/:id", HTTP_METHODS.PUT),
    DELETE: new APIRouter("/daily-notes/:id", HTTP_METHODS.DEL),
  },

  HOSPITAL: {
    LOGIN_HOSPITAL: new APIWithOfflineRouter("user/login", HTTP_METHODS.POST, OFFLINE.LOGIN),
    CREATE_HOSPITAL: new APIRouter(
      "/api/v2/hospital/createHospital/",
      HTTP_METHODS.POST,
      OFFLINE.LOGIN
    ),
    UPDATE_HOSPITAL: new APIRouter(
      "/api/v2/hospital/updateHospital",
      HTTP_METHODS.PATCH,
      OFFLINE.LOGIN
    )
  },
  COMPOUNDER: {
    CREATE_COMPOUNDER: new APIRouter(
      "/api/v2/compounder/createCompounder",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    GET_COMPOUNDER: new APIRouter(
      "/api/v2/compounder/getAllCompounder",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    )
  },
  USER: {
    PROFILE: new APIRouter("/user/aboutMe", HTTP_METHODS.GET),
    LOGOUT: new APIRouter("/user/logout", HTTP_METHODS.POST),
    CHANGE_PASSWORD: new APIRouter("/user/change-password", HTTP_METHODS.POST),
    RESET_PASSWORD: new APIRouter("/user/reset-password", HTTP_METHODS.POST),
    GET_USERS: new APIRouter("/user/allusers", HTTP_METHODS.GET),
    GET_DEALERS: new APIRouter("/user/dealers", HTTP_METHODS.GET),
    GET_DEALERS_STATS: new APIRouter("/user/dealers/stats", HTTP_METHODS.GET),
    GET_DEALERS_TRANSACTIONS: new APIRouter("/user/dealers/transactions", HTTP_METHODS.GET),
    GET_DEALER_WALLET_DETAILS: new APIRouter("/user/wallet-details", HTTP_METHODS.GET),
    GET_DEALER_WALLET_TRANSACTIONS: new APIRouter("/user/dealers/transactions", HTTP_METHODS.GET),
    EXPORT_DEALER_WALLET_TRANSACTIONS_CSV: new APIRouter(
      "/user/dealers/transactions",
      HTTP_METHODS.GET
    ),
    GET_DEALER_PLANT_LEDGER: new APIRouter("/user/dealers", HTTP_METHODS.GET),
    GET_DEALER_LEDGER: new APIRouter("/user/dealers", HTTP_METHODS.GET),
    REPAIR_DEALER_LEDGER: new APIRouter("/user/dealers", HTTP_METHODS.POST),
    POST_DEALER_WALLET_CREDIT: new APIRouter(
      "/user/dealers/:dealerId/wallet/credit",
      HTTP_METHODS.POST
    ),
  },
  PATIENT: {
    ADD_PATIENT_LIST: new APIRouter("api/v2/users/", HTTP_METHODS.POST, OFFLINE.PROFILE),
    PATIENT_LIST: new APIRouter(
      "api/v2/patient/getAllPatientsPagination",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    PATIENT_DETAILS: new APIRouter("api/v2/patient/getPatient", HTTP_METHODS.GET, OFFLINE.PROFILE),
    //v2 api
    ADD_PATIENT_LIST_V2: new APIRouter(
      "api/v2/patient/createPatient",
      HTTP_METHODS.POST,
      OFFLINE.LOGIN
    ),
    GET_PATIENT_DETAILS: new APIRouter(
      "api/v2/patient/getPatient",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_PATIENT_WITH_APPOINTMENT_DETAILS: new APIRouter(
      "api/v2/patient/getPatientWithAppointments?",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    )
  },
  INVOICE: {
    GET_INVOICE: new APIRouter("api/v2/other/getInvoice", HTTP_METHODS.GET, OFFLINE.PROFILE)
  },
  PRESCRIPTION: {
    GET_PRESCRIPTION: new APIRouter(
      "api/v2/other/getPrescription",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    )
  },
  APPOINTMENT: {
    ADD_APPOINTMENT: new APIRouter(
      "api/v2/appointment/createAppointment",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    APPOINTMENT_STATISTICS: new APIRouter(
      "api/v2/appointment/getAppointmentStatistics",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    APPOINTMENT_LIST: new APIRouter(
      "api/v2/appointment/getAppointment",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    PATIENT_LIST: new APIRouter("api/v2/users/", HTTP_METHODS.GET, OFFLINE.PROFILE),
    CHANGE_STATUS: new APIRouter(
      "api/v2/appointment/updateAppointment",
      HTTP_METHODS.PATCH,
      OFFLINE.PROFILE
    ),
    CHANGE_PAYMENG_STATUS: new APIRouter(
      "api/v2/appointments/change-payment-status",
      HTTP_METHODS.PATCH,
      OFFLINE.PROFILE
    ),
    DELETE_APPOINTMENT: new APIRouter(
      "api/v2/appointment/deleteAppointment",
      HTTP_METHODS.DEL,
      OFFLINE.PROFILE
    )
  },
  FOLLOW_UP: {
    ADD_FOLLOW_UP: new APIRouter(
      "api/v2/followup/createFollowup",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    GET_FOLLOW_UP: new APIRouter("api/v2/followup/getFollowup", HTTP_METHODS.GET, OFFLINE.PROFILE),
  },
  // Paths omit /api/v1 — axios interceptor prepends exactly one /api/v1 (see services/axiosConfig.js)
  TASK: {
    CREATE: new APIRouter("/tasks", HTTP_METHODS.POST),
    GET_ALL: new APIRouter("/tasks", HTTP_METHODS.GET),
    STATS: new APIRouter("/tasks/stats", HTTP_METHODS.GET),
    GET_BY_ID: new APIRouter("/tasks/:taskId", HTTP_METHODS.GET),
    UPDATE: new APIRouter("/tasks/:taskId", HTTP_METHODS.PUT),
    UPDATE_MY_ASSIGNMENT: new APIRouter("/tasks/:taskId/my-assignment", HTTP_METHODS.PATCH),
    DELETE: new APIRouter("/tasks/:taskId", HTTP_METHODS.DEL),
    ADD_COMMENT: new APIRouter("/tasks/:taskId/comment", HTTP_METHODS.POST),
    GET_PUBLIC_BY_EMPLOYEE: new APIRouter("/tasks/public/employee/:employeeId", HTTP_METHODS.GET),
    ADD_PUBLIC_COMMENT: new APIRouter("/tasks/public/:taskId/comment", HTTP_METHODS.POST),
  },
  INVENTORY: {
    // Dashboard
    GET_DASHBOARD: new APIRouter("/inventory/dashboard", HTTP_METHODS.GET),
    GET_PRODUCTS_SUMMARY: new APIRouter("/inventory/products/summary", HTTP_METHODS.GET),

    // Products
    GET_ALL_PRODUCTS: new APIRouter("/inventory/products", HTTP_METHODS.GET),
    GET_PRODUCT_BY_ID: new APIRouter("/inventory/products", HTTP_METHODS.GET),
    CREATE_PRODUCT: new APIRouter("/inventory/products", HTTP_METHODS.POST),
    UPDATE_PRODUCT: new APIRouter("/inventory/products", HTTP_METHODS.PUT),
    DELETE_PRODUCT: new APIRouter("/inventory/products", HTTP_METHODS.DEL),
    GET_LOW_STOCK_PRODUCTS: new APIRouter("/inventory/products/low-stock", HTTP_METHODS.GET),
    GET_BIOTECH_SEED_MASTER: new APIRouter("/inventory/biotech-seed-master", HTTP_METHODS.GET),
    GET_SEED_DUAL_LINKS: new APIRouter("/inventory/seed-dual-links", HTTP_METHODS.GET),
    ASSIGN_SUBTYPE_SEED: new APIRouter("/inventory/seed-dual-links/assign", HTTP_METHODS.POST),
    REMOVE_SUBTYPE_SEED_LINK: new APIRouter("/inventory/seed-dual-links/remove", HTTP_METHODS.POST),
    GET_SUBTYPE_INVENTORY_LINKS: new APIRouter("/inventory/seed-dual-links/by-subtype", HTTP_METHODS.GET),
    GET_ALL_BIOTECH_SEED_PRODUCTS: new APIRouter("/inventory/biotech-seed-products", HTTP_METHODS.GET),
    CREATE_BIOTECH_SEED_PLANT: new APIRouter("/inventory/biotech-seed-products", HTTP_METHODS.POST),
    UPDATE_BIOTECH_SEED_PLANT: new APIRouter("/inventory/biotech-seed-products/:id", HTTP_METHODS.PATCH),
    DELETE_BIOTECH_SEED_PLANT: new APIRouter("/inventory/biotech-seed-products/:id", HTTP_METHODS.DEL),
    ADD_BIOTECH_VARIETY: new APIRouter("/inventory/biotech-seed-products/:id/varieties", HTTP_METHODS.POST),
    UPDATE_BIOTECH_VARIETY: new APIRouter(
      "/inventory/biotech-seed-products/:id/varieties/:varietyId",
      HTTP_METHODS.PATCH
    ),
    DELETE_BIOTECH_VARIETY: new APIRouter(
      "/inventory/biotech-seed-products/:id/varieties/:varietyId",
      HTTP_METHODS.DEL
    ),
    GET_PRODUCT_AGRI_LINK: new APIRouter("/inventory/products/:id/agri-link", HTTP_METHODS.GET),
    PATCH_PRODUCT_AGRI_LINK: new APIRouter("/inventory/products/:id/agri-link", HTTP_METHODS.PATCH),
    GET_PRODUCT_STOCK_LEDGER: new APIRouter("/inventory/products/:id/stock-ledger", HTTP_METHODS.GET),

    // Categories
    GET_ALL_CATEGORIES: new APIRouter("/inventory/categories", HTTP_METHODS.GET),
    GET_CATEGORY_BY_ID: new APIRouter("/inventory/categories", HTTP_METHODS.GET),
    CREATE_CATEGORY: new APIRouter("/inventory/categories", HTTP_METHODS.POST),
    UPDATE_CATEGORY: new APIRouter("/inventory/categories", HTTP_METHODS.PUT),
    DELETE_CATEGORY: new APIRouter("/inventory/categories", HTTP_METHODS.DEL),

    // Ram Agri Inputs Product Master
    GET_ALL_RAM_AGRI_INPUTS: new APIRouter("/inventory/ram-agri-inputs", HTTP_METHODS.GET),
    GET_RAM_AGRI_BATCHES: new APIRouter("/inventory/ram-agri-inputs/batches", HTTP_METHODS.GET),
    GET_RAM_AGRI_VARIETY_BATCHES: new APIRouter("/inventory/ram-agri-inputs/:cropId/varieties/:varietyId/batches", HTTP_METHODS.GET),
    GET_RAM_AGRI_BATCH_SUMMARY: new APIRouter("/inventory/ram-agri-inputs/batches/summary", HTTP_METHODS.GET),
    GET_RAM_AGRI_INPUT_BY_ID: new APIRouter("/inventory/ram-agri-inputs/:id", HTTP_METHODS.GET),
    CREATE_RAM_AGRI_INPUT: new APIRouter("/inventory/ram-agri-inputs", HTTP_METHODS.POST),
    UPDATE_RAM_AGRI_INPUT: new APIRouter("/inventory/ram-agri-inputs/:id", HTTP_METHODS.PATCH),
    DELETE_RAM_AGRI_INPUT: new APIRouter("/inventory/ram-agri-inputs/:id", HTTP_METHODS.DEL),
    ADD_VARIETY: new APIRouter("/inventory/ram-agri-inputs/:id/varieties", HTTP_METHODS.POST),
    UPDATE_VARIETY: new APIRouter("/inventory/ram-agri-inputs/:id/varieties/:varietyId", HTTP_METHODS.PATCH),
    GET_VARIETY_INVENTORY_LINK: new APIRouter(
      "/inventory/ram-agri-inputs/:id/varieties/:varietyId/inventory-link",
      HTTP_METHODS.GET
    ),
    UPSERT_VARIETY_INVENTORY_LINK: new APIRouter(
      "/inventory/ram-agri-inputs/:id/varieties/:varietyId/inventory-link",
      HTTP_METHODS.PATCH
    ),
    CLEAR_ALL_VARIETY_INVENTORY_LINKS: new APIRouter(
      "/inventory/ram-agri-inputs/inventory-links/clear-all",
      HTTP_METHODS.POST
    ),
    DELETE_VARIETY: new APIRouter("/inventory/ram-agri-inputs/:id/varieties/:varietyId", HTTP_METHODS.DEL),
    ADD_RATE: new APIRouter("/inventory/ram-agri-inputs/:id/varieties/:varietyId/rates", HTTP_METHODS.POST),
    UPDATE_RATE: new APIRouter("/inventory/ram-agri-inputs/:id/varieties/:varietyId/rates/:rateId", HTTP_METHODS.PATCH),
    DELETE_RATE: new APIRouter("/inventory/ram-agri-inputs/:id/varieties/:varietyId/rates/:rateId", HTTP_METHODS.DEL),

    // Change Logs
    GET_ALL_CHANGE_LOGS: new APIRouter("/inventory/change-logs", HTTP_METHODS.GET),
    GET_CHANGE_LOG_STATS: new APIRouter("/inventory/change-logs/stats", HTTP_METHODS.GET),
    GET_CHANGE_LOGS_BY_ENTITY: new APIRouter("/inventory/change-logs", HTTP_METHODS.GET), // /:entityType/:entityId

    // Measurement Units
    GET_ALL_UNITS: new APIRouter("/inventory/units", HTTP_METHODS.GET),
    GET_UNIT_BY_ID: new APIRouter("/inventory/units", HTTP_METHODS.GET),
    CREATE_UNIT: new APIRouter("/inventory/units", HTTP_METHODS.POST),
    UPDATE_UNIT: new APIRouter("/inventory/units", HTTP_METHODS.PUT),
    DELETE_UNIT: new APIRouter("/inventory/units", HTTP_METHODS.DEL),

    // Suppliers
    GET_ALL_SUPPLIERS: new APIRouter("/inventory/suppliers", HTTP_METHODS.GET),
    GET_ALL_SUPPLIERS_SIMPLE: new APIRouter("/inventory/suppliers/all", HTTP_METHODS.GET),
    GET_SUPPLIER_BY_ID: new APIRouter("/inventory/suppliers", HTTP_METHODS.GET),
    CREATE_SUPPLIER: new APIRouter("/inventory/suppliers", HTTP_METHODS.POST),
    UPDATE_SUPPLIER: new APIRouter("/inventory/suppliers", HTTP_METHODS.PUT),
    DELETE_SUPPLIER: new APIRouter("/inventory/suppliers", HTTP_METHODS.DEL),

    // Merchants
    GET_ALL_MERCHANTS: new APIRouter("/inventory/merchants", HTTP_METHODS.GET),
    GET_ALL_MERCHANTS_SIMPLE: new APIRouter("/inventory/merchants/all", HTTP_METHODS.GET),
    GET_MERCHANT_BY_ID: new APIRouter("/inventory/merchants/:id", HTTP_METHODS.GET),
    GET_MERCHANT_LEDGER: new APIRouter("/inventory/merchants/:id/ledger", HTTP_METHODS.GET),
    CREATE_MERCHANT: new APIRouter("/inventory/merchants", HTTP_METHODS.POST),
    UPDATE_MERCHANT: new APIRouter("/inventory/merchants/:id", HTTP_METHODS.PUT),
    DELETE_MERCHANT: new APIRouter("/inventory/merchants/:id", HTTP_METHODS.DEL),

    // Purchase Orders
    GET_ALL_PURCHASE_ORDERS: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.GET),
    GET_PURCHASE_ORDER_BY_ID: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.GET),
    CREATE_PURCHASE_ORDER: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.POST),
    UPDATE_PURCHASE_ORDER: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.PUT),
    DELETE_PURCHASE_ORDER: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.DEL),
    APPROVE_PURCHASE_ORDER: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.POST), // /:id/approve
    CANCEL_PURCHASE_ORDER: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.POST), // /:id/cancel

    // Purchase Returns (classic / biotech plant inventory)
    LIST_PURCHASE_RETURNS: new APIRouter("/inventory/purchase-returns", HTTP_METHODS.GET),
    LIST_ELIGIBLE_POS_FOR_PURCHASE_RETURN: new APIRouter(
      "/inventory/purchase-returns/eligible-pos",
      HTTP_METHODS.GET
    ),
    LIST_ELIGIBLE_SUPPLIERS_FOR_PURCHASE_RETURN: new APIRouter(
      "/inventory/purchase-returns/eligible-suppliers",
      HTTP_METHODS.GET
    ),
    GET_PURCHASE_RETURNABLE_BATCHES: new APIRouter(
      "/inventory/purchase-returns/returnable-batches",
      HTTP_METHODS.GET
    ),
    CREATE_PURCHASE_RETURN: new APIRouter("/inventory/purchase-returns", HTTP_METHODS.POST),
    DOWNLOAD_PURCHASE_RETURN_INVOICE: new APIRouter(
      "/inventory/purchase-returns/:id/invoice",
      HTTP_METHODS.GET
    ),

    // Centralized Money Ledger (Biotech + Ram Agri)
    MONEY_LEDGER_BOOKS: new APIRouter("/inventory/money-ledger/books", HTTP_METHODS.GET),
    MONEY_LEDGER_PARTIES: new APIRouter("/inventory/money-ledger/parties", HTTP_METHODS.GET),
    MONEY_LEDGER_PARTY_STATEMENT: new APIRouter(
      "/inventory/money-ledger/parties/:partyType/:partyId",
      HTTP_METHODS.GET
    ),
    MONEY_LEDGER_ADD_PAYMENT: new APIRouter("/inventory/money-ledger/payments", HTTP_METHODS.POST),
    MONEY_LEDGER_ADD_DISCOUNT: new APIRouter("/inventory/money-ledger/discounts", HTTP_METHODS.POST),
    MONEY_LEDGER_PENDING_ADJUSTMENTS: new APIRouter(
      "/inventory/money-ledger/pending-adjustments",
      HTTP_METHODS.GET
    ),
    MONEY_LEDGER_ACCEPT_PENDING: new APIRouter(
      "/inventory/money-ledger/pending-adjustments/:id/accept",
      HTTP_METHODS.POST
    ),
    MONEY_LEDGER_REJECT_PENDING: new APIRouter(
      "/inventory/money-ledger/pending-adjustments/:id/reject",
      HTTP_METHODS.POST
    ),
    MONEY_LEDGER_DOC_PAYMENT: new APIRouter(
      "/inventory/money-ledger/documents/:type/:id/payments",
      HTTP_METHODS.POST
    ),
    MONEY_LEDGER_BACKFILL: new APIRouter("/inventory/money-ledger/backfill", HTTP_METHODS.POST),

    // GRN (Goods Received Note)
    GET_ALL_GRN: new APIRouter("/inventory/grn", HTTP_METHODS.GET),
    GET_GRN_BY_ID: new APIRouter("/inventory/grn", HTTP_METHODS.GET),
    CREATE_GRN: new APIRouter("/inventory/grn", HTTP_METHODS.POST),
    UPDATE_GRN: new APIRouter("/inventory/grn", HTTP_METHODS.PUT),
    DELETE_GRN: new APIRouter("/inventory/grn", HTTP_METHODS.DEL),
    APPROVE_GRN: new APIRouter("/inventory/grn", HTTP_METHODS.POST), // /:id/approve

    // Sell Orders
    GET_ALL_SELL_ORDERS: new APIRouter("/inventory/sell-orders", HTTP_METHODS.GET),
    GET_SELL_ORDER_BY_ID: new APIRouter("/inventory/sell-orders", HTTP_METHODS.GET),
    CREATE_SELL_ORDER: new APIRouter("/inventory/sell-orders", HTTP_METHODS.POST),
    UPDATE_SELL_ORDER: new APIRouter("/inventory/sell-orders", HTTP_METHODS.PUT),
    DELETE_SELL_ORDER: new APIRouter("/inventory/sell-orders", HTTP_METHODS.DEL),
    APPROVE_SELL_ORDER: new APIRouter("/inventory/sell-orders", HTTP_METHODS.POST), // /:id/approve
    ADD_SELL_ORDER_PAYMENT: new APIRouter("/inventory/sell-orders", HTTP_METHODS.POST), // /:id/payment
    GET_SELL_ORDER_PENDING_PAYMENTS: new APIRouter("/inventory/sell-orders/pending-payments", HTTP_METHODS.GET),
    UPDATE_SELL_ORDER_PAYMENT_STATUS: new APIRouter("/inventory/sell-orders", HTTP_METHODS.PATCH), // /:id/payment/:paymentId/status
    GET_FARMER_LEDGER: new APIRouter("/inventory/sell-orders/farmer-ledger", HTTP_METHODS.GET),

    // Inventory Outward
    GET_ALL_OUTWARD: new APIRouter("/inventory/outward", HTTP_METHODS.GET),
    GET_OUTWARD_BY_ID: new APIRouter("/inventory/outward", HTTP_METHODS.GET),
    CREATE_OUTWARD: new APIRouter("/inventory/outward", HTTP_METHODS.POST),
    UPDATE_OUTWARD: new APIRouter("/inventory/outward", HTTP_METHODS.PUT),
    DELETE_OUTWARD: new APIRouter("/inventory/outward", HTTP_METHODS.DEL),
    ISSUE_OUTWARD: new APIRouter("/inventory/outward/:id/issue", HTTP_METHODS.POST),
    GET_AVAILABLE_BATCHES_FOR_OUTWARD: new APIRouter("/inventory/outward/batches/:productId", HTTP_METHODS.GET),
    GET_AVAILABLE_PACKETS_FOR_SOWING: new APIRouter("/inventory/outward/packets-for-sowing/:productId", HTTP_METHODS.GET),
    GET_ALL_AVAILABLE_PACKETS_FOR_SOWING: new APIRouter("/inventory/outward/packets-for-sowing", HTTP_METHODS.GET),

    // Inventory Transactions
    GET_ALL_TRANSACTIONS: new APIRouter("/inventory/transactions", HTTP_METHODS.GET),
    GET_TRANSACTION_BY_ID: new APIRouter("/inventory/transactions", HTTP_METHODS.GET),

    // Return Requests
    GET_RETURN_REQUESTS: new APIRouter("/inventory/return-requests", HTTP_METHODS.GET),
    GET_RETURN_REQUEST_BY_ID: new APIRouter("/inventory/return-requests", HTTP_METHODS.GET),
    GET_PENDING_RETURN_REQUESTS_COUNT: new APIRouter("/inventory/return-requests/pending/count", HTTP_METHODS.GET),
    APPROVE_RETURN_REQUEST: new APIRouter("/inventory/return-requests", HTTP_METHODS.PATCH), // /:id/approve
    REJECT_RETURN_REQUEST: new APIRouter("/inventory/return-requests", HTTP_METHODS.PATCH), // /:id/reject

    // Ram Agri Sales Dashboard
    GET_RAM_AGRI_SALES_DASHBOARD: new APIRouter("/inventory/ram-agri-sales-dashboard", HTTP_METHODS.GET),
    GET_RAM_AGRI_DAILY_CLOSING_STOCK: new APIRouter("/inventory/ram-agri-daily-closing-stock", HTTP_METHODS.GET),
    UPSERT_RAM_AGRI_DAILY_CLOSING_STOCK: new APIRouter("/inventory/ram-agri-daily-closing-stock", HTTP_METHODS.POST),
    GET_RAM_AGRI_SALES_RANKBOARD: new APIRouter("/inventory/ram-agri-sales-rankboard", HTTP_METHODS.GET),
    GET_RAM_AGRI_SALES_TARGETS: new APIRouter("/inventory/ram-agri-sales-targets", HTTP_METHODS.GET),
    SAVE_RAM_AGRI_SALES_TARGET: new APIRouter("/inventory/ram-agri-sales-targets", HTTP_METHODS.POST),
    GET_RAM_AGRI_VARIETY_LEDGER: new APIRouter("/inventory/ram-agri-variety-ledger", HTTP_METHODS.GET),
    GET_RAM_AGRI_CUSTOMER_LEDGER: new APIRouter("/inventory/ram-agri-customer-ledger", HTTP_METHODS.GET),
    SEARCH_RAM_AGRI_CUSTOMERS_FOR_LEDGER: new APIRouter(
      "/inventory/ram-agri-customer-ledger/search-customers",
      HTTP_METHODS.GET
    ),
    TRANSFER_RAM_AGRI_CUSTOMER_ADVANCE: new APIRouter(
      "/inventory/ram-agri-customer-ledger/transfer-advance",
      HTTP_METHODS.POST
    ),
    CREATE_RAM_AGRI_CUSTOMER_LEDGER_MANUAL_ENTRY: new APIRouter(
      "/inventory/ram-agri-customer-ledger/manual-entry",
      HTTP_METHODS.POST
    ),
    GET_RAM_AGRI_LEDGER_PARTIES: new APIRouter("/inventory/ram-agri-customer-ledger/parties", HTTP_METHODS.GET),
    GET_RAM_AGRI_MERCHANT_LEDGER: new APIRouter("/inventory/ram-agri-merchant-ledger", HTTP_METHODS.GET),
    GET_RAM_AGRI_VIDEO_SUMMARY: new APIRouter("/inventory/ram-agri-video-summary", HTTP_METHODS.GET),

    // Agri Sales Orders (Ram Agri Sales)
    GET_ALL_AGRI_SALES_ORDERS: new APIRouter("/inventory/agri-sales-orders", HTTP_METHODS.GET),
    GET_OUTSTANDING_AGRI_SALES_ORDERS: new APIRouter("/inventory/agri-sales-orders/outstanding", HTTP_METHODS.GET),
    GET_AGRI_SALES_OUTSTANDING_LIMIT_SUMMARY: new APIRouter(
      "/inventory/agri-sales-orders/outstanding-limit/summary",
      HTTP_METHODS.GET
    ),
    GET_AGRI_SALES_OUTSTANDING_LIMIT_SETTINGS: new APIRouter(
      "/inventory/agri-sales-orders/outstanding-limit/settings",
      HTTP_METHODS.GET
    ),
    PATCH_AGRI_SALES_OUTSTANDING_LIMIT_GLOBAL: new APIRouter(
      "/inventory/agri-sales-orders/outstanding-limit/global",
      HTTP_METHODS.PATCH
    ),
    PATCH_AGRI_SALES_OUTSTANDING_LIMIT_USER: new APIRouter(
      "/inventory/agri-sales-orders/outstanding-limit/user/:userId",
      HTTP_METHODS.PATCH
    ),
    GET_AGRI_SALES_ORDER_BY_ID: new APIRouter("/inventory/agri-sales-orders", HTTP_METHODS.GET),
    GET_AGRI_ORDER_TIMELINE: new APIRouter(
      "/inventory/agri-sales-orders/:id/timeline",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    CREATE_AGRI_SALES_ORDER: new APIRouter("/inventory/agri-sales-orders/create", HTTP_METHODS.POST),
    RETRY_AGRI_SALES_ORDER_MONEY_LEDGER: new APIRouter(
      "/inventory/agri-sales-orders/:id/retry-money-ledger",
      HTTP_METHODS.POST
    ),
    CREATE_LINKED_AGRI_ORDER: new APIRouter("/inventory/agri-sales-orders/linked/create", HTTP_METHODS.POST),
    GET_LINKED_AGRI_BY_NURSERY_ORDER: new APIRouter("/inventory/agri-sales-orders/linked/by-nursery-order/:orderId", HTTP_METHODS.GET),
    GET_TODAY_PENDING_LINKED_AGRI_LOAD: new APIRouter("/inventory/agri-sales-orders/linked/today-pending-load", HTTP_METHODS.GET),
    MARK_LINKED_AGRI_LOADED: new APIRouter("/inventory/agri-sales-orders/linked/:id/mark-loaded", HTTP_METHODS.PATCH),
    GET_DISPATCH_LOAD_STATUS: new APIRouter("/inventory/agri-sales-orders/linked/dispatch-load-status", HTTP_METHODS.POST),
    UPDATE_AGRI_SALES_ORDER: new APIRouter("/inventory/agri-sales-orders/:id", HTTP_METHODS.PATCH),
    ACCEPT_AGRI_SALES_ORDER: new APIRouter("/inventory/agri-sales-orders/:id/accept", HTTP_METHODS.PATCH),
    REJECT_AGRI_SALES_ORDER: new APIRouter("/inventory/agri-sales-orders/:id/reject", HTTP_METHODS.PATCH),
    CANCEL_AGRI_SALES_ORDER: new APIRouter("/inventory/agri-sales-orders/:id/cancel", HTTP_METHODS.PATCH),
    ADD_AGRI_SALES_ORDER_PAYMENT: new APIRouter("/inventory/agri-sales-orders", HTTP_METHODS.PATCH), // /:id/payment
    GENERATE_PAYMENT_QR_AGRI: new APIRouter("/inventory/agri-sales-orders/:id/generate-payment-qr", HTTP_METHODS.POST),
    UPDATE_AGRI_SALES_ORDER_PAYMENT_STATUS: new APIRouter("/inventory/agri-sales-orders", HTTP_METHODS.PATCH), // /:id/payment/:paymentIndex/status
    GET_AGRI_SALES_CUSTOMER_BY_MOBILE: new APIRouter("/inventory/agri-sales-orders/customer/:mobileNumber", HTTP_METHODS.GET),
    GET_AGRI_SALES_PENDING_PAYMENTS: new APIRouter("/inventory/agri-sales-pending-payments", HTTP_METHODS.GET),
    GET_AGRI_SALES_PENDING_PAYMENTS_COUNT: new APIRouter("/inventory/agri-sales-pending-payments/count", HTTP_METHODS.GET),
    GET_AGRI_SALES_OUTSTANDING_ANALYSIS: new APIRouter("/inventory/agri-sales-outstanding-analysis", HTTP_METHODS.GET),
    GET_AGRI_SALES_SALES_ANALYSIS: new APIRouter("/inventory/agri-sales-sales-analysis", HTTP_METHODS.GET),
    GET_AGRI_SALES_CUSTOMER_OUTSTANDING: new APIRouter("/inventory/agri-sales-customer-outstanding", HTTP_METHODS.GET),
    // Assignment (Admin assigns to sales person)
    GET_AGRI_SALES_ASSIGNED_ORDERS: new APIRouter("/inventory/agri-sales-orders/assigned", HTTP_METHODS.GET),
    ASSIGN_AGRI_SALES_ORDERS: new APIRouter("/inventory/agri-sales-orders/assign", HTTP_METHODS.PATCH),
    CANCEL_AGRI_SALES_ASSIGNMENT: new APIRouter("/inventory/agri-sales-orders", HTTP_METHODS.PATCH), // /:id/cancel-assignment
    // Dispatch
    GET_AGRI_SALES_ORDERS_FOR_DISPATCH: new APIRouter("/inventory/agri-sales-orders/dispatch/pending", HTTP_METHODS.GET),
    GET_AGRI_SALES_DISPATCHED_ORDERS: new APIRouter("/inventory/agri-sales-orders/dispatch/history", HTTP_METHODS.GET),
    DISPATCH_AGRI_SALES_ORDERS: new APIRouter("/inventory/agri-sales-orders/dispatch", HTTP_METHODS.PATCH),
    UPDATE_AGRI_SALES_DISPATCH_STATUS: new APIRouter("/inventory/agri-sales-orders", HTTP_METHODS.PATCH), // /:id/dispatch-status
    COMPLETE_AGRI_SALES_ORDERS: new APIRouter("/inventory/agri-sales-orders/complete", HTTP_METHODS.PATCH),
    // Sales Return (for sales person dispatched orders - NO stock impact)
    PROCESS_SALES_RETURN: new APIRouter("/inventory/agri-sales-orders/:id/sales-return", HTTP_METHODS.PATCH),
    GET_AGRI_SALES_ORDER_BATCH_SUMMARY: new APIRouter(
      "/inventory/agri-sales-orders/:id/batch-summary",
      HTTP_METHODS.GET
    ),
    GENERATE_AGRI_DELIVERY_CHALLAN_PDF: new APIRouter(
      "/inventory/agri-sales-orders/:id/delivery-challan-pdf",
      HTTP_METHODS.POST
    ),
    REQUEST_AGRI_SALES_RETURN: new APIRouter("/inventory/agri-sales-orders/returns/request", HTTP_METHODS.POST),
    LIST_AGRI_SALES_RETURN_REQUESTS: new APIRouter("/inventory/agri-sales-orders/returns", HTTP_METHODS.GET),
    GET_AGRI_MERCHANT_RETURNABLE_BATCHES: new APIRouter(
      "/inventory/agri-sales-orders/returns/merchant-batches",
      HTTP_METHODS.GET
    ),
    PROCESS_AGRI_MERCHANT_BATCH_RETURN: new APIRouter(
      "/inventory/agri-sales-orders/returns/merchant-batch-return",
      HTTP_METHODS.POST
    ),
    APPROVE_AGRI_SALES_RETURN_REQUEST: new APIRouter(
      "/inventory/agri-sales-orders/returns/:id/approve",
      HTTP_METHODS.PATCH
    ),
    REJECT_AGRI_SALES_RETURN_REQUEST: new APIRouter(
      "/inventory/agri-sales-orders/returns/:id/reject",
      HTTP_METHODS.PATCH
    ),
    GET_AGRI_SALES_RETURN_REQUESTS_BY_ORDER: new APIRouter(
      "/inventory/agri-sales-orders/returns/by-order/:orderId",
      HTTP_METHODS.GET
    ),
    DOWNLOAD_AGRI_SALES_RETURN_INVOICE: new APIRouter(
      "/inventory/agri-sales-orders/returns/:id/invoice",
      HTTP_METHODS.GET
    ),

    // Batches
    GET_ALL_BATCHES: new APIRouter("/inventory/batches", HTTP_METHODS.GET),
    GET_BATCH_BY_ID: new APIRouter("/inventory/batches", HTTP_METHODS.GET),
    CREATE_BATCH: new APIRouter("/inventory/batches", HTTP_METHODS.POST),
    UPDATE_BATCH: new APIRouter("/inventory/batches", HTTP_METHODS.PUT),
    DELETE_BATCH: new APIRouter("/inventory/batches", HTTP_METHODS.DEL),

    // Inwards
    GET_ALL_INWARDS: new APIRouter("/inventory/inwards", HTTP_METHODS.GET),
    GET_INWARD_BY_ID: new APIRouter("/inventory/inwards", HTTP_METHODS.GET),
    CREATE_INWARD: new APIRouter("/inventory/inwards", HTTP_METHODS.POST),
    UPDATE_INWARD: new APIRouter("/inventory/inwards", HTTP_METHODS.PUT),
    DELETE_INWARD: new APIRouter("/inventory/inwards", HTTP_METHODS.DEL),

    // Stock Adjustments
    GET_ALL_ADJUSTMENTS: new APIRouter("/inventory/adjustments", HTTP_METHODS.GET),
    CREATE_ADJUSTMENT: new APIRouter("/inventory/adjustments", HTTP_METHODS.POST),

    // Plant Product Mappings (Ready Plants Products)
    GET_ALL_PLANT_PRODUCT_MAPPINGS: new APIRouter("/plant-product-mappings", HTTP_METHODS.GET),
    GET_PLANT_PRODUCT_MAPPING_BY_ID: new APIRouter("/plant-product-mappings", HTTP_METHODS.GET),
    CREATE_PLANT_PRODUCT_MAPPING: new APIRouter("/plant-product-mappings", HTTP_METHODS.POST),
    UPDATE_PLANT_PRODUCT_MAPPING: new APIRouter("/plant-product-mappings", HTTP_METHODS.PUT),
    DELETE_PLANT_PRODUCT_MAPPING: new APIRouter("/plant-product-mappings", HTTP_METHODS.DEL),
    GET_MAPPINGS_BY_PLANT_SUBTYPE: new APIRouter("/plant-product-mappings/plant/:plantId/subtype/:subtypeId", HTTP_METHODS.GET),

    // Legacy endpoints (keeping for backward compatibility)
    ADD_INVENTORY: new APIRouter(
      "api/v2/inventory/createInventory",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    GET_INVENTORY: new APIRouter(
      "api/v2/inventory/getAllInventories",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    DELETE_INVENTORY: new APIRouter(
      "api/v2/inventory/deleteInventory",
      HTTP_METHODS.DEL,
      OFFLINE.PROFILE
    ),

    // Bucketing
    GET_BUCKETING: new APIRouter("/inventory/bucketing", HTTP_METHODS.GET)
  },
  STATS: {
    DASHBOARD_STATS: new APIRouter("api/v2/stats/dashboard", HTTP_METHODS.GET, OFFLINE.PROFILE)
  },
  MEDIA: {
    // if you want to upload a file with or without data
    UPLOAD: new APIRouter("/user/media/", HTTP_METHODS.POST),
    OCR_PROCESS: new APIRouter("/user/media/ocr", HTTP_METHODS.POST)
  },
  ADMIN: {
    ADD_ADMIN: new APIRouter("api/v2/admin/createAdmin", HTTP_METHODS.POST, OFFLINE.PROFILE),
    UPDATE_ADMIN: new APIRouter("api/v2/admin/updateAdmin", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    DELETE_ADMIN: new APIRouter("api/v2/admin/deleteAdmin", HTTP_METHODS.DEL, OFFLINE.PROFILE)
  },
  THIRD_PARTY: {
    // If the base url is different from default
    CHECK: new APICustomRouter("https://example.com", "/test", HTTP_METHODS.GET)
  },
  MAPS: {
    GET_DIRECTIONS: new APIRouter("/maps/directions", HTTP_METHODS.POST, OFFLINE.PROFILE),
  },
  EMPLOYEE: {
    ADD_EMPLOYEE: new APIRouter("/employee/createEmployee", HTTP_METHODS.POST, OFFLINE.PROFILE),
    ADD_EMPLOYEE_LOGIN: new APIRouter("user/createUser", HTTP_METHODS.POST, OFFLINE.PROFILE),

    GET_EMPLOYEE: new APIRouter("employee/getEmployees", HTTP_METHODS.GET, OFFLINE.PROFILE),
    DELETE_EMPLOYEE: new APIRouter("/employee/deleteEmployee", HTTP_METHODS.DEL, OFFLINE.PROFILE),
    UPDATE_EMPLOYEE: new APIRouter("/employee/updateEmployee", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    REQUIRE_PASSWORD_CHANGE: new APIRouter(
      "/employee/requirePasswordChange",
      HTTP_METHODS.PATCH,
      OFFLINE.PROFILE
    ),
    RESET_PASSWORD_TO_DEFAULT: new APIRouter(
      "/employee/resetPasswordToDefault",
      HTTP_METHODS.PATCH,
      OFFLINE.PROFILE
    )
  },
  FACE_ATTENDANCE: {
    GET_DEPARTMENTS: new APIRouter("/face-attendance/admin/departments", HTTP_METHODS.GET),
  },
  ATTENDANCE: {
    GET_DAILY: new APIRouter("/admin/attendance", HTTP_METHODS.GET),
    GET_DETAIL: new APIRouter("/admin/attendance/:id", HTTP_METHODS.GET),
    PATCH: new APIRouter("/admin/attendance/:id", HTTP_METHODS.PATCH),
    GET_ATTEMPTS: new APIRouter("/admin/attendance/attempts", HTTP_METHODS.GET),
    GET_FACE_STATUS: new APIRouter("/admin/attendance/face-registration-status", HTTP_METHODS.GET),
    GET_BRANCH_SUMMARY: new APIRouter("/admin/attendance/summary/branch", HTTP_METHODS.GET),
    GET_LATE_EARLY: new APIRouter("/admin/attendance/reports/late-early", HTTP_METHODS.GET),
    GET_BRANCH_LOCATIONS: new APIRouter("/admin/attendance/branch-locations", HTTP_METHODS.GET),
    SAVE_BRANCH_LOCATION: new APIRouter("/admin/attendance/branch-locations", HTTP_METHODS.POST),
    DELETE_BRANCH_LOCATION: new APIRouter("/admin/attendance/branch-locations/:id", HTTP_METHODS.DEL),
    RESET_FACE: new APIRouter("/admin/attendance/employees/:employeeId/face-profile", HTTP_METHODS.DEL),
    RESET_DEVICE: new APIRouter("/admin/attendance/employees/:employeeId/device", HTTP_METHODS.DEL),
    KIOSK_IDENTIFY: new APIRouter("/admin/attendance/kiosk/identify", HTTP_METHODS.POST),
    KIOSK_VERIFY_MARK: new APIRouter("/admin/attendance/kiosk/verify-and-mark", HTTP_METHODS.POST),
    KIOSK_REGISTER_FACE: new APIRouter("/admin/attendance/kiosk/register-face", HTTP_METHODS.POST),
    GET_TODAY_DASHBOARD: new APIRouter("/admin/attendance/today-dashboard", HTTP_METHODS.GET),
    GET_OFFICE_GROUPS: new APIRouter("/admin/attendance/office-groups", HTTP_METHODS.GET),
    CREATE_OFFICE_GROUP: new APIRouter("/admin/attendance/office-groups", HTTP_METHODS.POST),
    PATCH_OFFICE_GROUP: new APIRouter("/admin/attendance/office-groups/:id", HTTP_METHODS.PATCH),
  },
  ORDER: {
    GET_ORDERS: Object.assign(
      new APIRouter("/order/getOrders", HTTP_METHODS.GET, OFFLINE.PROFILE),
      { __autoAbort: true, __abortScope: "order-get-orders" }
    ),
    DASHBOARD_TAB_COUNTS: Object.assign(
      new APIRouter("/order/dashboard-tab-counts", HTTP_METHODS.GET, OFFLINE.PROFILE),
      { __autoAbort: true, __abortScope: "order-get-orders" }
    ),
    ADMIN_DASHBOARD_STATS: new APIRouter("/order/admin-dashboard-stats", HTTP_METHODS.GET, OFFLINE.PROFILE),
    ADMIN_DAILY_MIS: new APIRouter("/order/admin-daily-mis", HTTP_METHODS.GET, OFFLINE.PROFILE),
    ADMIN_MIS_SALES: new APIRouter("/order/admin-mis-sales", HTTP_METHODS.GET, OFFLINE.PROFILE),
    ADMIN_MIS_DEALER: new APIRouter("/order/admin-mis-dealer", HTTP_METHODS.GET, OFFLINE.PROFILE),
    ADMIN_MIS_DUE: new APIRouter("/order/admin-mis-due", HTTP_METHODS.GET, OFFLINE.PROFILE),
    ADMIN_MIS_ORDERS: new APIRouter("/order/admin-mis-orders", HTTP_METHODS.GET, OFFLINE.PROFILE),
    ADMIN_MIS_SALES_SHEET: new APIRouter("/order/admin-mis-sales-sheet", HTTP_METHODS.GET, OFFLINE.PROFILE),
    DELIVERY_REPORT_SUMMARY: new APIRouter(
      "/order/delivery-report/summary",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    DELIVERY_REPORT_ORDERS: new APIRouter(
      "/order/delivery-report/orders",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_ORDERS_SLOTS: Object.assign(
      new APIRouter("/order/getOrders", HTTP_METHODS.GET, OFFLINE.PROFILE),
      { __abortScope: "order-get-orders-slots" }
    ),
    GET_ORDERS_BY_STATUS: new APIRouter("/order/by-status", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_REMAINING_DISPATCH_AGGREGATE: new APIRouter(
      "/order/remaining-dispatch-aggregate",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_REMAINING_DISPATCH_ORDERS: new APIRouter(
      "/order/remaining-dispatch-orders",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_REMAINING_DISPATCH_MATRIX: new APIRouter(
      "/order/remaining-dispatch-matrix",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_REMAINING_DISPATCH_MATRIX_ORDERS: new APIRouter(
      "/order/remaining-dispatch-matrix-orders",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_PAYMENTS: new APIRouter("/order/payments", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_VILLAGES: new APIRouter("/order/villages", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_DISTRICTS: new APIRouter("/order/districts", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_TALUKAS: new APIRouter("/order/talukas", HTTP_METHODS.GET, OFFLINE.PROFILE),
    CREATE_DEALER_ORDER: new APIRouter("/order/dealer-order", HTTP_METHODS.POST, OFFLINE.PROFILE),
    UPDATE_ORDER: new APIRouter("/order/updateOrder", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    GENERATE_DELIVERY_CHALLAN_PDF: new APIRouter(
      "/order/:orderId/generate-delivery-challan-pdf",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    UPDATE_PAYMENT_STATUS: new APIRouter(
      "/order/updatePaymentStatus",
      HTTP_METHODS.PATCH,
      OFFLINE.PROFILE
    ),
    ADD_PAYMENT: new APIRouter("order/payment/:orderId", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    ADD_PAYMENTS_BATCH: new APIRouter("order/payments/:orderId", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GENERATE_PAYMENT_QR: new APIRouter("order/:orderId/generate-payment-qr", HTTP_METHODS.POST, OFFLINE.PROFILE),
    SEND_ACCEPTED_WHATSAPP: new APIRouter("order/:orderId/send-accepted-whatsapp", HTTP_METHODS.POST, OFFLINE.PROFILE),
    SEND_PLACED_WHATSAPP: new APIRouter("order/:orderId/send-placed-whatsapp", HTTP_METHODS.POST, OFFLINE.PROFILE),
    SEND_DISPATCH_WHATSAPP: new APIRouter("order/:orderId/send-dispatch-whatsapp", HTTP_METHODS.POST, OFFLINE.PROFILE),
    SEND_FARM_READY_WHATSAPP: new APIRouter(
      "order/:orderId/send-farm-ready-whatsapp",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    WHATSAPP_SEND_SELECTED: new APIRouter(
      "order/whatsapp/send-selected",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    WHATSAPP_OUTBOUND_LOG: new APIRouter(
      "order/whatsapp/outbound",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    WHATSAPP_CAMPAIGNS: new APIRouter(
      "order/whatsapp/campaigns",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    SPLIT_ORDER: new APIRouter("order/:orderId/split", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_ORDER_TIMELINE: new APIRouter("order/:orderId/timeline", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_CSV: new APIRouter("order/getCSV", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SLOTS: new APIRouter("slots/getslots", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_BUCKETING: new APIRouter("/order/bucketing", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SALESMEN_BUCKETING: new APIRouter("/order/salesmen-bucketing", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_ORDER_DISPATCH_DETAILS: new APIRouter(
      "/order/dispatch-details/:orderId",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    // Payment Activity Logs
    CREATE_PAYMENT_ACTIVITY: new APIRouter("/order/payment-activity", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_PAYMENT_ACTIVITIES: new APIRouter("/order/payment-activity", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_TODAYS_PAYMENT_ACTIVITIES: new APIRouter("/order/payment-activity/today", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_UNCLEARED_PAYMENTS: new APIRouter("/order/payments/uncleared", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PAYMENTS_FOR_APPROVAL: new APIRouter("/order/payments/for-approval", HTTP_METHODS.GET, OFFLINE.PROFILE),
    POST_RECONCILE_PAYMENTS: new APIRouter("/order/payments/reconcile", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_BULK_PAYMENTS: new APIRouter("/order/bulk-payments", HTTP_METHODS.GET, OFFLINE.PROFILE),
    POST_BULK_PAYMENT: new APIRouter("/order/bulk-payment", HTTP_METHODS.POST, OFFLINE.PROFILE),
    ACCEPT_BULK_PAYMENT: new APIRouter("/order/bulk-payment/:id/accept", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    /** Farmer plant orders — append-only ledger (parallel to Ram Agri customer ledger) */
    GET_FARMER_PLANT_LEDGER: new APIRouter("/order/farmer-plant-ledger", HTTP_METHODS.GET, OFFLINE.PROFILE),
    TRANSFER_FARMER_PLANT_ADVANCE: new APIRouter("/order/farmer-plant-ledger/transfer-advance", HTTP_METHODS.POST, OFFLINE.PROFILE),
    SEARCH_FARMERS_FOR_LEDGER_TRANSFER: new APIRouter("/order/farmer-plant-ledger/search-farmers", HTTP_METHODS.GET, OFFLINE.PROFILE),
    CREATE_FARMER_PLANT_LEDGER_MANUAL_ENTRY: new APIRouter("/order/farmer-plant-ledger/manual-entry", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_FARMER_PLANT_LEDGER_PARTIES: new APIRouter("/order/farmer-plant-ledger/parties", HTTP_METHODS.GET, OFFLINE.PROFILE),
    /** Farmer plant order — payments + ledger lines (picker for payment transfer) */
    GET_FARMER_PLANT_ORDER_DETAILS: new APIRouter(
      "/order/farmer-plant/:orderId/details",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_ORDER_PAYMENT_TRANSFER_CONTEXT: new APIRouter(
      "/order/farmer-plant-ledger/transfer-context",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    TRANSFER_FARMER_PLANT_ORDER_PAYMENT: new APIRouter(
      "/order/farmer-plant-ledger/transfer-order-payment",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    CREATE_FARMER_ORDER_TRANSFER_REQUEST: new APIRouter(
      "/order/farmer-plant-ledger/transfer-requests",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    GET_FARMER_ORDER_TRANSFER_REQUESTS: new APIRouter(
      "/order/farmer-plant-ledger/transfer-requests",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    APPROVE_FARMER_ORDER_TRANSFER_REQUEST: new APIRouter(
      "/order/farmer-plant-ledger/transfer-requests/:id/approve",
      HTTP_METHODS.PATCH,
      OFFLINE.PROFILE
    ),
    REJECT_FARMER_ORDER_TRANSFER_REQUEST: new APIRouter(
      "/order/farmer-plant-ledger/transfer-requests/:id/reject",
      HTTP_METHODS.PATCH,
      OFFLINE.PROFILE
    )
  },
  FINANCE: {
    TRIAL_BALANCE: new APIRouter("/finance/reports/trial-balance", HTTP_METHODS.GET, OFFLINE.PROFILE),
    PARTY_STATEMENT: new APIRouter("/finance/reports/party-statement", HTTP_METHODS.GET, OFFLINE.PROFILE),
    LEDGER_LINES: new APIRouter("/finance/reports/ledger-lines", HTTP_METHODS.GET, OFFLINE.PROFILE),
    CASHBOOK: new APIRouter("/finance/reports/cashbook", HTTP_METHODS.GET, OFFLINE.PROFILE),
    BANKBOOK: new APIRouter("/finance/reports/bankbook", HTTP_METHODS.GET, OFFLINE.PROFILE),
    SHADOW_RECONCILE: new APIRouter("/finance/reconcile/shadow", HTTP_METHODS.POST, OFFLINE.PROFILE),
    SEED_COA: new APIRouter("/finance/coa/seed", HTTP_METHODS.POST, OFFLINE.PROFILE),
    REPLAY_SUBLEDGERS: new APIRouter("/finance/replay/subledgers", HTTP_METHODS.POST, OFFLINE.PROFILE),
    REPLAY_SUBLEDGERS_STATUS: new APIRouter("/finance/replay/subledgers/status", HTTP_METHODS.GET, OFFLINE.PROFILE),
  },
  RATE_CHANGE_REQUEST: {
    GET_ALL: new APIRouter("/rate-change-requests", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_BY_TOKEN: new APIRouter("/rate-change-requests/by-token/:token", HTTP_METHODS.GET, OFFLINE.PROFILE),
    APPROVE_VIA_LINK: new APIRouter("/rate-change-requests/approve-via-link", HTTP_METHODS.POST, OFFLINE.PROFILE),
    APPROVE_VIA_UI: new APIRouter("/rate-change-requests/:id/approve", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    REJECT_VIA_UI: new APIRouter("/rate-change-requests/:id/reject", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
  },
  REWARDS: {
    LIST_PROGRAMS: new APIRouter("/rewards/programs", HTTP_METHODS.GET, OFFLINE.PROFILE),
    CREATE_PROGRAM: new APIRouter("/rewards/programs", HTTP_METHODS.POST, OFFLINE.PROFILE),
    UPDATE_PROGRAM: new APIRouter("/rewards/programs/:id", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    DELETE_PROGRAM: new APIRouter("/rewards/programs/:id", HTTP_METHODS.DEL, OFFLINE.PROFILE),
    GET_PARTICIPANTS: new APIRouter("/rewards/programs/:id/participants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    REFRESH_PROGRESS: new APIRouter("/rewards/programs/:id/refresh-progress", HTTP_METHODS.POST, OFFLINE.PROFILE),
    PATCH_PROGRESS: new APIRouter("/rewards/programs/:programId/progress/:userId", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    MY_PROGRAMS: new APIRouter("/rewards/my-programs", HTTP_METHODS.GET, OFFLINE.PROFILE),
  },
  COMMISSION: {
    GET_RATES: new APIRouter("/commission/rates", HTTP_METHODS.GET, OFFLINE.PROFILE),
    PATCH_RATE: new APIRouter("/commission/rates/:id", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    BULK_DEFAULT: new APIRouter("/commission/rates/bulk-default", HTTP_METHODS.POST, OFFLINE.PROFILE),
    SYNC_RATES: new APIRouter("/commission/rates/sync-from-plants", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_DEALER_ANALYSIS: new APIRouter(
      "/commission/dealers/:dealerId/analysis",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_SETTLEMENTS: new APIRouter(
      "/commission/dealers/:dealerId/settlements",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    SETTLE: new APIRouter("/commission/dealers/:dealerId/settle", HTTP_METHODS.POST, OFFLINE.PROFILE),
  },
  plantCms: {
    POST_NEWPLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.POST, OFFLINE.PROFILE),
    VALIDATE_EXCEL: new APIRouter("/excel/validate-excel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    IMPORT_EXCEL: new APIRouter("/excel/import-excel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_PLANTS: new APIRouter("/plantcms/plants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_PLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    DELETE_PLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.DEL, OFFLINE.PROFILE),
    UPDATE_SUBTYPE: new APIRouter("/plantcms/plants/:plantId/subtypes/:subtypeId", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    ADD_SUBTYPE: new APIRouter("/plantcms/plants/:plantId/subtypes", HTTP_METHODS.POST, OFFLINE.PROFILE),
  },
  excel: {
    VALIDATE_EXCEL: new APIRouter("/excel/validate-excel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    IMPORT_EXCEL: new APIRouter("/excel/import-excel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    IMPORT_ORDERS_WITH_PAYMENT: new APIRouter("/excel/import-orders-with-payment", HTTP_METHODS.POST, OFFLINE.PROFILE),
    RETRY_ERRORFUL_ORDERS: new APIRouter("/excel/retry-errorful-orders", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_ERRORFUL_ORDERS: new APIRouter("/excel/errorful-orders", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_UNPROCESSED_FILES: new APIRouter("/excel/unprocessed-files", HTTP_METHODS.GET, OFFLINE.PROFILE),
    DOWNLOAD_UNPROCESSED_EXCEL: new APIRouter("/excel/download-unprocessed", HTTP_METHODS.GET, OFFLINE.PROFILE)
  },

  slots: {
    GET_PLANTS: new APIRouter("/slots/get-plants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANTS_SUBTYPE: new APIRouter("/slots/subtyps", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANTS_SLOTS: new APIRouter("/slots/getslots", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_STOCK_ENTRY: new APIRouter("/slots/stock-entry", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SLOT_SECONDARY_SHED_BREAKDOWN: new APIRouter(
      "/slots/:slotId/secondary-shed-breakdown",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    RUN_PAST_DUE_ROLLOVER: new APIRouter(
      "/slots/past-due-rollover/run",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    GET_ROLL_EXPIRED_AVAILABLE_SOURCES: new APIRouter(
      "/slots/roll-expired-available/sources",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    POST_ROLL_EXPIRED_AVAILABLE: new APIRouter(
      "/slots/roll-expired-available",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    BULK_UPDATE_STOCK_ENTRY: new APIRouter(
      "/slots/stock-entry/bulk",
      HTTP_METHODS.PUT,
      OFFLINE.PROFILE
    ),
    GET_SIMPLE_SLOTS: new APIRouter("/slots/simple", HTTP_METHODS.GET, OFFLINE.PROFILE), // Fast endpoint for sowing
    GET_AVAILABILITY_OVERVIEW: new APIRouter(
      "/slots/availability-overview",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_TRANSFER_OPTIONS: new APIRouter(
      "/slots/transfer-options",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_SLOT_DETAILS: new APIRouter("/slots/:slotId/details", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_SLOT: new APIRouter("/slots", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    TRANSFER_PLANTS: new APIRouter("/slots/transfer", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_TRANSFER_CAPACITY_OPTIONS: new APIRouter("/slots/transfer-capacity-options", HTTP_METHODS.GET, OFFLINE.PROFILE),
    TRANSFER_CAPACITY: new APIRouter("/slots/transfer-capacity", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_ORDERS_TRANSFER_TARGETS: new APIRouter("/slots/orders-transfer-targets", HTTP_METHODS.GET, OFFLINE.PROFILE),
    TRANSFER_ORDERS: new APIRouter("/slots/transfer-orders", HTTP_METHODS.POST, OFFLINE.PROFILE),
    ADD_MANUAL_SLOT: new APIRouter("/slots/manual", HTTP_METHODS.POST, OFFLINE.PROFILE),
    DELETE_MANUAL_SLOT: new APIRouter("/slots/manual", HTTP_METHODS.DEL, OFFLINE.PROFILE),
    GET_STATS_SLOSTS: new APIRouter("/slots/farmreadyStats", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SALESPEOPLE: new APIRouter("/user/salespeople", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_SALESMEN_RESTRICTIONS: new APIRouter(
      "/salesmen-access",
      HTTP_METHODS.PUT,
      OFFLINE.PROFILE
    ),
    UPDATE_SLOT_BUFFER: new APIRouter("/slots/:slotId/buffer", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    RELEASE_BUFFER_PLANTS: new APIRouter("/slots", HTTP_METHODS.POST, OFFLINE.PROFILE),
    ADD_PLANTS_TO_CAPACITY: new APIRouter("/slots", HTTP_METHODS.POST, OFFLINE.PROFILE),
    CREATE_SLOTS_FOR_MULTIPLE_YEARS: new APIRouter(
      "/slots/create-multiple-years",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    CREATE_SLOTS_FOR_SUBTYPE: new APIRouter(
      "/slots/create-subtype",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    DELETE_ALL_SLOTS: new APIRouter("/slots/delete-all", HTTP_METHODS.DEL, OFFLINE.PROFILE)
  },
  VEHICLE: {
    CREATE_VEHICLE: new APIRouter("vehicles/create", HTTP_METHODS.POST),
    GET_VEHICLES: new APIRouter("vehicles/all", HTTP_METHODS.GET),
    GET_ACTIVE_VEHICLES: new APIRouter("vehicles/active", HTTP_METHODS.GET),
    GET_VEHICLE_BY_ID: new APIRouter("vehicles/get", HTTP_METHODS.GET),
    UPDATE_VEHICLE: new APIRouter("vehicles/update", HTTP_METHODS.PATCH),
    DELETE_VEHICLE: new APIRouter("vehicles/delete", HTTP_METHODS.DEL),
    BULK_UPDATE_VEHICLES: new APIRouter("vehicles/bulk-update", HTTP_METHODS.PATCH)
  },
  VEHICLE_OWNER: {
    CREATE: new APIRouter("vehicle-owners/create", HTTP_METHODS.POST),
    GET_ALL: new APIRouter("vehicle-owners/all", HTTP_METHODS.GET),
    GET_ACTIVE: new APIRouter("vehicle-owners/active", HTTP_METHODS.GET),
    UPDATE: new APIRouter("vehicle-owners/update", HTTP_METHODS.PATCH),
    DELETE: new APIRouter("vehicle-owners/delete", HTTP_METHODS.DEL)
  },
  VEHICLE_DRIVER: {
    CREATE: new APIRouter("vehicle-drivers/create", HTTP_METHODS.POST),
    GET_ALL: new APIRouter("vehicle-drivers/all", HTTP_METHODS.GET),
    GET_BY_OWNER: new APIRouter("vehicle-drivers/by-owner/:ownerId", HTTP_METHODS.GET),
    UPDATE: new APIRouter("vehicle-drivers/update", HTTP_METHODS.PATCH),
    DELETE: new APIRouter("vehicle-drivers/delete", HTTP_METHODS.DEL)
  },
  NURSERY_SITE: {
    LIST: new APIRouter("nursery-sites", HTTP_METHODS.GET),
    CREATE: new APIRouter("nursery-sites", HTTP_METHODS.POST),
    UPDATE: new APIRouter("nursery-sites/:id", HTTP_METHODS.PATCH),
    DELETE: new APIRouter("nursery-sites/:id", HTTP_METHODS.DEL)
  },
  TRIP: {
    CREATE_TRIP: new APIRouter("trips/create", HTTP_METHODS.POST),
    GET_TRIPS: new APIRouter("trips/all", HTTP_METHODS.GET),
    GET_TRIP_BY_ID: new APIRouter("trips/:id", HTTP_METHODS.GET),
    GET_TRIPS_BY_VEHICLE: new APIRouter("trips/vehicle/:vehicleId", HTTP_METHODS.GET),
    UPDATE_TRIP: new APIRouter("trips/update/:id", HTTP_METHODS.PATCH),
    DELETE_TRIP: new APIRouter("trips/:id", HTTP_METHODS.DEL)
  },
  FLEET: {
    GET_LEDGER: new APIRouter("fleet/ledger", HTTP_METHODS.GET),
    GET_LEDGER_DETAIL: new APIRouter("fleet/ledger/:dispatchId", HTTP_METHODS.GET)
  },
  SHADE: {
    CREATE_SHADE: new APIRouter("shade/create", HTTP_METHODS.POST),
    GET_SHADES: new APIRouter("shade/all", HTTP_METHODS.GET),
    UPDATE_SHADE: new APIRouter("shade/update", HTTP_METHODS.PATCH),
    TOGGLE_STATUS: new APIRouter("shade/toggle-status", HTTP_METHODS.PATCH)
  },
  TRAY: {
    CREATE_TRAY: new APIRouter("tray/create", HTTP_METHODS.POST),
    GET_TRAYS: new APIRouter("tray/all", HTTP_METHODS.GET),
    UPDATE_TRAY: new APIRouter("tray/update", HTTP_METHODS.PATCH),
    TOGGLE_STATUS: new APIRouter("tray/toggle-status", HTTP_METHODS.PATCH)
  },

  DISPATCHED: {
    GET_TRAYS: new APIRouter("dispatched", HTTP_METHODS.GET),
    GET_BY_ID: new APIRouter("dispatched/:id", HTTP_METHODS.GET),
    GENERATE_PDFS: new APIRouter("dispatched/:id/generate-pdfs", HTTP_METHODS.POST),
    ENSURE_DC_NUMBERS: new APIRouter(
      "dispatched/:id/ensure-delivery-challan-numbers",
      HTTP_METHODS.POST
    ),
    CREATE_TRAY: new APIRouter("dispatched", HTTP_METHODS.POST),
    DELETE_TRANSPORT: new APIRouter("dispatched/transport", HTTP_METHODS.DEL),
    UPDATE_COMPLETE: new APIRouter("dispatched/complete", HTTP_METHODS.PATCH),
    UPDATE_DISPATCH: new APIRouter("dispatched/:id", HTTP_METHODS.PATCH),
    ADD_ORDER_TO_DISPATCH: new APIRouter("dispatched/:id/add-order", HTTP_METHODS.PATCH),
    DETACH_ORDER: new APIRouter("dispatched/:id/detach-order", HTTP_METHODS.PATCH),
    REASSIGN_REFUSED: new APIRouter("dispatched/:id/reassign-refused", HTTP_METHODS.PATCH),
    GET_GIFT_PRODUCTS_IN_STOCK: new APIRouter("dispatched/gift-products-in-stock", HTTP_METHODS.GET),
    SYNC_ORDER_GIFTS: new APIRouter("dispatched/sync-order-gifts", HTTP_METHODS.POST),
    ASSIGN_ROUTE: new APIRouter("dispatched/assign-route", HTTP_METHODS.PATCH),
    BULK_MARK_READY: new APIRouter("dispatched/bulk-mark-ready", HTTP_METHODS.PATCH),
  },
  /** Global billable / non-billable DC and tax-invoice sequences. */
  INVOICE_SEQUENCE: {
    GET: new APIRouter("invoice-sequence", HTTP_METHODS.GET),
    PUT: new APIRouter("invoice-sequence", HTTP_METHODS.PUT),
  },
  READY_DISPATCH_GROUP: {
    SUGGEST: new APIRouter("ready-dispatch-groups/suggest", HTTP_METHODS.POST),
    CREATE: new APIRouter("ready-dispatch-groups", HTTP_METHODS.POST),
    GET_ALL: new APIRouter("ready-dispatch-groups", HTTP_METHODS.GET),
    GET_BY_ID: new APIRouter("ready-dispatch-groups/:id", HTTP_METHODS.GET),
    UPDATE: new APIRouter("ready-dispatch-groups/:id", HTTP_METHODS.PATCH),
    CONVERT_TO_DISPATCH: new APIRouter("ready-dispatch-groups/:id/convert-to-dispatch", HTTP_METHODS.POST),
  },
  CASHIER: {
    GET_ITAR_KHARCH_CATEGORIES: new APIRouter("/cms/itarKharchCategory", HTTP_METHODS.GET, OFFLINE.PROFILE),
    CREATE_ITAR_KHARCH_CATEGORY: new APIRouter("/cms/itarKharchCategory", HTTP_METHODS.POST, OFFLINE.PROFILE),
    CREATE_ITAR_KHARCH_BULK: new APIRouter("/itar-kharch/bulk", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_ITAR_KHARCH_LIST: new APIRouter("/itar-kharch", HTTP_METHODS.GET, OFFLINE.PROFILE),
  },
  BATCH: {
    CREATE_BATCH: new APIRouter("batch/create", HTTP_METHODS.POST),
    GET_BATCHES: new APIRouter("batch/all", HTTP_METHODS.GET),
    UPDATE_BATCH: new APIRouter("batch/update", HTTP_METHODS.PATCH),
    TOGGLE_STATUS: new APIRouter("batch/toggle-status", HTTP_METHODS.PATCH)
  },
  PLANT_OUTWARD: {
    ADD_LAB: new APIRouter("laboutward/batch/labs", HTTP_METHODS.POST),
    UPDATE_LAB: new APIRouter("batch/outward/lab", HTTP_METHODS.PUT),
    GET_OUTWARDS: new APIRouter("laboutward/outwards", HTTP_METHODS.GET),
    GET_BY_BATCH: new APIRouter("laboutward/batch/:batchId", HTTP_METHODS.GET),
    PRIMARY_MOBILE_DASHBOARD: new APIRouter(
      "laboutward/primary-mobile-dashboard",
      HTTP_METHODS.GET
    ),
    PRIMARY_INWARD_LINES: new APIRouter(
      "laboutward/primary-inward-lines",
      HTTP_METHODS.GET
    ),
    SECONDARY_MOBILE_DASHBOARD: new APIRouter(
      "laboutward/secondary-mobile-dashboard",
      HTTP_METHODS.GET
    ),
    ACCEPTED_LAB_LINES: new APIRouter("laboutward/accepted-lab-lines", HTTP_METHODS.GET),
    LAB_REVIEW: new APIRouter(
      "laboutward/batch/:batchId/lab/:labId/review",
      HTTP_METHODS.PATCH
    ),
    LAB_TO_PRIMARY_INWARD: new APIRouter(
      "laboutward/lab-to-primaryInward/:batchId",
      HTTP_METHODS.POST
    ),
    /** Alias — primary mobile (same handler as LAB_TO_PRIMARY_INWARD) */
    PRIMARY_LAB_TO_PRIMARY_INWARD: new APIRouter(
      "laboutward/primary/lab-to-primary-inward/:batchId",
      HTTP_METHODS.POST
    ),
    PRIMARY_INWARD_TO_OUTWARD: new APIRouter(
      "laboutward/primaryInward-to-primaryOutward/:batchId",
      HTTP_METHODS.POST
    ),
    PRIMARY_PRIMARY_INWARD_TO_OUTWARD: new APIRouter(
      "laboutward/primary/primary-inward-to-primary-outward/:batchId",
      HTTP_METHODS.POST
    ),
    PRIMARY_TO_SECONDARY: new APIRouter(
      "laboutward/primary-to-secondary/:batchId",
      HTTP_METHODS.POST
    ),
    /** Alias — secondary mobile (same handler as PRIMARY_TO_SECONDARY) */
    SECONDARY_FROM_PRIMARY_OUTWARD: new APIRouter(
      "laboutward/secondary/from-primary-outward/:batchId",
      HTTP_METHODS.POST
    ),
    SECONDARY_ACKNOWLEDGE_PRIMARY_OUTWARD: new APIRouter(
      "laboutward/secondary/acknowledge-primary-outward/:batchId/:primaryOutwardId",
      HTTP_METHODS.POST
    ),
    SECONDARY_PRIMARY_OUTWARD_MORTALITY: new APIRouter(
      "laboutward/secondary/primary-outward/:batchId/:primaryOutwardId/mortality",
      HTTP_METHODS.POST
    ),
    SECONDARY_PRIMARY_OUTWARD_SOWING_COMPLETE: new APIRouter(
      "laboutward/secondary/primary-outward/:batchId/:primaryOutwardId/sowing-complete",
      HTTP_METHODS.POST
    ),
    SECONDARY_INWARD_TO_OUTWARD: new APIRouter(
      "laboutward/secondaryInward-to-secondaryOutward/:batchId",
      HTTP_METHODS.POST
    ),
    /** Alias — secondary mobile (same handler) */
    SECONDARY_INWARD_TO_OUTWARD_NS: new APIRouter(
      "laboutward/secondary/secondary-inward-to-outward/:batchId",
      HTTP_METHODS.POST
    ),
    SECONDARY_INWARD_READINESS_BYPASS: new APIRouter(
      "laboutward/secondary/:batchId/secondary-inward/:secondaryInwardId/readiness-bypass",
      HTTP_METHODS.PATCH
    ),
    SECONDARY_ORDERS_READY_FOR_DISPATCH: new APIRouter(
      "laboutward/secondary/:batchId/orders-ready-for-dispatch",
      HTTP_METHODS.GET
    ),
    SECONDARY_VEHICLE_DISPATCHES: new APIRouter(
      "laboutward/secondary/vehicle-dispatches",
      HTTP_METHODS.GET
    ),
    SECONDARY_VEHICLE_DISPATCH_ALLOCATION: new APIRouter(
      "laboutward/secondary/vehicle-dispatch/:dispatchId/allocation-suggestions",
      HTTP_METHODS.GET
    ),
    SECONDARY_VEHICLE_SOW_READY_ENTRIES: new APIRouter(
      "laboutward/secondary/vehicle-dispatch/:dispatchId/sow-ready-entries",
      HTTP_METHODS.GET
    ),
    SECONDARY_SOW_READY_ENTRIES: new APIRouter(
      "laboutward/secondary/sow-ready-entries",
      HTTP_METHODS.GET
    ),
    PRIMARY_INWARD_FIFO_PREVIEW: new APIRouter(
      "laboutward/primary-inward-fifo-preview",
      HTTP_METHODS.POST
    ),
    PRIMARY_INWARD_BULK: new APIRouter("laboutward/primary-inward-bulk", HTTP_METHODS.POST),
    PRIMARY_INWARD_TO_OUTWARD_BATCH: new APIRouter(
      "laboutward/primary/:batchId/primary-inward-to-primary-outward-batch",
      HTTP_METHODS.POST
    ),
    PRIMARY_INWARD_READINESS_BYPASS: new APIRouter(
      "laboutward/primary/:batchId/primary-inward/:primaryInwardId/readiness-bypass",
      HTTP_METHODS.PATCH
    ),
    SECONDARY_BATCH_LAGWAD: new APIRouter(
      "laboutward/secondary/:batchId/batch-lagwad",
      HTTP_METHODS.POST
    ),
    SECONDARY_VEHICLE_LOAD_PREVIEW: new APIRouter(
      "laboutward/secondary/vehicle-dispatch/:dispatchId/load-preview",
      HTTP_METHODS.POST
    ),
    SECONDARY_VEHICLE_LOAD: new APIRouter(
      "laboutward/secondary/vehicle-dispatch/:dispatchId/load",
      HTTP_METHODS.POST
    ),
    SECONDARY_VEHICLE_UNLOAD: new APIRouter(
      "laboutward/secondary/vehicle-dispatch/:dispatchId/unload",
      HTTP_METHODS.POST
    ),
    SECONDARY_VEHICLE_LOADED_LINES: new APIRouter(
      "laboutward/secondary/vehicle-dispatch/:dispatchId/loaded-lines",
      HTTP_METHODS.GET
    ),
    SECONDARY_POLYHOUSE_STOCK: new APIRouter(
      "laboutward/secondary/polyhouse-stock",
      HTTP_METHODS.GET
    ),
    /** FIFO batch / secondary inward line for a shed — farmer dispatch form auto-fill */
    FARMER_DISPATCH_PICKUP_BATCH_SUGGESTIONS: new APIRouter(
      "laboutward/secondary/farmer-dispatch/pickup-batch-suggestions",
      HTTP_METHODS.GET
    ),
  },
  POLLY_HOUSE: {
    CREATE_HOUSE: new APIRouter("pollyhouse/create", HTTP_METHODS.POST),
    GET_HOUSES: new APIRouter("pollyhouse/all", HTTP_METHODS.GET),
    UPDATE_HOUSE: new APIRouter("pollyhouse/update", HTTP_METHODS.PATCH),
    TOGGLE_STATUS: new APIRouter("pollyhouse/toggle-status", HTTP_METHODS.PATCH)
  },
  STATS_SLOTS: {
    GET_HOUSES: new APIRouter("slots/stats", HTTP_METHODS.GET)
  },
  FARMER: {
    GET_FARMERS: new APIRouter("farmer/getFarmers", HTTP_METHODS.GET),
    GET_ALL_CONTACTS: new APIRouter("farmer/all-contacts", HTTP_METHODS.GET),
    GET_FILTER_OPTIONS: new APIRouter("farmer/filter-options", HTTP_METHODS.GET),
    GET_FARMER_BY_MOBILE: new APIRouter("farmer/getfarmer", HTTP_METHODS.GET),
    GET_WHATSAPP_HISTORY: new APIRouter("farmer/:id/whatsapp-history", HTTP_METHODS.GET),
    CREATE_FARMER: new APIRouter("farmer/createFarmer", HTTP_METHODS.POST),
    UPDATE_FARMER: new APIRouter("farmer/updateFarmer", HTTP_METHODS.PATCH),
    GET_INVALID_PHONE_FARMERS: new APIRouter("farmer/invalid-phones", HTTP_METHODS.GET),
    UPDATE_FARMER_PHONE: new APIRouter("farmer", HTTP_METHODS.PUT),
    CREATE_WHATSAPP_HISTORY: new APIRouter("farmer/whatsapp-history", HTTP_METHODS.POST),
    GET_FARMER_BY_ID: new APIRouter("farmer/get/:id", HTTP_METHODS.GET),
    GET_FARMER_ORDERS: new APIRouter("farmer/farmers/:farmerId/orders", HTTP_METHODS.GET),
  },
  FARMER_LIST: {
    GET_ALL_LISTS: new APIRouter("farmer-list", HTTP_METHODS.GET),
    GET_LIST_BY_ID: new APIRouter("farmer-list", HTTP_METHODS.GET),
    CREATE_LIST: new APIRouter("farmer-list", HTTP_METHODS.POST),
    UPDATE_LIST: new APIRouter("farmer-list", HTTP_METHODS.PATCH),
    ADD_FARMERS_TO_LIST: new APIRouter("farmer-list", HTTP_METHODS.POST),
    REMOVE_FARMERS_FROM_LIST: new APIRouter("farmer-list", HTTP_METHODS.POST),
    DELETE_LIST: new APIRouter("farmer-list", HTTP_METHODS.DELETE)
  },
  WHATSAPP_CONTACT_LIST: {
    GET_ALL: new APIRouter("whatsapp-contact-list", HTTP_METHODS.GET),
    GET_BY_ID: new APIRouter("whatsapp-contact-list", HTTP_METHODS.GET),
    CREATE: new APIRouter("whatsapp-contact-list", HTTP_METHODS.POST),
    UPDATE: new APIRouter("whatsapp-contact-list", HTTP_METHODS.PATCH),
    DELETE: new APIRouter("whatsapp-contact-list", HTTP_METHODS.DELETE)
  },
  LOCATION: {
    GET_ALL_LOCATIONS: new APIRouter("/location/all", HTTP_METHODS.GET),
    GET_STATES_ONLY: new APIRouter("/location/states-only", HTTP_METHODS.GET),
    GET_CASCADING_LOCATION: new APIRouter("/location/cascade", HTTP_METHODS.POST),
    GET_LOCATION_STATS: new APIRouter("/location/stats", HTTP_METHODS.GET),
    // Legacy endpoints for backward compatibility (if needed)
    GET_STATES: new APIRouter("/location/states", HTTP_METHODS.GET),
    GET_DISTRICTS: new APIRouter("/location/districts", HTTP_METHODS.GET),
    GET_SUBDISTRICTS: new APIRouter("/location/subdistricts", HTTP_METHODS.GET),
    GET_VILLAGES: new APIRouter("/location/getVillages", HTTP_METHODS.GET)
  },
  STATE: {
    GET_ALL_STATES: new APIRouter("/state/all", HTTP_METHODS.GET),
    GET_STATES: new APIRouter("/state", HTTP_METHODS.GET),
    CREATE_STATE: new APIRouter("/state", HTTP_METHODS.POST),
    UPDATE_STATE: new APIRouter("/state", HTTP_METHODS.PATCH),
    DELETE_STATE: new APIRouter("/state", HTTP_METHODS.DEL),
    GET_DISTRICTS_BY_STATE: new APIRouter("/state", HTTP_METHODS.GET),
    GET_TALUKAS_BY_STATE_DISTRICT: new APIRouter("/state", HTTP_METHODS.GET),
    GET_VILLAGES_BY_STATE_DISTRICT_TALUKA: new APIRouter("/state", HTTP_METHODS.GET),
    ADD_DISTRICT_TO_STATE: new APIRouter("/state", HTTP_METHODS.POST),
    ADD_TALUKA_TO_DISTRICT: new APIRouter("/state", HTTP_METHODS.POST),
    ADD_VILLAGE_TO_TALUKA: new APIRouter("/state", HTTP_METHODS.POST),
    GET_LOCATION_HIERARCHY: new APIRouter("/state", HTTP_METHODS.GET)
  },
  OLD_SALES: {
    GET_FILTERS: new APIRouter("/old-sales/filters", HTTP_METHODS.GET),
    GET_FILTER_OPTIONS: new APIRouter("/old-sales/filter-options", HTTP_METHODS.GET),
    GET_ANALYTICS: new APIRouter("/old-sales/analytics", HTTP_METHODS.GET),
    GET_RECORDS: new APIRouter("/old-sales/records", HTTP_METHODS.GET),
    EXPORT_CSV: new APIRouter("/old-sales/export", HTTP_METHODS.GET),
    GET_SUGGESTIONS: new APIRouter("/old-sales/suggestions", HTTP_METHODS.GET),
    NORMALIZE: new APIRouter("/old-sales/normalize", HTTP_METHODS.PATCH),
    GET_CHANGES: new APIRouter("/old-sales/changes", HTTP_METHODS.GET),
    GET_CASE_MISMATCHES: new APIRouter("/old-sales/case-mismatches", HTTP_METHODS.GET),
    NORMALIZE_CASE: new APIRouter("/old-sales/normalize-case", HTTP_METHODS.PATCH),
    GET_GEO_SUMMARY: new APIRouter("/old-sales/geo-summary", HTTP_METHODS.GET),
    GET_REPEAT_CUSTOMERS: new APIRouter("/old-sales/repeat-customers", HTTP_METHODS.GET),
    GET_UNIQUE_CUSTOMERS: new APIRouter("/old-sales/unique-customers", HTTP_METHODS.GET),
    EXPORT_FARMERS: new APIRouter("/old-sales/export-farmers", HTTP_METHODS.GET)
  },
  SLOTS: {
    GET_SLOTS: new APIRouter("slots/getslots", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANT_NAMES: new APIRouter("slots/plant-names", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SUBTYPES_BY_PLANT: new APIRouter(
      "slots/subtypes-by-plant",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_SLOTS_BY_PLANT_SUBTYPE: new APIRouter(
      "slots/slots-by-plant-subtype",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_SLOT_DETAILS: new APIRouter(
      "slots/slot-details/:slotId",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_SLOT_TRAIL: new APIRouter("slot-trail/:slotId", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_SLOT_BUFFER: new APIRouter(
      "slots/update-slot-buffer/:slotId",
      HTTP_METHODS.PUT,
      OFFLINE.PROFILE
    )
  },
  sowing: {
    CREATE_SOWING: new APIRouter("/sowing", HTTP_METHODS.POST, OFFLINE.PROFILE),
    CREATE_MULTIPLE_SOWINGS: new APIRouter("/sowing/multiple", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_SOWINGS: new APIRouter("/sowing", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SOWING_BY_ID: new APIRouter("/sowing/:id", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_OFFICE_SOWED: new APIRouter("/sowing/:id/office-sowed", HTTP_METHODS.POST, OFFLINE.PROFILE),
    UPDATE_PRIMARY_SOWED: new APIRouter("/sowing/:id/primary-sowed", HTTP_METHODS.POST, OFFLINE.PROFILE),
    UPDATE_HARVEST: new APIRouter("/sowing/:id/harvest", HTTP_METHODS.POST, OFFLINE.PROFILE),
    // NEW APIs with plant selection (mandatory)
    GET_PLANT_REMINDERS: new APIRouter("/sowing/plant-reminders", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANT_ALERTS: new APIRouter("/sowing/plant-alerts", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANT_AVAILABILITY: new APIRouter("/sowing/plant-availability", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_ALL_PLANTS_AVAILABILITY: new APIRouter("/sowing/all-plants-availability", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANTS_GAP_SUMMARY: new APIRouter("/sowing/plants-gap-summary", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SLOT_ORDERS_SUMMARY: new APIRouter("/sowing/slot-orders/:slotId", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_TODAY_SOWING_CARDS: new APIRouter("/sowing/today-sowing-cards", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_TODAY_SOWING_CARDS_LITE: new APIRouter("/sowing/today-sowing-cards-lite", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_ORDER_WISE_SOWING: new APIRouter("/sowing/order-wise", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SOWING_COMPLETIONS: new APIRouter("/sowing/completions", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_DELIVERY_VS_READY: new APIRouter("/sowing/analytics/delivery-vs-ready", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_ADMIN_DIRECT_SOW_ORDERS: new APIRouter("/sowing/admin-direct-sow/orders", HTTP_METHODS.GET, OFFLINE.PROFILE),
    SUBMIT_ADMIN_DIRECT_SOW: new APIRouter("/sowing/admin-direct-sow", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_ORDER_SLOT_EXCESS: new APIRouter("/sowing/order/:orderId/slot-excess", HTTP_METHODS.GET, OFFLINE.PROFILE),
    COMPLETE_ORDER_FROM_EXCESS: new APIRouter("/sowing/order/:orderId/complete-from-excess", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_SLOT_COVERABLE_ORDERS: new APIRouter("/sowing/slot/:slotId/coverable-orders", HTTP_METHODS.GET, OFFLINE.PROFILE),
    ALLOCATE_SLOT_TO_ORDERS: new APIRouter("/sowing/slot/:slotId/allocate-to-orders", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_SLOT_TRANSFER_TARGETS: new APIRouter("/sowing/slot/:slotId/transfer-targets", HTTP_METHODS.GET, OFFLINE.PROFILE),
    TRANSFER_SLOT_TO_SLOT: new APIRouter("/sowing/slot/:fromSlotId/transfer-to-slot", HTTP_METHODS.POST, OFFLINE.PROFILE),
    COMPLETE_SOWING_REQUEST: new APIRouter("/sowing/request/:requestId/complete-sow", HTTP_METHODS.POST, OFFLINE.PROFILE),
    EDIT_SOW_ENTRY: new APIRouter("/sowing/request/:requestId/sow-entry", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    GET_ISSUED_SOWING_QUEUE: new APIRouter("/sowing/request/issued-queue", HTTP_METHODS.GET, OFFLINE.PROFILE),
    CREATE_RAISING_INTAKE: new APIRouter("/sowing/raising/intake", HTTP_METHODS.POST, OFFLINE.PROFILE),
    UPDATE_RAISING_INTAKE: new APIRouter("/sowing/raising/intake/:id", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    GET_RAISING_AVAILABLE: new APIRouter("/sowing/raising/available", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_RAISING_PENDING_ORDERS: new APIRouter("/sowing/raising/pending-orders", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_RAISING_BY_ORDER: new APIRouter("/sowing/raising/by-order/:orderId", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_RAISING_INTAKE: new APIRouter("/sowing/raising/:id", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_EASY_30_DAYS: new APIRouter("/sowing/easy-30-days", HTTP_METHODS.GET, OFFLINE.PROFILE),
    BULK_UPDATE_FUTURE_READY_DAYS: new APIRouter("/sowing/easy-30-days/ready-days", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_SOWING_INSIGHTS_RECORDS: new APIRouter("/sowing/insights/records", HTTP_METHODS.GET, OFFLINE.PROFILE),
    SEND_SOWING_REMINDERS_WHATSAPP: new APIRouter("/sowing/whatsapp/reminders", HTTP_METHODS.POST, OFFLINE.PROFILE),
    // Sowing Request APIs
    CREATE_SOWING_REQUEST: new APIRouter("/sowing/request/create", HTTP_METHODS.POST, OFFLINE.PROFILE),
    CHECK_REQUEST_EXISTS: new APIRouter("/sowing/request/check", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_ALL_SOWING_REQUESTS: new APIRouter("/sowing/request/all", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PENDING_SOWING_REQUESTS: new APIRouter("/sowing/request/pending", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_ACTIVE_SOWING_REQUESTS: new APIRouter("/sowing/request/active", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SOWING_REQUEST_BY_ID: new APIRouter("/sowing/request/:id", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SOWING_REQUEST_STATUS: new APIRouter("/sowing/request/:requestId/status", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_SOWING_REQUEST: new APIRouter("/sowing/request/:id", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    ISSUE_STOCK_FROM_REQUEST: new APIRouter("/sowing/request/:id/issue", HTTP_METHODS.POST, OFFLINE.PROFILE),
    MARK_REQUEST_ISSUED: new APIRouter("/sowing/request/:requestId/mark-issued", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    UPDATE_SOWING_PROGRESS: new APIRouter("/sowing/request/:requestId/update-progress", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    RECALCULATE_SOWING_REMAINING: new APIRouter("/sowing/request/:requestId/recalculate", HTTP_METHODS.POST, OFFLINE.PROFILE),
    REJECT_SOWING_REQUEST: new APIRouter("/sowing/request/:id/reject", HTTP_METHODS.POST, OFFLINE.PROFILE),
    CANCEL_SOWING_REQUEST: new APIRouter("/sowing/request/:id/cancel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    CANCEL_SOWING_AND_REVERT: new APIRouter("/sowing/request/:requestId/cancel-and-revert", HTTP_METHODS.POST, OFFLINE.PROFILE),
    CANCEL_ALL_SOWING_REQUESTS: new APIRouter("/sowing/request/cancel-all", HTTP_METHODS.POST, OFFLINE.PROFILE),
    // Excessive Sowing APIs
    CREATE_EXCESSIVE_REQUEST: new APIRouter("/sowing/excessive/create-request", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_EXCESSIVE_AVAILABLE_PLANTS: new APIRouter("/sowing/excessive/available-plants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    CHECK_EXCESSIVE_CARD: new APIRouter("/sowing/excessive/check-card/:plantId/:subtypeId", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_EXCESSIVE_DIAGNOSTIC: new APIRouter("/sowing/excessive/diagnostic", HTTP_METHODS.GET, OFFLINE.PROFILE),
    // OLD APIs - DEPRECATED (will be removed)
    // GET_REMINDERS: new APIRouter("/sowing/reminders", HTTP_METHODS.GET, OFFLINE.PROFILE),
    // GET_ALERTS: new APIRouter("/sowing/alerts", HTTP_METHODS.GET, OFFLINE.PROFILE),
    // GET_SOWING_ALERTS_BY_START: new APIRouter("/sowing/sowing-alerts", HTTP_METHODS.GET, OFFLINE.PROFILE),
    // GET_TODAY_SOWING_SUMMARY: new APIRouter("/sowing/sowing-alerts/today", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_STATS: new APIRouter("/sowing/stats", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_SOWING: new APIRouter("/sowing/:id", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    DELETE_SOWING: new APIRouter("/sowing/:id", HTTP_METHODS.DEL, OFFLINE.PROFILE),
    DELETE_ALL_SOWINGS: new APIRouter("/sowing", HTTP_METHODS.DEL, OFFLINE.PROFILE)
  },
  WHATSAPP: {
    GET_MESSAGE_TEMPLATES: new APIRouter("/{tenantId}/api/v1/getMessageTemplates", HTTP_METHODS.GET),
    SEND_MESSAGE: new APIRouter("/{tenantId}/api/v1/sendMessage", HTTP_METHODS.POST),
    CREATE_TEMPLATE: new APIRouter("/{tenantId}/api/v1/createTemplate", HTTP_METHODS.POST),
    UPDATE_TEMPLATE: new APIRouter("/{tenantId}/api/v1/updateTemplate", HTTP_METHODS.PUT),
    DELETE_TEMPLATE: new APIRouter("/{tenantId}/api/v1/deleteTemplate", HTTP_METHODS.DELETE)
  },
  WHATSAPP_BROADCAST: {
    GET_ALL: new APIRouter("whatsapp-broadcast", HTTP_METHODS.GET),
    GET_BY_ID: new APIRouter("whatsapp-broadcast/:id", HTTP_METHODS.GET)
  },
  WHATSAPP_ALERT: {
    SEND_ADMIN_DAILY_MIS: new APIRouter(
      "/whatsapp-alert/engine/admin-daily-mis",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
  },
  // WATI proxy (backend-only; token in env). Use these for all WATI operations.
  WATI: {
    GET_TEMPLATES: new APIRouter("wati/templates", HTTP_METHODS.GET),
    TEST: new APIRouter("wati/test", HTTP_METHODS.GET),
    GET_CONTACTS: new APIRouter("wati/contacts", HTTP_METHODS.GET),
    SEND_TEMPLATE: new APIRouter("wati/send-template", HTTP_METHODS.POST),
    SEND_TEMPLATE_MESSAGES: new APIRouter("wati/send-template-messages", HTTP_METHODS.POST),
    SEND_MESSAGE: new APIRouter("wati/send-message", HTTP_METHODS.POST)
  },
  EXOTEL: {
    SEND_SMS: new APIRouter("exotel/send", HTTP_METHODS.POST),
    TEST: new APIRouter("exotel/test", HTTP_METHODS.GET)
  },
  VOICE_FEEDBACK: {
    LIST_CALLS: new APIRouter("voice-feedback/calls", HTTP_METHODS.GET),
    GET_CALL: new APIRouter("voice-feedback/calls/:id", HTTP_METHODS.GET),
    GET_TRANSCRIPT: new APIRouter("voice-feedback/calls/:id/transcript", HTTP_METHODS.GET),
    GET_EVENTS: new APIRouter("voice-feedback/calls/:id/events", HTTP_METHODS.GET),
    DASHBOARD_SUMMARY: new APIRouter("voice-feedback/dashboard/summary", HTTP_METHODS.GET),
    START_CALL: new APIRouter("voice-feedback/calls/start/:id", HTTP_METHODS.POST),
    RESOLVE_CALLBACK: new APIRouter("voice-feedback/calls/:id/resolve-callback", HTTP_METHODS.POST)
  },
  CALL_ASSIGNMENT: {
    GET_FILTER_VALUES: new APIRouter("call-assignment/filter-values", HTTP_METHODS.GET),
    GET_COMBINED: new APIRouter("call-assignment/combined", HTTP_METHODS.GET),
    ASSIGN_LIST: new APIRouter("call-assignment/assign", HTTP_METHODS.POST),
    GET_LISTS: new APIRouter("call-assignment/lists", HTTP_METHODS.GET),
    GET_PROGRESS: new APIRouter("call-assignment/lists/progress", HTTP_METHODS.GET),
    GET_LIST_BY_ID: new APIRouter("call-assignment/lists", HTTP_METHODS.GET),
    GET_LIST_MOBILE: new APIRouter("call-assignment/lists", HTTP_METHODS.GET),
    ADD_CALL_LOG: new APIRouter("call-assignment/lists", HTTP_METHODS.POST),
  },
  CALL_LIST_PUBLIC: {
    GET_LIST: (id, token) => `/api/v1/call-list/${id}/${token}`,
    ADD_CALL_LOG: (id, token) => `/api/v1/call-list/${id}/${token}/call-log`,
  },
  PUBLIC_LINKS: {
    CREATE_LINK: new APIRouter("/public-links/links", HTTP_METHODS.POST),
    GET_LINKS: new APIRouter("/public-links/links", HTTP_METHODS.GET),
    GET_LINK_BY_ID: new APIRouter("/public-links/links", HTTP_METHODS.GET),
    UPDATE_LINK: new APIRouter("/public-links/links", HTTP_METHODS.PATCH),
    GET_PUBLIC_CONFIG: new APIRouter("/public-links/config", HTTP_METHODS.GET),
    CREATE_LEAD: new APIRouter("/public-links/leads", HTTP_METHODS.POST),
    GET_LEADS: new APIRouter("/public-links/links/leads", HTTP_METHODS.GET),
    GET_LEADS_BY_LINK: (linkId) => `/api/v1/public-links/links/leads/${linkId}`,
    GET_ALL_LEADS: new APIRouter("/public-links/links/all-leads", HTTP_METHODS.GET),
    GET_FILTER_OPTIONS: new APIRouter("/public-links/filter-options", HTTP_METHODS.GET)
  },
  BACKUP: {
    CREATE: new APIRouter("/backup/create", HTTP_METHODS.POST),
    LIST: new APIRouter("/backup/list", HTTP_METHODS.GET),
    DOWNLOAD: new APIRouter("/backup/download", HTTP_METHODS.GET)
  }
}
