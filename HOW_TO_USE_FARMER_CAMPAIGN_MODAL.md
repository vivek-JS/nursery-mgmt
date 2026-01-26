# How to Use Farmer Campaign Modal

## 📍 Where to Open

### Step 1: Navigate to WhatsApp Management Page
- **URL Path**: `/u/whatsapp`
- **Menu**: Look for "WhatsApp" or "WhatsApp Management" in your navigation menu
- **Access**: Requires WhatsApp access permissions (typically Super Admin)

### Step 2: Find Approved Templates
- On the WhatsApp Management page, you'll see a table of WhatsApp templates
- Look for templates with status **"APPROVED"** (green badge)
- Only approved templates can be sent

### Step 3: Click the Send Button
- Find the **blue Send icon button** (📤) in the "Actions" column
- **Tooltip**: "Send to Multiple Farmers"
- Click it to open the Farmer Campaign Modal

---

## 🎯 Using the Modal

### Data Source Selection

#### Option 1: Old Farmers Data
1. Select **"Old Farmers Data"** toggle (database icon)
2. Farmers from your existing database will load automatically
3. You can also select from saved farmer lists using the dropdown

#### Option 2: Public Link Leads
1. Select **"Public Link Leads"** toggle (link icon)
2. Choose a public link from the dropdown
3. Leads from that public link will load automatically

### Selecting Farmers

1. **Search**: Use the search box to find farmers by name, mobile, or village
2. **Filter**: Use dropdowns to filter by District, Taluka, or Village
3. **Select**: 
   - Check individual farmers
   - Or use the checkbox in the header to "Select All"
4. **View Selection**: See selected count at the bottom

### Template Parameters

- If your template has variables (like `{{name}}`, `{{village}}`), fill them in
- These values will be replaced in the message for each farmer

### Sending Messages

1. Review your selected farmers (shown at bottom)
2. Fill template parameters if needed
3. Click **"Send to X Farmers"** button (green button at bottom)
4. Wait for confirmation - messages will be sent via WhatsApp

---

## 🔄 Complete Flow Diagram

```
1. Navigate to /u/whatsapp
   ↓
2. Find APPROVED template
   ↓
3. Click Send button (📤)
   ↓
4. Modal Opens
   ↓
5. Choose Data Source:
   ├─ Old Farmers Data → Loads from database
   └─ Public Link Leads → Select link → Loads leads
   ↓
6. Select Farmers:
   ├─ Search/Filter
   ├─ Check individual farmers
   └─ Or Select All
   ↓
7. Fill Template Parameters (if any)
   ↓
8. Click "Send to X Farmers"
   ↓
9. Messages sent via WhatsApp ✅
```

---

## 💡 Tips

- **Old Farmers Data**: Use for existing farmers in your system
- **Public Link Leads**: Use for new leads collected from public forms
- **Saved Lists**: For old farmers, you can use pre-saved farmer lists
- **Bulk Selection**: Use filters + Select All for bulk campaigns
- **Template Status**: Only "APPROVED" templates can be sent

---

## 🚨 Important Notes

- You need WhatsApp access permissions to use this feature
- Only approved templates can be sent
- Make sure farmers have valid mobile numbers
- Template parameters are optional but recommended for personalization
- The modal shows source indicator (chip) for each farmer

---

## 📞 Support

If you encounter issues:
1. Check that you have WhatsApp access permissions
2. Verify template is approved
3. Ensure farmers have valid mobile numbers
4. Check browser console for errors
