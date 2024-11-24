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
    LOGIN: new APIWithOfflineRouter("api/v2/user/login", HTTP_METHODS.POST, OFFLINE.LOGIN),
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
    REFRESH_TOKEN: new APIRouter("/user/token/refresh", HTTP_METHODS.POST)
  },
  HOSPITAL: {
    LOGIN_HOSPITAL: new APIWithOfflineRouter("/user/login", HTTP_METHODS.POST, OFFLINE.LOGIN),
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
    PROFILE: new APIWithOfflineRouter("/user/profile/", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE: new APIRouter("/user/profile/", HTTP_METHODS.PATCH, OFFLINE.UPDATE),
    LOGOUT: new APIWithOfflineRouter("/user/logout/", HTTP_METHODS.DEL, OFFLINE.LOGOUT)
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
    ADD_EMPLOYEE: new APIRouter(
      "api/v1/employee/createEmployee",
      HTTP_METHODS.POST,
      OFFLINE.PROFILE
    ),
    ADD_EMPLOYEE_LOGIN: new APIRouter("user/createUser", HTTP_METHODS.POST, OFFLINE.PROFILE),

    GET_EMPLOYEE: new APIRouter("employee/getEmployees", HTTP_METHODS.GET, OFFLINE.PROFILE),
    DELETE_EMPLOYEE: new APIRouter(
      "api/v1/employee/deleteEmployee",
      HTTP_METHODS.DEL,
      OFFLINE.PROFILE
    ),
    UPDATE_EMPLOYEE: new APIRouter(
      "api/v1/employee/updateEmployee",
      HTTP_METHODS.PATCH,
      OFFLINE.PROFILE
    )
  },
  ORDER: {
    GET_ORDERS: new APIRouter("/order/getOrders", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_ORDER: new APIRouter("/order/updateOrder", HTTP_METHODS.PATCH, OFFLINE.PROFILE)
  },
  plantCms: {
    POST_NEWPLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.POST, OFFLINE.PROFILE),
    GET_PLANTS: new APIRouter("/plantcms/plants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_PLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.PUT, OFFLINE.PROFILE),
    DELETE_PLANT: new APIRouter("/plantcms/plants", HTTP_METHODS.DEL, OFFLINE.PROFILE)
  },
  slots: {
    GET_PLANTS: new APIRouter("/slots/get-plants", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANTS_SUBTYPE: new APIRouter("/slots/subtyps", HTTP_METHODS.GET, OFFLINE.PROFILE),
    GET_PLANTS_SLOTS: new APIRouter("/slots/getslots", HTTP_METHODS.GET, OFFLINE.PROFILE),
    UPDATE_SLOT: new APIRouter("/slots", HTTP_METHODS.PUT, OFFLINE.PROFILE)
  }
}
