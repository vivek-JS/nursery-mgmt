# Broadcast List Feature - Complete Guide

## Overview
The Broadcast List feature allows you to create reusable lists of farmers from multiple data sources for WhatsApp campaigns. You can select farmers from:
1. **Old Farmers** - Existing farmers in your system
2. **Old Sales Data** - Historical sales data with farmer information
3. **Public Link Leads** - Leads collected from public forms

## How to Use

### Step 1: Navigate to WhatsApp Management
- Go to `/u/whatsapp` in your browser
- You'll see the WhatsApp Management page with templates and broadcast lists section

### Step 2: Create a Broadcast List
1. Click the **"Create Broadcast List"** button at the top of the Broadcast Lists section
2. A modal will open where you can:
   - Select data source (Old Farmers / Old Sales Data / Public Link Leads)
   - Filter by district, taluka, and village
   - Search by name, mobile, or village
   - Select individual farmers or select all
   - Enter a name for your list
   - Save the list

### Step 3: Select Data Source

#### Option A: Old Farmers
- Toggle to **"Old Farmers"**
- All farmers from your database will load automatically
- Use filters to narrow down the selection

#### Option B: Old Sales Data
- Toggle to **"Old Sales Data"**
- Historical sales data will load (up to 1000 records)
- All filters (district, taluka, village) are available
- Data is normalized to match farmer structure

#### Option C: Public Link Leads
- Toggle to **"Public Link Leads"**
- Select a public link from the dropdown
- Leads from that link will load automatically
- Filter and select as needed

### Step 4: Filter and Select Farmers
1. **Search**: Use the search box to find farmers by name, mobile, or village
2. **Filter**: Use dropdowns to filter by:
   - District
   - Taluka
   - Village
3. **Select**: 
   - Check individual farmers
   - Or use the checkbox in the header to "Select All"
4. **View Selection**: See selected count at the bottom

### Step 5: Save the List
1. Enter a descriptive name for your broadcast list
2. Click **"Save List"** button
3. The list will be saved and appear in the Broadcast Lists section
4. You can now use this list when sending WhatsApp campaigns

### Step 6: Use Broadcast List in Campaigns
1. When sending a WhatsApp campaign:
   - Click the Send button (📤) on an approved template
   - In the Farmer Campaign Modal, select **"Old Farmers Data"**
   - Choose your saved broadcast list from the dropdown
   - All farmers from the list will be auto-selected
   - Fill template parameters and send

## Features

### ✅ Multiple Data Sources
- **Old Farmers**: Current system farmers
- **Old Sales Data**: Historical sales records
- **Public Link Leads**: Form submissions

### ✅ Advanced Filtering
- Filter by District, Taluka, Village
- Search by name, mobile number, or village
- Real-time filtering as you type

### ✅ Bulk Selection
- Select individual farmers
- Select all filtered farmers
- See selection count in real-time

### ✅ Source Indicators
- Each farmer shows a chip indicating data source:
  - "Old Farmer" (default)
  - "Old Sales" (warning color)
  - "Public Lead" (primary color)

### ✅ List Management
- Create multiple broadcast lists
- View list count and farmer count
- Lists are saved and reusable
- Use lists across multiple campaigns

## API Endpoints Used

1. **Get Old Farmers**: `GET /api/v1/farmer/getFarmers`
2. **Get Old Sales Data**: `GET /api/v1/old-sales/geo-summary?limit=1000&sortBy=totalInvoiceAmount&sortOrder=desc`
3. **Get Public Links**: `GET /api/v1/public-links/links`
4. **Get Public Link Leads**: `GET /api/v1/public-links/links/leads/:id`
5. **Create Broadcast List**: `POST /api/v1/farmer-list` (with name and farmerIds)

## Data Normalization

All data sources are normalized to a common structure:
```javascript
{
  _id: string,
  id: string,
  name: string,
  mobileNumber: string,
  village: string,
  taluka: string,
  district: string,
  state: string,
  source: "oldFarmer" | "oldSales" | "publicLead"
}
```

## Tips

- **Naming Convention**: Use descriptive names like "Nashik District Farmers" or "Jamner Watermelon Campaign"
- **Filter First**: Apply filters before selecting to reduce the list size
- **Combine Sources**: Create separate lists from different sources and use them together
- **Regular Updates**: Update lists periodically as new farmers/leads are added
- **Test Lists**: Create small test lists first to verify the flow

## Troubleshooting

### No farmers showing up?
- Check if filters are too restrictive
- Verify the data source has data
- For public leads, ensure a link is selected

### Can't save list?
- Ensure at least one farmer is selected
- Enter a list name
- Check browser console for errors

### List not appearing in campaign modal?
- Refresh the page
- Ensure you selected "Old Farmers Data" source
- Check if the list was saved successfully

## Future Enhancements

- Edit existing broadcast lists
- Delete broadcast lists
- Combine multiple lists
- Export lists to CSV
- Schedule campaigns using lists
- List analytics and statistics
