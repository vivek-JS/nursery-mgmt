/** localStorage key — shared naming with nursery-mgmt-mobile (each app uses its own origin). */
const STORAGE_KEY = "nursery_disable_whatsapp_messaging";

/** TEMP testing: show resend icons + allow repeat sends (backend needs WATI_WHATSAPP_UNLIMITED_SEND=true). */
const UNLIMITED_TEST_KEY = "nursery_whatsapp_unlimited_test";

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

/** Default ON for testing until explicitly turned off (localStorage "0"). */
export function isWhatsappUnlimitedTestEnabled() {
  try {
    const v = window.localStorage.getItem(UNLIMITED_TEST_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
    return true;
  } catch {
    return true;
  }
}

export function setWhatsappUnlimitedTestEnabled(enabled) {
  try {
    if (enabled) window.localStorage.setItem(UNLIMITED_TEST_KEY, "1");
    else window.localStorage.setItem(UNLIMITED_TEST_KEY, "0");
  } catch {
    /* ignore */
  }
}
