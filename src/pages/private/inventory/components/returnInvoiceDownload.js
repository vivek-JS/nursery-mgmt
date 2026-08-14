import { CookieKeys } from "constants/cookieKeys";
import { APIConfig } from "network/config/serverConfig";

/**
 * Authenticated PDF download via blob (for return invoices).
 * @param {object} router — APIRouter instance (baseURL + endpoint with :id)
 * @param {string} id
 * @param {string} [fallbackName]
 */
export async function downloadReturnInvoicePdf(router, id, fallbackName = "return-invoice.pdf") {
  const token = localStorage.getItem(CookieKeys.Auth);
  const path = String(router.endpoint || "").replace(":id", encodeURIComponent(id));
  const version = router.version ? `/${router.version}` : "/api/v1";
  const url = `${router.baseURL || APIConfig.BASE_URL}${version}${path}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { [APIConfig.API_AUTH_HEADER]: `${APIConfig.AUTH_TYPE} ${token}` } : {}),
      Accept: "application/pdf",
    },
  });

  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const json = await res.json();
      message = json?.message || json?.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^"]+)"?/i.exec(cd);
  const filename = match?.[1] || fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
  return { filename };
}
