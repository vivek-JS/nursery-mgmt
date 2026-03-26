import React from "react"
import moment from "moment"
import { BankApprovalMenu } from "./BankApprovalMenu"
import { StatusBadge } from "./StatusBadge"

export function BankReconciliationLive({
  reconcileDateFrom,
  reconcileDateTo,
  onDateFromChange,
  onDateToChange,
  unclearedList,
  forApprovalList,
  loadingUncleared,
  loadingForApproval,
  reconcileLoading,
  reconcileResult,
  updatingPaymentId,
  onRefreshUncleared,
  onRefreshForApproval,
  onReconcile,
  onApproveOrReject
}) {
  return (
    <div className="space-y-4">
      <div className="erp-card animate-fade-up stagger-2 p-4">
        <h2 className="text-sm font-semibold text-foreground mb-1">Statement – Unverified entries</h2>
        <p className="text-xs text-muted-foreground mb-3">Match bank entries and mark payments verified.</p>
        <div className="flex flex-wrap gap-2 items-end mb-3">
          <label className="text-[11px] font-semibold text-muted-foreground">
            From
            <input
              type="date"
              className="erp-input block mt-1 text-xs"
              value={reconcileDateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground">
            To
            <input
              type="date"
              className="erp-input block mt-1 text-xs"
              value={reconcileDateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </label>
          <button type="button" className="btn-primary text-xs" onClick={onRefreshUncleared} disabled={loadingUncleared}>
            {loadingUncleared ? "…" : "Refresh"}
          </button>
          <button type="button" className="btn-primary text-xs" onClick={onReconcile} disabled={reconcileLoading}>
            {reconcileLoading ? "…" : "Reconcile with bank"}
          </button>
        </div>
        {reconcileResult && (
          <div className="mb-3 px-3 py-2 rounded-sm bg-status-collected-bg text-status-collected text-xs font-medium">
            {reconcileResult.updatedCount && reconcileResult.updatedCount > 0
              ? `${reconcileResult.updatedCount} payment(s) verified by bank.`
              : "No new matches."}
          </div>
        )}
        {loadingUncleared ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>UTR / Cheque</th>
                  <th>Source</th>
                  <th>Bank status</th>
                </tr>
              </thead>
              <tbody>
                {unclearedList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted-foreground py-6">
                      No unverified entries
                    </td>
                  </tr>
                ) : (
                  unclearedList.map((p) => (
                    <tr key={String(p.paymentId)}>
                      <td>{p.orderId}</td>
                      <td>{p.paymentDate ? moment(p.paymentDate).format("DD-MM-YYYY") : "—"}</td>
                      <td className="tabular">{p.paidAmount}</td>
                      <td>{p.modeOfPayment}</td>
                      <td>{p.transactionId || p.chequeNumber || p.ref}</td>
                      <td>{p.source}</td>
                      <td>
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-100">
                          Not matched
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="erp-card animate-fade-up stagger-3 p-4">
        <h2 className="text-sm font-semibold text-foreground mb-1">Accountant approval – Verified by bank</h2>
        <p className="text-xs text-muted-foreground mb-3">Approve or reject payments that cleared bank verification.</p>
        <div className="flex flex-wrap gap-2 items-end mb-3">
          <label className="text-[11px] font-semibold text-muted-foreground">
            From
            <input
              type="date"
              className="erp-input block mt-1 text-xs"
              value={reconcileDateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground">
            To
            <input
              type="date"
              className="erp-input block mt-1 text-xs"
              value={reconcileDateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </label>
          <button type="button" className="btn-primary text-xs" onClick={onRefreshForApproval} disabled={loadingForApproval}>
            {loadingForApproval ? "…" : "Refresh"}
          </button>
        </div>
        {loadingForApproval ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>UTR / Cheque</th>
                  <th>Customer</th>
                  <th>Bank status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {forApprovalList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted-foreground py-6">
                      No payments pending approval
                    </td>
                  </tr>
                ) : (
                  forApprovalList.map((p) => (
                    <tr key={String(p.paymentId)}>
                      <td>{p.orderId}</td>
                      <td>{p.paymentDate ? moment(p.paymentDate).format("DD-MM-YYYY") : "—"}</td>
                      <td className="tabular">{p.paidAmount}</td>
                      <td>{p.transactionId || p.chequeNumber}</td>
                      <td>{p.farmerName || p.customerName || "—"}</td>
                      <td>
                        <StatusBadge status="BANK_VERIFIED" />
                      </td>
                      <td>
                        <BankApprovalMenu
                          busy={updatingPaymentId === p.paymentId}
                          disabled={updatingPaymentId === p.paymentId}
                          onApprove={() =>
                            onApproveOrReject(
                              p.orderId,
                              String(p.paymentId),
                              "COLLECTED",
                              p.source,
                              p.orderMongoId,
                              p.paymentIndex
                            )
                          }
                          onReject={() =>
                            onApproveOrReject(
                              p.orderId,
                              String(p.paymentId),
                              "REJECTED",
                              p.source,
                              p.orderMongoId,
                              p.paymentIndex
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
