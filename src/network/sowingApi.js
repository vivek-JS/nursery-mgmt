import { API } from "./config/endpoints";

export const sowingApi = {
  CREATE_SOWING: {
    path: `${API.BASE}/sowing`,
    method: "POST",
  },
  GET_SOWINGS: {
    path: `${API.BASE}/sowing`,
    method: "GET",
  },
  GET_SOWING_BY_ID: {
    path: `${API.BASE}/sowing/:id`,
    method: "GET",
  },
  UPDATE_OFFICE_SOWED: {
    path: `${API.BASE}/sowing/:id/office-sowed`,
    method: "POST",
  },
  UPDATE_PRIMARY_SOWED: {
    path: `${API.BASE}/sowing/:id/primary-sowed`,
    method: "POST",
  },
  UPDATE_HARVEST: {
    path: `${API.BASE}/sowing/:id/harvest`,
    method: "POST",
  },
  GET_REMINDERS: {
    path: `${API.BASE}/sowing/reminders`,
    method: "GET",
  },
  GET_STATS: {
    path: `${API.BASE}/sowing/stats`,
    method: "GET",
  },
  UPDATE_SOWING: {
    path: `${API.BASE}/sowing/:id`,
    method: "PUT",
  },
  DELETE_SOWING: {
    path: `${API.BASE}/sowing/:id`,
    method: "DELETE",
  },
};

