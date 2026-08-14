import { escapeHtml, formatInr, formatQty, cleanPlantLabel } from "./challanUtils.js";

const BORDER = "#000000";

function cellStyle(extra = {}) {
  const parts = [
    "border:1px solid #000",
    "padding:1.8mm 2.5mm",
    "font-size:7.5pt",
    "line-height:1.3",
  ];
  if (extra.fontWeight) parts.push(`font-weight:${extra.fontWeight}`);
  if (extra.textAlign) parts.push(`text-align:${extra.textAlign}`);
  if (extra.color) parts.push(`color:${extra.color}`);
  if (extra.border === "none") parts.push("border:none");
  return parts.join(";");
}

function renderCrateSection(orderCrates) {
  if (!orderCrates?.length) return "";
  const blocks = orderCrates
    .map((crate) => {
      const hasDetails = Array.isArray(crate.crateDetails) && crate.crateDetails.length > 0;
      const totalCrates = hasDetails
        ? crate.crateDetails.reduce((s, cd) => s + (cd.crateCount || 0), 0)
        : crate.crateCount || 0;
      const totalPlants = hasDetails
        ? crate.crateDetails.reduce((s, cd) => s + (cd.plantCount || 0), 0)
        : crate.plantCount || 0;
      const detailRows = hasDetails
        ? crate.crateDetails
            .map(
              (cd, di) =>
                `<div style="display:flex;justify-content:space-between;padding:0.8mm 2mm;font-size:8.5pt;font-weight:700;background:#fff;border-bottom:${
                  di < crate.crateDetails.length - 1 ? "1px dotted #000" : "none"
                }"><span>${formatQty(cd.crateCount || 0)} क्रेट</span><span>${formatQty(cd.plantCount || 0)} रोपे</span></div>`
            )
            .join("")
        : "";
      return `<div style="border:1px solid #000;border-radius:1mm;overflow:hidden">
        <div style="background:#fff;color:#000;font-size:8pt;font-weight:700;text-align:center;padding:1mm 2mm;border-bottom:1px solid #000">${escapeHtml(cleanPlantLabel(crate.cavityName))}</div>
        ${detailRows}
        <div style="display:flex;justify-content:space-between;padding:1mm 2mm;background:#fff;color:#000;font-size:9pt;font-weight:700;border-top:1px solid #000">
          <span>${formatQty(totalCrates)} क्रेट</span><span>${formatQty(totalPlants)} रोपे</span>
        </div>
      </div>`;
    })
    .join("");
  return `<div style="border-radius:1.5mm;overflow:hidden;border:1px solid #000">
    <div style="background:#fff;color:#000;padding:1.8mm 3mm;font-size:7.5pt;font-weight:700;border-bottom:1px solid #000">कॅव्हिटी व क्रेट तपशील</div>
    <div style="padding:2mm;display:flex;flex-direction:column;gap:2mm;background:#fff">${blocks}</div>
  </div>`;
}

function renderSummaryRows(page) {
  const multi = Array.isArray(page.plantLines) && page.plantLines.length > 0;
  const rows = multi
    ? [
        ...page.plantLines.map((line) => [
          cleanPlantLabel(line.label),
          `${formatQty(line.qty)} × ${formatInr(line.rate)} = ${formatInr(
            line.amount ?? (Number(line.qty) || 0) * (Number(line.rate) || 0)
          )}`,
        ]),
        ["एकूण संख्या", formatQty(page.dispatchQty)],
        ["रोप रक्कम", formatInr(page.plantAmount)],
      ]
    : [
        ["रोप", cleanPlantLabel(page.plantName)],
        ["संख्या", formatQty(page.dispatchQty)],
        ["दर", formatInr(page.rate)],
        ["रोप रक्कम", formatInr(page.plantAmount)],
      ];
  if (page.freightCharges > 0) {
    rows.push(["वाहतूक / Freight", formatInr(page.freightCharges)]);
  }
  rows.push(["एकूण रक्कम", formatInr(page.dispatchTotal)]);
  return rows
    .map(
      ([label, value]) =>
        `<div style="${cellStyle({ fontWeight: "700" })};border:none;border-right:1px solid #000;border-bottom:1px solid #000;text-align:left">${escapeHtml(label)}</div>
         <div style="${cellStyle({ fontWeight: "700" })};border:none;border-bottom:1px solid #000;text-align:right">${escapeHtml(value)}</div>`
    )
    .join("");
}

function renderPaymentTable(page) {
  const head = ["तारीख", "पद्धत", "रक्कम"]
    .map(
      (h, i) =>
        `<th style="${cellStyle({ fontWeight: "700" })};border:none;border-left:${
          i > 0 ? "1px solid #000" : "none"
        };border-bottom:1px solid #000;text-align:${i === 2 ? "right" : "left"}">${h}</th>`
    )
    .join("");
  const body =
    page.paymentEntries.length === 0
      ? `<tr><td colspan="3" style="${cellStyle()};border:none;border-bottom:1px solid #000;text-align:center;color:#9ca3af">कोणतेही पेमेंट नाही</td></tr>`
      : page.paymentEntries
          .map((p) => {
            const date = p?.paymentDate
              ? new Date(p.paymentDate).toLocaleDateString("mr-IN")
              : "N/A";
            const cells = [
              { v: date, align: "left" },
              { v: p?.modeOfPayment || "N/A", align: "left" },
              { v: formatInr(p?.paidAmount), align: "right" },
            ];
            return `<tr style="background:#fff">${cells
              .map(
                (c, i) =>
                  `<td style="${cellStyle()};text-align:${c.align};border:none;border-left:${
                    i > 0 ? "1px solid #000" : "none"
                  };border-bottom:1px solid #000">${escapeHtml(c.v)}</td>`
              )
              .join("")}</tr>`;
          })
          .join("");
  const foot = [
    { label: "एकूण भरलेली रक्कम", value: page.totalPaid, bold: false },
    { label: "एकूण रक्कम", value: page.dispatchTotal, bold: false },
    { label: "उर्वरित रक्कम", value: page.remaining, bold: true },
  ]
    .map(
      ({ label, value, bold }) =>
        `<tr style="background:#fff">
          <td colspan="2" style="${cellStyle({ fontWeight: bold ? "700" : "600" })};border:none;border-top:1px solid #000">${escapeHtml(label)}</td>
          <td style="${cellStyle({ fontWeight: bold ? "700" : "600", textAlign: "right" })};border:none;border-top:1px solid #000;border-left:1px solid #000">${escapeHtml(formatInr(value))}</td>
        </tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#fff">${head}</tr></thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table>`;
}

