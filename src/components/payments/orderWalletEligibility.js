const WALLET_ROLES = new Set([
  "SUPER_ADMIN",
  "SUPERADMIN",
  "ACCOUNTANT",
  "OFFICE_ADMIN",
  "DEALER",
])

export function orderQualifiesForWalletPay(order) {
  if (!order) return false
  const dealerOrder = Boolean(order.dealerOrder ?? order.details?.dealerOrder)
  const salesIsDealer =
    order.salesPerson?.jobTitle === "DEALER" ||
    order.details?.salesPerson?.jobTitle === "DEALER"
  return dealerOrder || salesIsDealer
}

export function userCanUseWalletPay(user) {
  const role = user?.jobTitle || user?.role
  return WALLET_ROLES.has(role)
}

export function canShowWalletPay(order, user) {
  return orderQualifiesForWalletPay(order) && userCanUseWalletPay(user)
}

export function resolveWalletBalance(order, { walletData, dealerWalletData, isDealer }) {
  const salesIsDealer =
    order?.salesPerson?.jobTitle === "DEALER" ||
    order?.details?.salesPerson?.jobTitle === "DEALER"
  if (salesIsDealer && dealerWalletData?.financial) {
    return Number(dealerWalletData.financial.availableAmount) || 0
  }
  if (isDealer && walletData?.financial) {
    return Number(walletData.financial.availableAmount) || 0
  }
  return Number(dealerWalletData?.financial?.availableAmount ?? walletData?.financial?.availableAmount) || 0
}
