# Google Calendar Integration - Implementation Summary

## 📋 Overview

Đã implement thành công hệ thống tích hợp Google Calendar với Monday.com theo yêu cầu:

**Workflow:**
1. PM tạo parent item trên Monday (ví dụ: "Viết phần Introduction" với assignees A, B và planned time 12 giờ)
2. Team member (A) kết nối Google Calendar của họ
3. Khi A tạo calendar event, hệ thống tự động tạo subitem dưới parent item của PM

## 📁 Files Created

### Backend (nestjs-monday-backend)

#### DTOs
- `src/modules/google-calendar/dto/calendar-event.dto.ts` - DTO cho calendar events
- `src/modules/google-calendar/dto/webhook-notification.dto.ts` - DTO cho webhook notifications
- `src/modules/google-calendar/dto/create-subitem-from-calendar.dto.ts` - DTO cho subitem creation

#### Types
- `src/modules/google-calendar/@types/calendar-event.type.ts` - TypeScript types cho calendar events và mappings

#### Services
- `src/modules/google-calendar/google-calendar.service.ts` - Service để interact với Google Calendar API
  - OAuth flow management
  - Calendar event CRUD operations
  - Webhook setup và management
  - Duration calculation
  
- `src/modules/google-calendar/calendar-subitem.service.ts` - Service để tạo subitems trong Monday
  - Extract metadata từ calendar events
  - Create subitems với proper column values
  - Store event-to-subitem mappings
  - Integration với Monday API

#### Controllers
- `src/modules/google-calendar/webhooks/calendar-webhook.controller.ts` - Controller xử lý:
  - Google Calendar webhooks
  - OAuth authentication flow
  - Calendar connection management

#### Module
- `src/modules/google-calendar/google-calendar.module.ts` - NestJS module configuration

#### Documentation
- `src/modules/google-calendar/README.md` - Chi tiết documentation (English)
- `src/modules/google-calendar/SETUP_GUIDE.vi.md` - Hướng dẫn setup (Tiếng Việt)

### Frontend (nestjs-monday-frontend)

- `src/features/google-calendar-integration/GoogleCalendarIntegration.tsx` - React component cho calendar connection UI

### Configuration

- `.env` - Đã thêm Google Calendar credentials
- `src/app/app.module.ts` - Đã import GoogleCalendarModule

## 🔧 Technical Implementation

### Architecture

```
Google Calendar
     │
     │ Push Notifications
     │ (Webhooks)
     ▼
CalendarWebhookController
     │
     ├─► GoogleCalendarService
     │   - OAuth management
     │   - Fetch events
     │   - Parse metadata
     │
     └─► CalendarSubitemService
         - Extract Monday metadata
         - Create subitems via Monday API
         - Store mappings
```

### Key Features

1. **OAuth 2.0 Authentication**
   - Secure token storage in Monday.com secure storage
   - Automatic token refresh
   - Per-user authorization

2. **Real-time Synchronization**
   - Google Calendar Push Notifications
   - Webhook verification
   - Event change detection

3. **Metadata Extraction**
   - Support for description-based metadata
   - Support for extended properties (preferred)
   - Automatic parsing of Monday item IDs

4. **Subitem Creation**
   - Automatic column mapping
   - Duration calculation
   - Assignee detection from calendar creator

5. **Data Persistence**
   - Event-to-subitem mappings
   - OAuth tokens
   - Channel information for webhooks

## 🚀 Setup Required

### 1. Google Cloud Console

1. Create project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `https://your-domain/api/v1/google-calendar/auth/callback`

### 2. Environment Variables

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain/api/v1/google-calendar/auth/callback
```

### 3. Dependencies Installed

```json
{
  "googleapis": "^latest",
  "@types/node": "^latest"
}
```

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/google-calendar/auth/connect` | GET | Initiate OAuth flow |
| `/api/v1/google-calendar/auth/callback` | GET | OAuth callback handler |
| `/api/v1/google-calendar/webhook` | POST | Receive Google Calendar webhooks |

## 💾 Data Storage

### Monday.com Secure Storage

1. **OAuth Tokens**: `google-calendar-tokens:{userId}`
   ```json
   {
     "access_token": "...",
     "refresh_token": "...",
     "expiry_date": 1234567890
   }
   ```