function renderChallanPage(page) {
  const infoRows = [
    ["चालक", page.driverName, "वाहन", page.vehicleName],
    ["शेतकरी", page.farmerName, "मोबाईल", page.farmerMobile],
    ["गाव", page.village, "रोप", cleanPlantLabel(page.plantName)],
    ["प्रमाण", formatQty(page.dispatchQty), "", ""],
  ];
  const infoGrid = infoRows
    .map(([l1, v1, l2, v2], i) => {
      const cells = [l1, v1, l2, v2]
        .map(
          (txt, j) =>
            `<div style="${cellStyle()};font-weight:${j % 2 === 0 ? "700" : "400"};color:${
              j % 2 === 0 ? "#000" : "#1f2937"
            };background:transparent;border:none;border-left:${j > 0 ? "1px solid #000" : "none"}">${escapeHtml(txt)}</div>`
        )
        .join("");
      return `<div style="display:grid;grid-template-columns:22mm 1fr 22mm 1fr;background:#fff;border-bottom:${
        i < infoRows.length - 1 ? "1px solid #000" : "none"
      }">${cells}</div>`;
    })
    .join("");

  const manualDcHtml = page.optionalManualDc
    ? `<div style="color:#000;font-size:6.5pt;margin-top:0.8mm;font-weight:600">मॅन्युअल DC: ${escapeHtml(page.optionalManualDc)}</div>`
    : "";

  const crateHtml = renderCrateSection(page.orderCrates);
  const gridCols = page.orderCrates?.length > 0 ? "1fr 1fr" : "1fr";

  return `<div class="challan-page" style="width:148mm;min-height:210mm;box-sizing:border-box;background:#fff;font-family:system-ui,-apple-system,Arial,sans-serif;page-break-after:always;display:flex;flex-direction:column">
    <div style="background:#fff;padding:3.5mm 5mm 3mm;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${BORDER}">
      <div>
        <div style="color:#000;font-size:13pt;font-weight:800;letter-spacing:0.5px">डिलिव्हरी चलन</div>
        <div style="color:#000;font-size:6.5pt;margin-top:0.5mm">DELIVERY CHALLAN</div>
      </div>
      <div style="text-align:right">
        <div style="background:#fff;border:1px solid ${BORDER};border-radius:1.5mm;padding:1mm 2.5mm;color:#000;font-size:7.5pt;font-weight:700">${escapeHtml(page.invoiceLabel)}</div>
        ${manualDcHtml}
        ${page.orderRef ? `<div style="color:#000;font-size:6.5pt;margin-top:0.8mm;font-weight:600">${escapeHtml(page.orderRef)}</div>` : ""}
        <div style="color:#000;font-size:6.5pt;margin-top:1mm">तारीख: ${escapeHtml(page.today)}</div>
      </div>
    </div>
    <div style="padding:3.5mm 4.5mm;flex:1;display:flex;flex-direction:column;gap:3mm">
      <div style="border:1px solid ${BORDER};border-radius:1.5mm;overflow:hidden">${infoGrid}</div>
      <div style="display:grid;grid-template-columns:${gridCols};gap:2mm">
        ${crateHtml}
        <div style="border-radius:1.5mm;overflow:hidden;border:1px solid ${BORDER}">
          <div style="background:#fff;color:#000;padding:1.8mm 3mm;font-size:7.5pt;font-weight:700;border-bottom:1px solid ${BORDER}">ऑर्डर सारांश</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;background:#fff">${renderSummaryRows(page)}</div>
        </div>
      </div>
      <div style="border-radius:1.5mm;overflow:hidden;border:1px solid ${BORDER}">
        <div style="background:#fff;color:#000;padding:1.8mm 3mm;font-size:7.5pt;font-weight:700;border-bottom:1px solid ${BORDER}">पेमेंट तपशील</div>
        ${renderPaymentTable(page)}
      </div>
      <div style="margin-top:auto"></div>
    </div>
  </div>`;
}

export function renderDeliveryChallanBody(pages) {
  return (pages || []).map((p) => renderChallanPage(p)).join("");
}

export function renderDeliveryChallanDocument(pages, title = "Delivery Challans") {
  const body = renderDeliveryChallanBody(pages);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: A5 portrait; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
html, body { margin: 0; padding: 0; background: white; }
.challan-page { width: 148mm; min-height: 210mm; page-break-after: always; }
.challan-page:last-child { page-break-after: auto; }
</style></head><body>${body}</body></html>`;
}

/** @param {import('./dispatchDocumentMappers.js').DispatchContext} dispatch */
export function renderDeliveryChallanPagesFromDispatch(dispatch, mapperFn) {
  const pages = mapperFn(dispatch);
  return renderDeliveryChallanDocument(pages, `Delivery Challans — ${dispatch?.transportId ?? ""}`);
}

export { renderChallanPage };
