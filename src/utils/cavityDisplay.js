/**
 * Label for tray/cavity from API `order.cavity` (object, empty object, or unpopulated id string).
 */
export function getCavityDisplayLabel(cavity) {
  if (cavity == null || cavity === "") return null;
  if (typeof cavity === "string") {
    const s = cavity.trim();
    return s.length ? s : null;
  }
  if (typeof cavity !== "object") return null;
  if (!Object.keys(cavity).length) return null;
  const name = cavity.name;
  if (name != null && String(name).trim() !== "") return String(name).trim();
  const c = cavity.cavity;
  if (c != null && String(c).trim() !== "") return String(c).trim();
  return null;
}

/** Stable string id for matching tray dropdowns (ObjectId or subdocument). */
export function getCavityIdString(cavity) {
  if (cavity == null || cavity === "") return "";
  if (typeof cavity === "string") return cavity.trim();
  if (typeof cavity === "object") {
    const id = cavity._id ?? cavity.id;
    return id != null && id !== "" ? String(id) : "";
  }
  return "";
}

/** True if dispatch row / API has a tray ObjectId to resolve (excludes `{ id: null }`). */
export function orderRowHasTrayRef(details) {
  if (!details) return false;
  if (getCavityIdString(details.cavity) !== "") return true;
  const cid = details.cavityId;
  return cid != null && String(cid).trim() !== "";
}

/**
 * Label for Create Dispatch: use embedded cavity fields, else match details.cavityId / cavity.id to loaded trays.
 */
export function getCavityLabelForDispatchOrder(details, trays, getTrayId) {
  const cavity = details?.cavity;
  const direct = getCavityDisplayLabel(cavity);
  if (direct) return direct;

  const idStr =
    getCavityIdString(cavity) ||
    (details?.cavityId != null && details.cavityId !== ""
      ? String(details.cavityId)
      : "");

  if (idStr && Array.isArray(trays) && trays.length > 0 && typeof getTrayId === "function") {
    const t = trays.find((x) => getTrayId(x) === idStr);
    if (t) {
      if (t.name != null && String(t.name).trim() !== "") return String(t.name).trim();
      if (t.cavity != null && String(t.cavity).trim() !== "") return String(t.cavity).trim();
    }
  }

  const cn = details?.cavityName;
  if (
    cn != null &&
    String(cn).trim() !== "" &&
    cn !== "N/A" &&
    cn !== "Not specified"
  ) {
    return String(cn).trim();
  }
  return null;
}
