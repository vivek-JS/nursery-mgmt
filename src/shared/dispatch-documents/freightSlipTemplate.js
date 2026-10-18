/**
 * 80mm thermal freight slip (tentative / final).
 * Shared by backend PDF (htmlToPdf) and web print — keep the copy in
 * nursery-mgmt/src/shared/dispatch-documents/ identical.
 */

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const inr = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const num = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "—");

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

const FIELD_LABELS = {
  km: "KM",
  rateCardId: "Vehicle rate",
  loadType: "Load type",
  crop: "Crop",
  crates: "Crates",
  ratePerKm: "Rate/KM",
  freightAmount: "Freight",
  bhatta: "Bhatta",
  bhattas: "Bhatta",
  otherAmount: "Other",
  remarks: "Remarks",
  villages: "Villages",
};

export const freightFieldLabel = (f) => FIELD_LABELS[f] || f;

function row(label, value, { bold = false, big = false } = {}) {
  return `<tr>
    <td style="padding:0.6mm 0;font-size:${big ? "9pt" : "7.6pt"};color:#333">${esc(label)}</td>
    <td style="padding:0.6mm 0;text-align:right;font-size:${big ? "10.5pt" : "8pt"};font-weight:${bold || big ? 800 : 600}">${value}</td>
  </tr>`;
}

const hr = `<div style="border-top:1px dashed #000;margin:1.6mm 0"></div>`;

function bhattaRows(entry) {
  const lines = (Array.isArray(entry?.bhattas) ? entry.bhattas : [])
    .map((b) => ({ name: String(b?.name || "").trim(), amount: Number(b?.amount) || 0 }))
    .filter((b) => b.name || b.amount > 0);
  if (!lines.length) return row("Driver bhatta", inr(entry?.bhatta));
  return lines.map((b) => row(esc(b.name || "Bhatta"), inr(b.amount))).join("");
}

function loadRow(line) {
  const plants = num(line?.plants);
  const crates = num(line?.crates);
  return `<tr>
    <td style="padding:1mm 0;font-size:8pt;font-weight:800">${esc(line?.crop || "—")}</td>
    <td style="padding:1mm 0;text-align:right;white-space:nowrap">
      <span style="display:inline-block;background:#14532d;color:#fff;font-weight:800;font-size:8pt;padding:0.5mm 1.6mm;border-radius:1mm">${plants} plants</span>
      <span style="display:inline-block;background:#b45309;color:#fff;font-weight:800;font-size:8pt;padding:0.5mm 1.6mm;border-radius:1mm;margin-left:1mm">${crates} crates</span>
    </td>
  </tr>`;
}

function entryBlock(entry, title) {
  if (!entry) return "";
  return `
    <div style="font-size:7.4pt;font-weight:800;letter-spacing:0.4px;margin-bottom:0.6mm">${esc(title)}</div>
    <table style="width:100%;border-collapse:collapse">
      ${row("Distance", `${num(entry.km)} KM`, { bold: true })}
      ${row("Vehicle rate", esc(entry.rateCardName || "—"))}
      ${entry.loadType ? row("Load type", esc(entry.loadType)) : ""}
      ${row("Rate", `${inr(entry.ratePerKm)}/KM`)}
      ${row("Freight", inr(entry.freightAmount), { bold: true })}
      ${bhattaRows(entry)}
      ${Number(entry.otherAmount) > 0 ? row("Other / toll", inr(entry.otherAmount)) : ""}
    </table>
    ${hr}
    <table style="width:100%;border-collapse:collapse">
      ${row("TOTAL", inr(entry.totalAmount), { big: true })}
    </table>
    ${entry.remarks ? `<div style="font-size:7pt;margin-top:1mm"><b>Remarks:</b> ${esc(entry.remarks)}</div>` : ""}
    <div style="font-size:6.6pt;color:#444;margin-top:0.8mm">${esc(entry.source === "APP" ? "App" : "Web")} · ${esc(entry.byName || "—")} · ${esc(fmtDate(entry.at))}</div>`;
}

/**
 * @param {object} slip — FreightSlip (lean / JSON)
 * @param {{ stage?: "tentative"|"final" }} [opts]
 * @returns {string} inner HTML for an 80mm-wide receipt
 */
