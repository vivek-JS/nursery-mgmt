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
    GET_DEALERS_STATS: new APIRouter("/user/dealerssss/stats", HTTP_METHODS.GET),
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

    // Products
    GET_ALL_PRODUCTS: new APIRouter("/inventory/products", HTTP_METHODS.GET),
    GET_PRODUCT_BY_ID: new APIRouter("/inventory/products", HTTP_METHODS.GET),
    CREATE_PRODUCT: new APIRouter("/inventory/products", HTTP_METHODS.POST),
    UPDATE_PRODUCT: new APIRouter("/inventory/products", HTTP_METHODS.PUT),
    DELETE_PRODUCT: new APIRouter("/inventory/products", HTTP_METHODS.DEL),

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

    // Outwards
    GET_ALL_OUTWARDS: new APIRouter("/inventory/outwards", HTTP_METHODS.GET),
    GET_OUTWARD_BY_ID: new APIRouter("/inventory/outwards", HTTP_METHODS.GET),
    CREATE_OUTWARD: new APIRouter("/inventory/outwards", HTTP_METHODS.POST),
    UPDATE_OUTWARD: new APIRouter("/inventory/outwards", HTTP_METHODS.PUT),
    DELETE_OUTWARD: new APIRouter("/inventory/outwards", HTTP_METHODS.DEL),

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
    )
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
    ADD_PAYMENT: new APIRouter("order/payment", HTTP_METHODS.PATCH, OFFLINE.PROFILE),
    GET_SLOTS: new APIRouter("slots/getslots", HTTP_METHODS.GET, OFFLINE.PROFILE)
  },
  plantCms: {
    POST_NEWPLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.POST, OFFLINE.PROFILE),
    VALIDATE_EXCEL: new APIRouter("/excel/validate-excel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    IMPORT_EXCEL: new APIRouter("/excel/import-excel", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_PLANTS: new APIRouter("/plantcms/plants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_PLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    DELETE_PLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.DEL, OFFLINE.PROFILE)
  },

  slots: {
    GET_PLANTS: new APIRouter("/slots/get-plants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANTS_SUBTYPE: new APIRouter("/slots/subtyps", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANTS_SLOTS: new APIRouter("/slots/getslots", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_SLOT_DETAILS: new APIRouter("/slots/:slotId/details", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_SLOT: new APIRouter("/slots", HTTP_METHODS.PUT, OFFLINE.PROFILE),
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
    RELEASE_BUFFER_PLANTS: new APIRouter(
      "/slots/release-buffer",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
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
  }
}
