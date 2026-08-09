import { escapeHtml } from "./challanUtils.js";
import { invoiceTermsForPlant } from "./invoiceTerms.js";

function renderItemsTable(items, lotLabel = "Lot No.") {
  const rows = (items || []).map((it) => {
    const qtyDisplay = it.quantity
      ? Number(it.quantity).toLocaleString("en-IN")
      : "";
    const desc = escapeHtml(it.description);
    const lot = it.lotNo
      ? `<div style="font-size:11px">${escapeHtml(lotLabel)} &nbsp; ${escapeHtml(it.lotNo)}</div>`
      : "";
    return `<tr>
      <td style="border:1px solid #000;padding:4px 8px;text-align:center">${escapeHtml(it.srNo)}</td>
      <td style="border:1px solid #000;padding:4px 8px">${desc}${lot}</td>
      <td style="border:1px solid #000;padding:4px 8px;text-align:center">${escapeHtml(qtyDisplay)}</td>
      <td style="border:1px solid #000;padding:4px 8px;text-align:center">${escapeHtml(it.rate)}</td>
      <td style="border:1px solid #000;padding:4px 8px;text-align:center">${escapeHtml(it.unitPer)}</td>
      <td style="border:1px solid #000;padding:4px 8px;text-align:right">${escapeHtml(it.amount)}</td>
    </tr>`;
  });
  const blankCount = Math.max(0, 4 - (items?.length || 0));
  for (let i = 0; i < blankCount; i++) {
    rows.push(`<tr><td style="border:1px solid #000;padding:4px 8px;height:22px" colspan="6">&nbsp;</td></tr>`);
  }
  return rows.join("");
}

function renderLicRow(inv) {
  if (inv.isBanana) {
    return `<div style="display:grid;grid-template-columns:1fr 1fr;font-size:11px;margin-bottom:4px;border-bottom:1px solid #eee;padding-bottom:4px">
      <div><b>Lic.No:-</b>${escapeHtml(inv.licNo || "")}</div>
      <div style="text-align:right"><b>DBT No.:</b> ${escapeHtml(inv.dbtNo || "")}</div>
    </div>`;
  }
  return `<div style="font-size:11px;margin-bottom:4px"><b>Lic.No:-</b>${escapeHtml(inv.licNo || "")}</div>`;
}

