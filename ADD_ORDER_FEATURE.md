# Add Order Feature

## Overview

The Add Order feature allows users to create new orders directly from the dashboard. This feature replicates the functionality from the Android app and provides a comprehensive form for order creation with role-based access control.

## Features

### Role-Based Access Control

- **DEALER**: Can create farmer orders and dealer orders with quota management
- **OFFICE_STAFF**: Can create normal, instant, and bulk orders with salesmen access control
- **OFFICE_ADMIN**: Can create normal, instant, and bulk orders, assign to salespeople/dealers, and control salesmen access
- **Other roles**: Can create basic orders

### Order Types

1. **Normal Order**: Standard order processing
2. **Instant Order**: Automatically marked as DISPATCHED
3. **Bulk Order**: For dealer orders or large quantities
4. **Farmer Order**: Individual farmer orders
5. **Dealer Order**: Orders placed by dealers

### Form Features

- **Auto-fill farmer data**: When a valid mobile number is entered, farmer details are automatically populated
- **Cascading dropdowns**: State → District → Taluka → Village
- **Plant selection**: Plant → Subtype → Slot with availability
- **Quota management**: For dealers, shows remaining quota for selected slots
- **Salesmen access control**: For bulk orders, restrict access to specific salespeople
- **Real-time validation**: Form validation with helpful error messages
- **Rate auto-population**: Rate is automatically set based on selected plant subtype

## Usage

### Accessing the Form

1. Navigate to the Dashboard
2. Click the "Add Order" button in the top-right corner
3. The form will open in a modal dialog

### Creating an Order

1. **Select Order Type** (if applicable for your role)
2. **Configure Salesmen Access** (for OFFICE_STAFF and OFFICE_ADMIN):
   - Choose "Allow All Salesmen Access" or "Restrict to Selected Salesmen Only"
   - If restricting, select specific salesmen from the modal
3. **Fill in Farmer Details**:
   - Mobile number (auto-fills farmer data if found)
   - Name, Village, Taluka, District, State
4. **Select Plant Details**:
   - Plant type
   - Subtype (auto-sets rate)
   - Cavity type
   - Slot (shows availability)
5. **Enter Order Details**:
   - Number of plants
   - Rate (auto-populated)
6. **Select Quota Type** (for dealers only)
7. **Click "Add Order"**

### Form Validation

The form validates:

- Required fields based on order type
- Mobile number format (10 digits)
- Quota type selection (for dealers)
- Slot availability
- Salesmen selection (for restricted orders by office users)

## API Endpoints

The feature uses the following API endpoints:

- `GET /districts/states` - Get all states
- `GET /districts/districts` - Get districts by state
- `GET /districts/taluks` - Get taluks by state and district
- `GET /districts/villages` - Get villages by taluk, district, and state
- `GET /plantcms/plants` - Get all plants
- `GET /slots/subtyps` - Get plant subtypes
- `GET /slots/getslots` - Get available slots
- `GET /user/salespeople` - Get salespeople
- `GET /usera/dealers` - Get dealers
- `GET /farmer/getFarmers` - Get farmer by mobile number
- `POST /farmer/createFarmer` - Create farmer order
- `POST /order/dealer-order` - Create dealer order
- `PUT /salesmen-access` - Update salesmen restrictions for slots

## File Structure

```
src/pages/private/order/
├── AddOrderForm.jsx          # Main form component
└── index.js                  # Existing order table

src/pages/private/dashboard/
├── index.jsx                 # Updated dashboard with Add Order button
└── FarmerOrdersTable.js      # Existing orders table

src/network/config/
└── endpoints.js              # Updated with new API endpoints

src/utils/
└── roleUtils.js              # Role-based access control utilities
```

## Components

### AddOrderForm.jsx

Main form component with the following sections:

1. **Order Type Selector**: Radio buttons for different order types
2. **Salesmen Access Control**: For OFFICE_STAFF and OFFICE_ADMIN, restrict access to specific salespeople
3. **Quota Type Selector**: For dealer quota management
4. **Order Details**: Date and salesperson selection
5. **Farmer Details**: Personal and location information
6. **Plant Details**: Plant selection and configuration

### Key Features

- **Responsive Design**: Works on desktop and mobile
- **Loading States**: Shows loading indicators during API calls
- **Error Handling**: Comprehensive error messages
- **Auto-refresh**: Refreshes the orders table after successful creation
- **Form Reset**: Clears form data when closed

## Dependencies

The feature uses the following Material-UI components:

- Dialog, TextField, Select, Button, Card, etc.
- DatePicker for date selection
- Radio buttons for order type selection
- Alert for quota information display

## Future Enhancements

Potential improvements:

1. **Bulk Import**: CSV/Excel import for multiple orders
2. **Order Templates**: Save common order configurations
3. **Advanced Validation**: More sophisticated validation rules
4. **Order Preview**: Preview order before submission
5. **Integration**: Connect with inventory management system

## Troubleshooting

### Common Issues

1. **Form not loading**: Check network connectivity and API endpoints
2. **Validation errors**: Ensure all required fields are filled
3. **Auto-fill not working**: Verify mobile number format and farmer data
4. **Quota not showing**: Check dealer wallet API response

### Debug Mode

Enable console logging to debug API calls and form state:

```javascript
// Add to AddOrderForm.jsx for debugging
console.log("Form Data:", formData)
console.log("API Response:", response)
```
