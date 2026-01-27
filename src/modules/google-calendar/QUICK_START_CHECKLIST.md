# Google Calendar Integration - Quick Start Checklist

## ✅ Pre-requisites

- [ ] Node.js >= 20.x installed
- [ ] npm >= 10.x installed
- [ ] Monday.com app created with App ID
- [ ] Server accessible from internet (for webhooks)

## 🔐 Google Cloud Setup

### Step 1: Create Google Cloud Project
- [ ] Go to https://console.cloud.google.com/
- [ ] Create new project or select existing one
- [ ] Note the project name

### Step 2: Enable Google Calendar API
- [ ] Navigate to "APIs & Services" > "Library"
- [ ] Search for "Google Calendar API"
- [ ] Click "Enable"

### Step 3: Create OAuth Credentials
- [ ] Go to "APIs & Services" > "Credentials"
- [ ] Click "Create Credentials" > "OAuth client ID"
- [ ] Configure OAuth consent screen if prompted:
  - [ ] User Type: External
  - [ ] App name: "Monday.com Calendar Integration"
  - [ ] User support email: your-email@example.com
  - [ ] Scopes: Add Calendar scopes
  - [ ] Test users: Add your email
- [ ] Application type: "Web application"
- [ ] Name: "Monday Calendar Integration"
- [ ] Authorized redirect URIs: Add your callback URL
  ```
  https://YOUR-DOMAIN/api/v1/google-calendar/auth/callback
  ```
  Replace YOUR-DOMAIN with your actual domain:
  ```
  https://10692458-c8fb883492d5.apps-tunnel.monday.app/api/v1/google-calendar/auth/callback
  ```
