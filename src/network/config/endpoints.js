// List all endpoints here
import { OFFLINE } from "network/offline"
import { HTTP_METHODS, APIRouter, APIWithOfflineRouter, APICustomRouter } from "../core/httpHelper"

// ******************
// Endpoint class takes 3 params in constructor ==> "endpoint", "http-method", "API-version"
// By default, version is set to v2
// ******************
export const API = {
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
    )
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
  PAYMENTS: {
    GET_PAYMENTS: new APIRouter("api/v2/other/getPayments", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PAYMENTS_CSV: new APIRouter("api/v2/other/getCSV", HTTP_METHODS.GET, OFFLINE.PROFILE)
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
    GET_FOLLOW_UP: new APIRouter("api/v2/followup/getFollowup", HTTP_METHODS.GET, OFFLINE.PROFILE)
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

    // Categories
    GET_ALL_CATEGORIES: new APIRouter("/inventory/categories", HTTP_METHODS.GET),
    GET_CATEGORY_BY_ID: new APIRouter("/inventory/categories", HTTP_METHODS.GET),
    CREATE_CATEGORY: new APIRouter("/inventory/categories", HTTP_METHODS.POST),
    UPDATE_CATEGORY: new APIRouter("/inventory/categories", HTTP_METHODS.PUT),
    DELETE_CATEGORY: new APIRouter("/inventory/categories", HTTP_METHODS.DEL),

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
    GET_MERCHANT_BY_ID: new APIRouter("/inventory/merchants", HTTP_METHODS.GET),
    GET_MERCHANT_LEDGER: new APIRouter("/inventory/merchants/:id/ledger", HTTP_METHODS.GET),
    CREATE_MERCHANT: new APIRouter("/inventory/merchants", HTTP_METHODS.POST),
    UPDATE_MERCHANT: new APIRouter("/inventory/merchants", HTTP_METHODS.PUT),
    DELETE_MERCHANT: new APIRouter("/inventory/merchants", HTTP_METHODS.DEL),

    // Purchase Orders
    GET_ALL_PURCHASE_ORDERS: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.GET),
    GET_PURCHASE_ORDER_BY_ID: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.GET),
    CREATE_PURCHASE_ORDER: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.POST),
    UPDATE_PURCHASE_ORDER: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.PUT),
    DELETE_PURCHASE_ORDER: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.DEL),
    APPROVE_PURCHASE_ORDER: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.POST), // /:id/approve
    CANCEL_PURCHASE_ORDER: new APIRouter("/inventory/purchase-orders", HTTP_METHODS.POST), // /:id/cancel

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
    UPLOAD: new APIRouter("/user/media/", HTTP_METHODS.POST)
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
  EMPLOYEE: {
    ADD_EMPLOYEE: new APIRouter("/employee/createEmployee", HTTP_METHODS.POST, OFFLINE.PROFILE),
    ADD_EMPLOYEE_LOGIN: new APIRouter("user/createUser", HTTP_METHODS.POST, OFFLINE.PROFILE),

    GET_EMPLOYEE: new APIRouter("employee/getEmployees", HTTP_METHODS.GET, OFFLINE.PROFILE),
    DELETE_EMPLOYEE: new APIRouter("/employee/deleteEmployee", HTTP_METHODS.DEL, OFFLINE.PROFILE),
    UPDATE_EMPLOYEE: new APIRouter("/employee/updateEmployee", HTTP_METHODS.PATCH, OFFLINE.PROFILE)
  },
  ORDER: {
    GET_ORDERS: new APIRouter("/order/getOrders", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_ORDERS_SLOTS: new APIRouter("/order/getOrders", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_ORDERS_BY_STATUS: new APIRouter("/order/by-status", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PAYMENTS: new APIRouter("/order/payments", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_VILLAGES: new APIRouter("/order/villages", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_DISTRICTS: new APIRouter("/order/districts", HTTP_METHODS.GET, OFFLINE.PROFILE),
    CREATE_DEALER_ORDER: new APIRouter("/order/dealer-order", HTTP_METHODS.POST, OFFLINE.PROFILE),
    UPDATE_ORDER: new APIRouter("/order/updateOrder", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    UPDATE_PAYMENT_STATUS: new APIRouter(
      "/order/updatePaymentStatus",
      HTTP_METHODS.PATCH,
      OFFLINE.PROFILE
    ),
    ADD_PAYMENT: new APIRouter("order/payment/:orderId", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    GET_CSV: new APIRouter("order/getCSV", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SLOTS: new APIRouter("slots/getslots", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_BUCKETING: new APIRouter("/order/bucketing", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SALESMEN_BUCKETING: new APIRouter("/order/salesmen-bucketing", HTTP_METHODS.GET, OFFLINE.PROFILE)
  },
  plantCms: {
    POST_NEWPLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.POST, OFFLINE.PROFILE),
    VALIDATE_EXCEL: new APIRouter("/excel/validate-excel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    IMPORT_EXCEL: new APIRouter("/excel/import-excel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_PLANTS: new APIRouter("/plantcms/plants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_PLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    DELETE_PLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.DEL, OFFLINE.PROFILE)
  },
  excel: {
    VALIDATE_EXCEL: new APIRouter("/excel/validate-excel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    IMPORT_EXCEL: new APIRouter("/excel/import-excel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_UNPROCESSED_FILES: new APIRouter("/excel/unprocessed-files", HTTP_METHODS.GET, OFFLINE.PROFILE),
    DOWNLOAD_UNPROCESSED_EXCEL: new APIRouter("/excel/download-unprocessed", HTTP_METHODS.GET, OFFLINE.PROFILE)
  },

  slots: {
    GET_PLANTS: new APIRouter("/slots/get-plants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANTS_SUBTYPE: new APIRouter("/slots/subtyps", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANTS_SLOTS: new APIRouter("/slots/getslots", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SIMPLE_SLOTS: new APIRouter("/slots/simple", HTTP_METHODS.GET, OFFLINE.PROFILE), // Fast endpoint for sowing
    GET_TRANSFER_OPTIONS: new APIRouter(
      "/slots/transfer-options",
      HTTP_METHODS.GET,
      OFFLINE.PROFILE
    ),
    GET_SLOT_DETAILS: new APIRouter("/slots/:slotId/details", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_SLOT: new APIRouter("/slots", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    TRANSFER_PLANTS: new APIRouter("/slots/transfer", HTTP_METHODS.POST, OFFLINE.PROFILE),
    ADD_MANUAL_SLOT: new APIRouter("/slots/manual", HTTP_METHODS.POST, OFFLINE.PROFILE),
    DELETE_MANUAL_SLOT: new APIRouter("/slots/manual", HTTP_METHODS.DEL, OFFLINE.PROFILE),
    GET_STATS_SLOSTS: new APIRouter("/slots/farmreadyStats", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SALESPEOPLE: new APIRouter("/user/salespeople", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_SALESMEN_RESTRICTIONS: new APIRouter(
      "/salesmen-access",
      HTTP_METHODS.PUT,
      OFFLINE.PROFILE
    ),
    UPDATE_SLOT_BUFFER: new APIRouter("/slots/buffer", HTTP_METHODS.PUT, OFFLINE.PROFILE),
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
    CREATE_TRAY: new APIRouter("dispatched", HTTP_METHODS.POST),
    DELETE_TRANSPORT: new APIRouter("dispatched/transport", HTTP_METHODS.DEL),
    UPDATE_COMPLETE: new APIRouter("dispatched/complete", HTTP_METHODS.PATCH)
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
    GET_OUTWARDS: new APIRouter("laboutward/outwards", HTTP_METHODS.GET)
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
  DATA: {
    CREATE_BACKUP: new APIRouter("backup/generateBackup", HTTP_METHODS.GET),
    SAVE_BACKUP: new APIRouter("backup/saveBackup", HTTP_METHODS.POST),
    IMPORT_BACKUP: new APIRouter("backup/importBackup", HTTP_METHODS.POST)
  },
  FARMER: {
    GET_FARMERS: new APIRouter("farmer/getFarmers", HTTP_METHODS.GET),
    GET_FARMER_BY_MOBILE: new APIRouter("farmer/getfarmer", HTTP_METHODS.GET),
    CREATE_FARMER: new APIRouter("farmer/createFarmer", HTTP_METHODS.POST),
    UPDATE_FARMER: new APIRouter("farmer/updateFarmer", HTTP_METHODS.PATCH),
    GET_INVALID_PHONE_FARMERS: new APIRouter("farmer/invalid-phones", HTTP_METHODS.GET),
    UPDATE_FARMER_PHONE: new APIRouter("farmer", HTTP_METHODS.PUT)
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
    CANCEL_ALL_SOWING_REQUESTS: new APIRouter("/sowing/request/cancel-all", HTTP_METHODS.POST, OFFLINE.PROFILE),
    // Excessive Sowing APIs
    CREATE_EXCESSIVE_REQUEST: new APIRouter("/sowing/excessive/create-request", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_EXCESSIVE_AVAILABLE_PLANTS: new APIRouter("/sowing/excessive/available-plants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    CHECK_EXCESSIVE_CARD: new APIRouter("/sowing/excessive/check-card/:plantId/:subtypeId", HTTP_METHODS.GET, OFFLINE.PROFILE),
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
  PUBLIC_LINKS: {
    CREATE_LINK: new APIRouter("/public-links/links", HTTP_METHODS.POST),
    GET_LINKS: new APIRouter("/public-links/links", HTTP_METHODS.GET),
    GET_LINK_BY_ID: new APIRouter("/public-links/links", HTTP_METHODS.GET),
    UPDATE_LINK: new APIRouter("/public-links/links", HTTP_METHODS.PATCH),
    GET_PUBLIC_CONFIG: new APIRouter("/public-links/config", HTTP_METHODS.GET),
    CREATE_LEAD: new APIRouter("/public-links/leads", HTTP_METHODS.POST),
    GET_LEADS: new APIRouter("/public-links/links/leads", HTTP_METHODS.GET)
  }
}
