/** localStorage key — shared naming with nursery-mgmt-mobile (each app uses its own origin). */
const STORAGE_KEY = "nursery_disable_whatsapp_messaging";

export function isWhatsappMessagingDisabled() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** @param {boolean} disabled - When true, hide/block WATI WhatsApp send UI. */
export function setWhatsappMessagingDisabled(disabled) {
  try {
    if (disabled) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
