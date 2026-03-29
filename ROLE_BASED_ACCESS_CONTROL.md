# Role-Based Access Control Implementation

## Overview

Role-based access control for WhatsApp Management and the Accounting Dashboard in the nursery management system. The standalone Payments page (`/u/payments`) has been removed; accountants use **Accounting Dashboard** (`/u/accountant-dashboard`) for payment workflows.

## Features Implemented

### 1. WhatsApp Management Access Control

- **Restricted to**: SUPER_ADMIN only
- **Implementation**:
  - Menu item hidden for non-SUPER_ADMIN users
  - Component-level access guard with "Access Denied" message
  - Route protection

### 2. Accounting Dashboard

- **Restricted to**: ACCOUNTANT and SUPER_ADMIN (via menu `allowedRoles` and layout rules)
- **Implementation**: Menu entry **Accounting Dashboard**; payment APIs are shared with previous `/u/payments` behavior via `features/accountant-dashboard/paymentsApi.js`

### 3. Super Admin Privileges

- **SUPER_ADMIN has access to**: All features including WhatsApp and Accounting Dashboard
- **Implementation**: SUPER_ADMIN bypasses role restrictions in `hasMenuAccess`

## Technical Implementation

### 1. Enhanced Role Utilities (`src/utils/roleUtils.js`)

- `useHasWhatsAppAccess()` — SUPER_ADMIN only
- `useHasPaymentAccess()` / related helpers for payment operations
- `useHasMenuAccess(menuTitle)` — generic menu access checker

### 2. Updated Menu System (`src/router/routes/dashboardRoutes.js`)

- Labs: `["LABORATORY_MANAGER", "SUPER_ADMIN"]`
- Accounting Dashboard: `["ACCOUNTANT", "SUPER_ADMIN"]`
- WhatsApp Management: `["SUPER_ADMIN"]`

### 3. Enhanced MenuPath Class (`src/router/core.js`)

- `constructor(title, icon, route, alias = null, allowedRoles = null)`

### 4. Updated Private Layout (`src/layout/privateLayout/index.jsx`)

- `hasMenuAccess()` checks user role against menu `allowedRoles`
- ACCOUNTANT sidebar limited to **Orders** (dashboard) and **Accounting Dashboard**

### 5. Component-Level Access Guards

#### WhatsApp Management (`src/pages/private/whatsapp/WhatsAppManagement.js`)

- Access check at component start
- "Access Denied" for unauthorized users

## Role Hierarchy

1. **SUPER_ADMIN**: Full access
2. **ACCOUNTANT**: Accounting Dashboard + dashboard orders + standard features
3. **LABORATORY_MANAGER**: Labs + standard features
4. **Other roles**: Standard features (no WhatsApp Management)

## Testing

1. **Login as different user roles**:
   - SUPER_ADMIN: sees WhatsApp Management and Accounting Dashboard
   - ACCOUNTANT: sees Accounting Dashboard and Orders (dashboard); not WhatsApp
   - LABORATORY_MANAGER: Labs; not WhatsApp

2. **Direct URL access**:
   - `/u/whatsapp` as non-SUPER_ADMIN → "Access Denied"

## Files Modified (historical)

1. `src/utils/roleUtils.js`
2. `src/router/routes/dashboardRoutes.js`
3. `src/router/core.js`
4. `src/layout/privateLayout/index.jsx`
5. `src/pages/private/whatsapp/WhatsAppManagement.js`
6. `src/features/accountant-dashboard/` — payment listing and APIs

## Future Enhancements

- More granular permissions (read-only vs full access)
- Audit logging for access attempts
- Role management UI for SUPER_ADMIN