function renderBillToTable(inv) {
  const aadharRow = inv.isBanana
    ? `<tr>
        <td style="border:1px solid #000;padding:3px 6px" colspan="4"><b>Adhar NO. :</b> ${escapeHtml(inv.aadhar || "")}</td>
      </tr>`
    : "";

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:6px;font-size:12px">
      <tbody>
        <tr>
          <td style="border:1px solid #000;padding:3px 6px;width:50%" colspan="3"><b>Bill To :- Mr/Miss. :-</b> ${escapeHtml(inv.billTo)}</td>
          <td style="border:1px solid #000;padding:3px 6px"><b>Mob. No. :</b> ${escapeHtml(inv.mobile)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:3px 6px"><b>At/Post :</b> ${escapeHtml(inv.atPost)}</td>
          <td style="border:1px solid #000;padding:3px 6px"><b>Tal :</b> ${escapeHtml(inv.tal)}</td>
          <td style="border:1px solid #000;padding:3px 6px" colspan="2"><b>Dist :</b> ${escapeHtml(inv.dist)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:3px 6px" colspan="4"><b>State :</b> ${escapeHtml(inv.state)}</td>
        </tr>
        ${aadharRow}
      </tbody>
    </table>`;
}

function renderBillToShipToTable(inv) {
  const aadharRow = inv.isBanana
    ? `<tr>
        <td style="border:1px solid #000;padding:3px 6px" colspan="2"><b>Dist :</b> ${escapeHtml(inv.billDist || "")}</td>
        <td style="border:1px solid #000;padding:3px 6px"><b>Dist :</b> ${escapeHtml(inv.shipDist || "")}</td>
        <td style="border:1px solid #000;padding:3px 6px"><b>Adhar NO. :</b> ${escapeHtml(inv.aadhar || "")}</td>
      </tr>`
    : `<tr>
        <td style="border:1px solid #000;padding:3px 6px" colspan="2"><b>Dist :</b> ${escapeHtml(inv.billDist || "")}</td>
        <td style="border:1px solid #000;padding:3px 6px" colspan="2"><b>Dist :</b> ${escapeHtml(inv.shipDist || "")}</td>
      </tr>`;

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:6px;font-size:12px">
      <tbody>
        <tr>
          <td style="border:1px solid #000;padding:3px 6px" colspan="2"><b>Bill To :- Mr/Miss. :-</b> ${escapeHtml(inv.billTo || "")}</td>
          <td style="border:1px solid #000;padding:3px 6px" colspan="2"><b>Ship To :- Mr/Miss. :-</b> ${escapeHtml(inv.shipTo || "")}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:3px 6px"><b>Mob. No. :</b> ${escapeHtml(inv.billMobile || "")}</td>
          <td style="border:1px solid #000;padding:3px 6px"><b>At/Post :</b> ${escapeHtml(inv.billAtPost || "")}</td>
          <td style="border:1px solid #000;padding:3px 6px"><b>Mob. No. :</b> ${escapeHtml(inv.shipMobile || "")}</td>
          <td style="border:1px solid #000;padding:3px 6px"><b>At/Post :</b> ${escapeHtml(inv.shipAtPost || "")}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:3px 6px"><b>Tal :</b> ${escapeHtml(inv.billTal || "")}</td>
          <td style="border:1px solid #000;padding:3px 6px"></td>
          <td style="border:1px solid #000;padding:3px 6px"><b>Tal :</b> ${escapeHtml(inv.shipTal || "")}</td>
          <td style="border:1px solid #000;padding:3px 6px"></td>
        </tr>
        ${aadharRow}
        <tr>
          <td style="border:1px solid #000;padding:3px 6px" colspan="4"><b>State :</b> ${escapeHtml(inv.billState || inv.state || "Maharashtra")}</td>
        </tr>
      </tbody>
    </table>`;
}

function renderPartyBlock(inv) {
  return inv.useBillToShipTo ? renderBillToShipToTable(inv) : renderBillToTable(inv);
}

function renderFarmerFooter(inv, showThumb) {
  if (showThumb) {
    return `<table style="width:100%;border-collapse:collapse;margin-top:8px">
      <tbody>
        <tr>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center;width:40%">Name Of The Farmer</th>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center;width:30%">Sign</th>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center;width:30%">Thumb</th>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:4px 8px;height:36px">${escapeHtml(inv.farmerName)}</td>
          <td style="border:1px solid #000;padding:4px 8px;height:36px"></td>
          <td style="border:1px solid #000;padding:4px 8px;height:36px"></td>
        </tr>
      </tbody>
    </table>`;
  }
  return `<table style="width:100%;border-collapse:collapse;margin-top:8px">
      <tbody>
        <tr>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center;width:50%">Name Of The Farmer</th>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center;width:50%">Sign</th>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:4px 8px;height:36px">${escapeHtml(inv.farmerName)}</td>
          <td style="border:1px solid #000;padding:4px 8px;height:36px"></td>
        </tr>
      </tbody>
    </table>`;
}

function renderInvoicePage(inv) {
  const { terms, closing, showThumb } = invoiceTermsForPlant(Boolean(inv.isBanana));
  const termsHtml = terms.map((p) => `<p style="margin:0 0 3px">${escapeHtml(p)}</p>`).join("");
  const lotLabel = inv.lotLabel || (inv.isBanana ? "Batch No." : "Lot No.");

  return `<div class="invoice-page" style="font-family:Arial,sans-serif;font-size:12px;color:#000;max-width:780px;margin:0 auto;border:2px dashed #16a34a;padding:12px;page-break-after:always;box-sizing:border-box">
    <div style="display:grid;grid-template-columns:1fr 180px 130px;border-bottom:1px solid #000;padding-bottom:6px;margin-bottom:6px">
      <div>
        <div style="font-weight:900;font-size:26px;text-align:center">Ram Biotech</div>
        <div style="font-size:11px;text-align:center;color:#444">Nashirabad -Sunasgaon road, Nashirabad, Tal.& Dist. - Jalgaon.</div>
        <div style="font-size:11px;text-align:center;color:#444">State -Maharashtra (425309)</div>
      </div>
      <div style="border:1px solid #000;padding:4px 10px;text-align:center;font-weight:700;font-size:12px;display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:11px">CASH/CREDIT</div>
        <div>Invoice No.</div>
        <div style="margin-top:6px;font-weight:900;font-size:15px">${escapeHtml(inv.invoiceNo || "—")}</div>
      </div>
      <div style="border:1px solid #000;padding:4px 16px;text-align:center;font-weight:700;display:flex;flex-direction:column;justify-content:center">
        <div>Dated</div>
        <div style="margin-top:6px">${escapeHtml(inv.dated)}</div>
      </div>
    </div>
    ${renderLicRow(inv)}
    ${renderPartyBlock(inv)}
    <table style="width:100%;border-collapse:collapse;margin-bottom:0">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center">Sr. No</th>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center">Description of Goods</th>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center">Quantity</th>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center">Rate</th>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center">Unit Per</th>
          <th style="border:1px solid #000;padding:4px 8px;background:#f3f4f6;font-weight:700;text-align:center">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${renderItemsTable(inv.items, lotLabel)}
        <tr>
          <td style="border:1px solid #000;padding:4px 8px;font-weight:700" colspan="5">Total Amount</td>
          <td style="border:1px solid #000;padding:4px 8px;font-weight:700;text-align:right">${escapeHtml(inv.totalAmount)}</td>
        </tr>
      </tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-top:0">
      <tbody>
        <tr>
          <td style="border:1px solid #000;padding:4px 8px"><b>Amount in words:-</b> ${escapeHtml(inv.amountInWords)}</td>
        </tr>
      </tbody>
    </table>
    <div style="border:1px solid #000;padding:4px 8px;font-size:11px;margin-bottom:0">
      <div style="display:grid;grid-template-columns:1fr 220px">
        <div>
          <b>Declaration :-</b><br/>
          We declare that invoice shows the actual price of the Goods described and that all particulars are true and correct. Subject to Jalgaon jurisdiction.
        </div>
        <div style="text-align:right;padding-left:8px">
          <div style="font-weight:700">For Ram Biotech</div>
          <div style="margin-top:28px;font-size:11px">Authorised Signatory</div>
        </div>
      </div>
    </div>
    <div style="border:1px solid #000;border-top:none;padding:6px 8px;font-size:11px;line-height:1.6;margin-bottom:0">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px">❖ <u>अटी व शर्ती</u></div>
      ${termsHtml}
      <p style="margin:8px 0 3px;border-top:1px solid #ddd;padding-top:6px">${escapeHtml(closing)}</p>
    </div>
    ${renderFarmerFooter(inv, showThumb)}
  </div>`;
}

export function renderRamBiotechInvoiceBody(pages) {
  return (pages || []).map((p) => renderInvoicePage(p)).join("");
}

export function renderRamBiotechInvoiceDocument(pages, title = "Invoice") {
  const body = renderRamBiotechInvoiceBody(pages);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: A4 portrait; margin: 8mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
html, body { margin: 0; padding: 0; background: white; }
.invoice-page { page-break-after: always; }
.invoice-page:last-child { page-break-after: auto; }
</style></head><body>${body}</body></html>`;
}

export { renderInvoicePage };