2. **Calendar Channels**: `calendar-channel:{userId}`
   ```json
   {
     "channelId": "...",
     "resourceId": "...",
     "calendarId": "primary",
     "userId": "123",
     "expiration": 1234567890
   }
   ```

3. **Event Mappings**: `calendar-event-mapping:{eventId}`
   ```json
   {
     "eventId": "...",
     "parentItemId": 123456,
     "subitemId": 789012,
     "boardId": 987654,
     "assignee": "user@email.com",
     "createdAt": "2026-01-26T..."
   }
   ```

## 🎯 Usage Flow

### For Team Members

1. **Connect Calendar** (one-time setup)
   ```
   Click "Connect Google Calendar" in Monday app
   → Authorize the app
   → Calendar watch is automatically set up
   ```

2. **Create Calendar Event**
   ```
   Event: "Working on Introduction section"
   Time: 9:00 AM - 12:00 PM (3 hours)
   Description:
     monday-item-id: 123456789
     monday-board-id: 987654321
   ```

3. **Automatic Subitem Creation**
   ```
   Subitem is created with:
   - Name: "Working on Introduction section"
   - Assignee: User who created the event
   - Duration: 3 hours (calculated)
   - Date/Time: Jan 26, 2026 9:00 AM
   - Description: Event description
   ```

## 🔒 Security Features

- ✅ OAuth 2.0 secure authentication
- ✅ Tokens stored in Monday.com secure storage (encrypted)
- ✅ Webhook verification via channel ID
- ✅ Per-user authorization (users only access their own calendars)
- ✅ HTTPS-only communication
- ✅ No credentials in code or version control

## 📝 Column Mapping

Current implementation maps to these Monday.com column types:

| Monday Column | Type | Source |
|--------------|------|--------|
| `person` | Person | Event creator email |
| `numbers` | Number | Calculated duration (hours) |
| `date` | Date | Event start date & time |
| `text` | Text | Event description |

**Note:** Column IDs need to be adjusted in `calendar-subitem.service.ts` to match your board structure.

## 🛠️ Customization Points

1. **Column Mapping** - `calendar-subitem.service.ts` line 140-148
   - Modify to match your board's column structure
   - Add/remove columns as needed

2. **Metadata Format** - `google-calendar.service.ts`
   - Change description parsing regex
   - Add custom metadata fields

3. **Subitem Naming** - `calendar-subitem.service.ts`
   - Customize how subitem names are generated
   - Add prefixes/suffixes

## ✅ Testing Checklist

- [ ] Google Cloud Console setup complete
- [ ] Environment variables configured
- [ ] Server running and accessible from internet
- [ ] OAuth flow works (can connect calendar)
- [ ] Webhook endpoint receives notifications
- [ ] Calendar events with metadata create subitems
- [ ] Column values populated correctly
- [ ] Multiple users can connect their calendars
- [ ] Mappings stored and retrievable

## 📚 Next Steps

1. **Test the integration:**
   - Setup Google Cloud credentials
   - Update .env file
   - Connect a calendar
   - Create test events

2. **Customize columns:**
   - Identify your board's column IDs
   - Update column mapping in code

3. **Deploy:**
   - Ensure webhook URL is publicly accessible
   - Setup SSL/HTTPS if not already
   - Monitor logs for any issues

4. **Optional enhancements:**
   - Add UI in Monday app for easier connection
   - Show connection status
   - List connected calendars
   - Disconnect functionality
   - Sync existing events
   - Update subitems when events change
   - Delete subitems when events deleted

## 🐛 Troubleshooting

### Events not creating subitems
- Check event description has correct format
- Verify webhook URL is accessible
- Check server logs for errors
- Ensure user authorized calendar access

### OAuth fails
- Verify credentials in .env
- Check redirect URI matches Google Console
- Ensure all scopes granted

### Webhook not receiving notifications
- Verify server is publicly accessible
- Check webhook channel hasn't expired
- Review Google Cloud Console logs

## 📞 Support

For issues or questions:
1. Check logs in backend server
2. Verify setup steps in SETUP_GUIDE.vi.md
3. Review README.md for detailed documentation
4. Check Google Calendar API documentation

---

**Implementation Status:** ✅ Complete
**Tested:** ⏳ Awaiting Google Cloud setup
**Production Ready:** ⚠️ After testing and customization