- [ ] Click "Create"
- [ ] **Copy Client ID and Client Secret** (you'll need these!)

## 🔧 Backend Configuration

### Step 1: Update Environment Variables
- [ ] Open `.env` file in `nestjs-monday-backend`
- [ ] Update these values:
  ```env
  GOOGLE_CLIENT_ID=paste-your-client-id-here
  GOOGLE_CLIENT_SECRET=paste-your-client-secret-here
  GOOGLE_REDIRECT_URI=https://your-domain/api/v1/google-calendar/auth/callback
  ```

### Step 2: Verify Dependencies
- [ ] Run `npm install` to ensure googleapis is installed
- [ ] Check package.json includes:
  ```json
  {
    "googleapis": "^latest"
  }
  ```

### Step 3: Build and Start
- [ ] Run `npm run build` to verify compilation
- [ ] Run `npm run dev` to start development server
- [ ] Verify server is running on configured port

### Step 4: Verify Module Registration
- [ ] Check `src/app/app.module.ts` includes `GoogleCalendarModule`
- [ ] No compilation errors

## 🧪 Testing

### Test 1: OAuth Flow
- [ ] Open browser to:
  ```
  https://your-domain/api/v1/google-calendar/auth/connect?userId=test-user-123
  ```
- [ ] Should redirect to Google authorization page
- [ ] Grant permissions
- [ ] Should see success message
- [ ] Window should auto-close

### Test 2: Webhook Endpoint
- [ ] Use curl or Postman to test webhook:
  ```bash
  curl -X POST https://your-domain/api/v1/google-calendar/webhook \
    -H "x-goog-channel-id: test" \
    -H "x-goog-resource-id: test" \
    -H "x-goog-resource-uri: test" \
    -H "x-goog-resource-state: sync"
  ```
- [ ] Should return `{"success": true}`

### Test 3: End-to-End Flow
1. **Prepare Monday Board:**
   - [ ] Create a board in Monday.com
   - [ ] Note the Board ID from URL
   - [ ] Create a parent item
   - [ ] Note the Item ID
   - [ ] Ensure board has these columns:
     - [ ] Person column
     - [ ] Number column (for hours)
     - [ ] Date column
     - [ ] Text column

2. **Connect Calendar:**
   - [ ] Get your Monday user ID
   - [ ] Navigate to auth/connect endpoint with your user ID
   - [ ] Authorize Google Calendar access
   - [ ] Verify success message

3. **Create Calendar Event:**
   - [ ] Open Google Calendar
   - [ ] Create new event:
     - [ ] Title: "Test Task"
     - [ ] Time: Choose start and end time
     - [ ] Description:
       ```
       Testing Monday integration

       monday-item-id: YOUR_ITEM_ID
       monday-board-id: YOUR_BOARD_ID
       ```
     - [ ] Save event

4. **Verify Subitem Created:**
   - [ ] Check Monday board
   - [ ] Look for new subitem under parent item
   - [ ] Verify subitem has:
     - [ ] Correct name
     - [ ] Your email as assignee
     - [ ] Calculated duration
     - [ ] Start date/time
     - [ ] Description

## 🎨 Frontend Integration (Optional)

### Add UI Component
- [ ] Copy `GoogleCalendarIntegration.tsx` to your frontend
- [ ] Import and use in your Monday app view
- [ ] Update server URL to match your backend
- [ ] Test connection flow from UI

## 🔍 Verification Checklist

### Backend
- [ ] ✅ No TypeScript compilation errors
- [ ] ✅ Server starts without errors
- [ ] ✅ All routes registered correctly
- [ ] ✅ Webhook endpoint accessible from internet

### Google Cloud
- [ ] ✅ Calendar API enabled
- [ ] ✅ OAuth credentials created
- [ ] ✅ Redirect URI configured
- [ ] ✅ OAuth consent screen configured

### Configuration
- [ ] ✅ `.env` file updated with credentials
- [ ] ✅ Redirect URI matches in both places
- [ ] ✅ Server URL accessible from internet

### Functionality
- [ ] ✅ OAuth flow works
- [ ] ✅ Calendar connection succeeds
- [ ] ✅ Webhooks received
- [ ] ✅ Subitems created automatically
- [ ] ✅ Column values populated correctly

## 📋 Monday Board Column IDs

**Important:** You need to update column IDs in the code to match your board!

1. **Get Column IDs:**
   ```graphql
   query {
     boards(ids: YOUR_BOARD_ID) {
       columns {
         id
         title
         type
       }
     }
   }
   ```

2. **Update Code:**
   - [ ] Open `src/modules/google-calendar/calendar-subitem.service.ts`
   - [ ] Go to line ~140-148 (columnValues object)
   - [ ] Replace column IDs:
     ```typescript
     const columnValues = {
       person: { personsAndTeams: [{ id: assignee, kind: 'person' }] },  // Person column
       numbers: duration,                                                  // Number column
       date: {                                                             // Date column
         date: new Date(startTime).toISOString().split('T')[0],
         time: new Date(startTime).toTimeString().slice(0, 5),
       },
       text: description || '',                                            // Text column
     };
     ```
   - [ ] Change `person`, `numbers`, `date`, `text` to your actual column IDs
   - [ ] Example:
     ```typescript
     const columnValues = {
       person0: { personsAndTeams: [{ id: assignee, kind: 'person' }] },
       numbers1: duration,
       date4: { ... },
       text7: description || '',
     };
     ```

## 🚨 Common Issues

### Issue: OAuth redirect doesn't work
**Solution:**
- Verify redirect URI in Google Console matches exactly
- Ensure URI uses HTTPS
- Check for typos in domain

### Issue: Webhooks not received
**Solution:**
- Verify server is publicly accessible
- Check firewall settings
- Test with curl/Postman first

### Issue: Subitems not created
**Solution:**
- Check event description format
- Verify item ID and board ID are correct
- Check server logs for errors
- Verify column IDs in code match your board

### Issue: Column values not populated
**Solution:**
- Update column IDs in calendar-subitem.service.ts
- Verify column types match (person, number, date, text)
- Check Monday API responses in logs

## 📞 Getting Help

If you encounter issues:

1. **Check Logs:**
   ```bash
   npm run dev
   # Look for errors in console
   ```

2. **Review Documentation:**
   - README.md - Full documentation
   - SETUP_GUIDE.vi.md - Vietnamese setup guide
   - IMPLEMENTATION_SUMMARY.md - Technical details

3. **Common Debugging Steps:**
   - Verify all environment variables set
   - Check Google Cloud Console for API errors
   - Test OAuth flow manually
   - Verify webhook endpoint with curl
   - Check Monday API responses

## ✨ Success Criteria

Your integration is working when:
- ✅ You can connect your Google Calendar
- ✅ Creating a calendar event with Monday metadata automatically creates a subitem
- ✅ Subitem has correct name, assignee, duration, and date
- ✅ No errors in server logs
- ✅ Webhooks are received and processed

## 🎉 Next Steps After Success

1. **Customize:**
   - Add more column mappings
   - Customize subitem naming
   - Add event update/delete handling

2. **Improve UX:**
   - Add connection status indicator
   - Show list of connected calendars
   - Add disconnect functionality
   - Build UI for easier setup

3. **Production:**
   - Setup monitoring
   - Add error notifications
   - Implement logging
   - Add rate limiting
   - Setup webhook renewal

---

**Need Help?** Check the documentation files or review the code comments for more details.