export function renderFreightSlipBody(slip, { stage } = {}) {
  const isFinal = (stage || (slip?.status === "FINAL" ? "final" : "tentative")) === "final" && slip?.final;
  const entry = isFinal ? slip.final : slip?.tentative;
  const stamp = isFinal ? "FINAL" : "TENTATIVE";
  const villages = (slip?.villages || [])
    .slice()
    .sort((a, b) => (a.seq || 0) - (b.seq || 0))
    .map((v, i) => `${i + 1}. ${esc(v.name)}${v.plants ? ` (${num(v.plants)})` : ""}`)
    .join("<br/>");
  const load = (slip?.loadSummary || []).map((l) => loadRow(l)).join("");
  const totalCrates = (slip?.loadSummary || []).reduce((s, l) => s + (Number(l.crates) || 0), 0);

  let changes = "";
  if (isFinal) {
    if (slip.finalUnchanged) {
      changes = `<div style="font-size:7pt;margin-top:1mm;text-align:center">Same as tentative · no changes</div>`;
    } else if (slip.tentative) {
      const t = slip.tentative;
      changes = `
        ${hr}
        <div style="font-size:7.2pt;font-weight:800">Tentative was</div>
        <table style="width:100%;border-collapse:collapse">
          ${row("Distance", `${num(t.km)} KM`)}
          ${row("Total", inr(t.totalAmount))}
          ${row("Difference", inr((Number(entry.totalAmount) || 0) - (Number(t.totalAmount) || 0)), { bold: true })}
        </table>
        <div style="font-size:6.8pt">Changed: ${esc((slip.changedFields || []).map(freightFieldLabel).join(", ") || "—")}</div>`;
    }
  }

  return `
  <div style="width:76mm;padding:2mm;font-family:'Courier New',ui-monospace,monospace;color:#000;box-sizing:border-box">
    <div style="text-align:center">
      <div style="font-size:11pt;font-weight:900;letter-spacing:0.5px">RAM BIOTECH</div>
      <div style="font-size:7pt">Freight Slip · भाडे पावती</div>
      <div style="display:inline-block;margin-top:1.2mm;border:1.6px solid #000;padding:0.6mm 2.4mm;font-size:9pt;font-weight:900;letter-spacing:1px">${stamp}</div>
    </div>
    ${hr}
    <table style="width:100%;border-collapse:collapse">
      ${row("Slip No", esc(slip?.slipNumber || "—"), { bold: true })}
      ${row("Transport", esc(slip?.transportId || "—"))}
      ${row("Date", esc(fmtDate(entry?.at || slip?.createdAt)))}
    </table>
    ${hr}
    <table style="width:100%;border-collapse:collapse">
      ${row("Vehicle", esc([slip?.vehicleNumber, slip?.vehicleName].filter(Boolean).join(" · ") || "—"), { bold: true })}
      ${row("Driver", esc(slip?.driverName || "—"))}
      ${slip?.driverMobile ? row("Mobile", esc(slip.driverMobile)) : ""}
    </table>
    ${villages ? `${hr}<div style="font-size:7.4pt;font-weight:800">Villages · गावे</div><div style="font-size:7.6pt;line-height:1.45">${villages}</div>` : ""}
    ${load ? `${hr}<table style="width:100%;border-collapse:collapse">${load}${row("Total crates", num(totalCrates), { bold: true })}</table>` : ""}
    ${hr}
    ${entryBlock(entry, isFinal ? "FINAL FREIGHT" : "TENTATIVE FREIGHT")}
    ${changes}
    ${hr}
    <div style="display:flex;justify-content:space-between;margin-top:6mm;font-size:6.8pt">
      <div style="border-top:1px solid #000;padding-top:0.6mm;width:30mm;text-align:center">Driver</div>
      <div style="border-top:1px solid #000;padding-top:0.6mm;width:30mm;text-align:center">Travel Manager</div>
    </div>
    <div style="text-align:center;font-size:6.4pt;margin-top:2mm">Rates as per CMS rate card</div>
  </div>`;
}

/** Full HTML document sized for an 80mm roll. */
export function renderFreightSlipDocument(slip, opts = {}) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>${esc(slip?.slipNumber || "Freight Slip")}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style></head><body>${renderFreightSlipBody(slip, opts)}</body></html>`;
}
