import { NetworkManager, API } from "network/core"

function unwrap(response) {
  if (!response?.success) {
    const msg =
      response?.data?.message ||
      response?.message ||
      "Request failed"
    throw new Error(msg)
  }
  return response.data?.data ?? response.data
}

/** IST YYYY-MM-DD (matches backend) */
export function getISTDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function formatNoteDate(noteDate) {
  if (!noteDate) return ""
  try {
    const [y, m, d] = noteDate.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return noteDate
  }
}

export async function fetchTodayNote() {
  const instance = NetworkManager(API.DAILY_NOTE.GET_TODAY)
  return unwrap(await instance.request())
}

export async function saveTodayNote(payload) {
  const instance = NetworkManager(API.DAILY_NOTE.UPSERT_TODAY)
  return unwrap(await instance.request(payload))
}

export async function saveNote(payload) {
  const instance = NetworkManager(API.DAILY_NOTE.UPSERT)
  return unwrap(await instance.request(payload))
}

export async function fetchNotes({ page = 1, limit = 20, from, to, q } = {}) {
  const instance = NetworkManager(API.DAILY_NOTE.LIST)
  const params = { page, limit }
  if (from) params.from = from
  if (to) params.to = to
  if (q) params.q = q
  return unwrap(await instance.request({}, params))
}

export async function fetchNoteByDate(date) {
  const instance = NetworkManager(API.DAILY_NOTE.BY_DATE)
  return unwrap(await instance.request({}, [date]))
}

export async function updateNote(id, payload) {
  const instance = NetworkManager(API.DAILY_NOTE.UPDATE)
  return unwrap(await instance.request(payload, [id]))
}

export async function deleteNote(id) {
  const instance = NetworkManager(API.DAILY_NOTE.DELETE)
  return unwrap(await instance.request({}, [id]))
}
