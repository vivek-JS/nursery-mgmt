# Testing Public Farmer Link (Mobile & Desktop)

## Prerequisites

1. **Backend must be running** (port 8000)
2. **At least one public link must exist** in the database with an active status

## Step 1: Create a Test Link (if needed)

1. Start the frontend: `npm start`
2. Login as SUPERADMIN
3. Navigate to **Public Links** in the sidebar
4. Create a new link:
   - Name: "Test Mobile Link"
   - Slug: "test-mobile-link"
   - Select a state, district(s), taluka(s), village(s)
   - Mark as **Active**
   - Click **Save Link**
5. Copy the public URL (e.g., `http://localhost:3001/#/public/add-farmer/test-mobile-link`)

## Step 2: Test Locally (Desktop - Simulate Mobile)

### Option A: Browser DevTools (Recommended)
1. Open Chrome/Edge DevTools (F12)
2. Click the **Device Toolbar** icon (Ctrl+Shift+M / Cmd+Shift+M)
3. Select a mobile device (e.g., iPhone 12, Galaxy S20)
4. Open the public link in an **Incognito/Private Window**:
   ```
   http://localhost:3001/#/public/add-farmer/test-mobile-link
   ```
5. **Verify:**
   - ✅ Form loads without login
   - ✅ No redirect to login page
   - ✅ Dropdowns show only configured locations
   - ✅ Form is mobile-responsive
   - ✅ Submit works without authentication

### Option B: Clear Browser Data (Simulate Logged Out)
1. Open DevTools (F12)
2. Go to **Application** tab
3. **Clear Storage:**
   - Right-click on `localhost:3001` → Clear
   - Or manually clear:
     - Local Storage → Clear All
     - Session Storage → Clear All
     - Cookies → Clear All
4. Refresh the page with the public link
5. **Verify:** Form loads without requiring login

## Step 3: Test on Real Mobile Device

### Find Your Local IP Address

**On Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
Look for something like: `192.168.1.100` or `10.0.0.50`

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your network adapter

### Start Dev Server with Network Access

React's default dev server only allows `localhost`. To allow mobile access:

**Option 1: Set HOST environment variable**
```bash
# Mac/Linux
HOST=0.0.0.0 npm start

# Windows (PowerShell)
$env:HOST="0.0.0.0"; npm start
```

**Option 2: Modify package.json temporarily**
Add to the start script:
```json
"start": "HOST=0.0.0.0 env-cmd -f .env.dev react-scripts start"
```

### Access from Mobile Device

1. Ensure your mobile device is on the **same Wi-Fi network** as your computer
2. Start the dev server with network access (see above)
3. Note the local IP (e.g., `192.168.1.100`)
4. Open the public link on your mobile browser:
   ```
   http://192.168.1.100:3001/#/public/add-farmer/test-mobile-link
   ```
   ⚠️ **Replace `192.168.1.100` with your actual local IP**

5. **Verify:**
   - ✅ Form loads without login
   - ✅ No redirect to login page
   - ✅ Mobile UI is responsive
   - ✅ Dropdowns work on mobile
   - ✅ Form submission works

## Step 4: Test on Production

1. **Create a link on production** (if not exists)
2. Copy the production URL:
   ```
   https://nursery-mgmt.onrender.com/#/public/add-farmer/jamner-watermelon
   ```
3. **Test on Mobile:**
   - Open the URL in **Incognito/Private Mode** on mobile
   - Or clear browser data first
   - Verify it works without login

4. **Test on Desktop:**
   - Open in **Incognito Window**
   - Verify no redirect to login

## Step 5: Verify No Authentication Required

### Check Network Tab
1. Open DevTools → **Network** tab
2. Filter by **XHR/Fetch**
3. Load the public link
4. **Verify:**
   - ✅ `GET /api/v1/public-links/config/:slug` returns 200 (no 401)
   - ✅ No authentication headers sent
   - ✅ `POST /api/v1/public-links/leads` works without token

### Check Console
1. Open DevTools → **Console**
2. **Verify:** No auth-related errors:
   - ❌ "Access token required"
   - ❌ "Refresh token is required"
   - ❌ "401 Unauthorized"
   - ❌ Any redirect to `/auth/login`

## Quick Test Checklist

- [ ] Form loads without login (desktop)
- [ ] Form loads without login (mobile)
- [ ] No redirect to login page
- [ ] Only configured locations appear in dropdowns
- [ ] Form is mobile-responsive
- [ ] Auto-select works (if only 1 option)
- [ ] Form submission works without token
- [ ] Success message appears in Marathi
- [ ] Error handling works (keeps form data)
- [ ] Works in incognito mode

## Troubleshooting

### "Link not available" Error
- Check if the slug exists in database
- Verify the link is marked as **Active**
- Check backend logs for errors

### Redirects to Login
- Clear browser cache and localStorage
- Use incognito mode
- Check router configuration (public routes first)

### 401 Unauthorized Errors
- Verify backend routes have `bypassAuth` middleware
- Check `parameterWhiteListing` middleware bypass
- Ensure CORS is configured for public endpoints

### Mobile Can't Access Local Server
- Verify same Wi-Fi network
- Check firewall settings
- Use `HOST=0.0.0.0` when starting dev server
- Verify local IP address is correct

## Test Script

You can also test the backend API directly:

```bash
# Test public config endpoint (no auth required)
curl 'http://localhost:8000/api/v1/public-links/config/test-mobile-link' \
  -H 'Accept: application/json'

# Test lead submission (no auth required)
curl -X POST 'http://localhost:8000/api/v1/public-links/leads' \
  -H 'Content-Type: application/json' \
  -d '{
    "slug": "test-mobile-link",
    "name": "Test Farmer",
    "mobileNumber": "9999999999",
    "stateCode": "MH",
    "stateName": "Maharashtra",
    "districtCode": "Nashik",
    "districtName": "Nashik",
    "talukaCode": "Nashik",
    "talukaName": "Nashik",
    "villageName": "TestVillage"
  }'
```

Both should return 200 OK without authentication.





