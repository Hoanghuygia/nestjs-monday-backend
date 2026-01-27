# Google Calendar Integration for Monday.com

This module integrates Google Calendar with Monday.com, allowing automatic creation of subitems when team members create calendar events.

## Features

- 🔄 **Automatic Subitem Creation**: When a team member creates a calendar event linked to a Monday parent item, a subitem is automatically created
- 📅 **Real-time Sync**: Uses Google Calendar webhooks for instant synchronization
- 👥 **Multi-user Support**: Each team member can connect their own Google Calendar
- ⏱️ **Time Tracking**: Automatically calculates duration from calendar events
- 🔐 **Secure OAuth**: Uses Google OAuth 2.0 for secure authentication

## Workflow

1. **PM Creates Parent Item**: PM creates a task on Monday.com with:
   - Task name (e.g., "Viết phần Introduction")
   - Assignees (e.g., A, B)
   - Planned time (e.g., 12 hours)

2. **Team Member Connects Calendar**: 
   - Team member clicks "Connect Google Calendar" link
   - Authorizes the Monday.com app
   - Calendar watch is set up automatically

3. **Create Calendar Event**:
   - Team member creates a calendar event
   - In the event description, they include:
     ```
     monday-item-id: 123456789
     monday-board-id: 987654321
     ```
   - Or use extended properties (preferred method)

4. **Automatic Subitem Creation**:
   - System detects the new calendar event
   - Creates a subitem under the parent item
   - Populates columns with:
     - Person (assignee from calendar)
     - Duration (calculated from event times)
     - Date/Time (from event start time)
     - Description (from event description)

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: Add `https://your-domain.com/api/v1/google-calendar/auth/callback`
   - Copy the **Client ID** and **Client Secret**

### 2. Environment Variables

Add the following to your `.env` file:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/v1/google-calendar/auth/callback
```

### 3. Webhook URL Configuration

Make sure your `MDY_SERVER_ADDRESS` in `.env` is accessible from the internet (for Google webhooks):

```env
MDY_SERVER_ADDRESS=https://your-domain.com
```

## API Endpoints

### Authentication

#### `GET /api/v1/google-calendar/auth/connect`
Initiates OAuth flow for Google Calendar connection.

**Query Parameters:**
- `userId` (required): Monday.com user ID

**Example:**
```
https://your-domain.com/api/v1/google-calendar/auth/connect?userId=12345
```

#### `GET /api/v1/google-calendar/auth/callback`
OAuth callback endpoint (automatically handled).

### Webhooks

#### `POST /api/v1/google-calendar/webhook`
Receives Google Calendar webhook notifications.

**Headers:**
- `x-goog-channel-id`: Channel ID
- `x-goog-resource-id`: Resource ID
- `x-goog-resource-uri`: Resource URI
- `x-goog-resource-state`: State (sync, exists, not_exists)
- `x-goog-channel-token`: User ID

## Usage Example

### For Frontend Integration

Create a button in your Monday.com app view to connect Google Calendar:

```typescript
import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();

// Get current user
const user = await monday.get('context');
const userId = user.data.user.id;

// Open calendar connection in new window
const connectUrl = `${serverUrl}/api/v1/google-calendar/auth/connect?userId=${userId}`;
window.open(connectUrl, '_blank', 'width=600,height=600');
```

### Creating Calendar Events with Monday Metadata

When creating a calendar event, include Monday metadata:

**Option 1: In Description (Simple)**
```
Working on Introduction section

monday-item-id: 123456789
monday-board-id: 987654321
```

**Option 2: Using Extended Properties (Preferred)**

If using Google Calendar API directly:
```javascript
const event = {
  summary: 'Working on Introduction',
  start: { dateTime: '2026-01-27T09:00:00+07:00' },
  end: { dateTime: '2026-01-27T12:00:00+07:00' },
  extendedProperties: {
    private: {
      mondayItemId: '123456789',
      mondayBoardId: '987654321'
    }
  }
};
```

## Data Storage

The integration uses Monday.com's secure storage for:

1. **OAuth Tokens**: `google-calendar-tokens:{userId}`
   - Access token
   - Refresh token
   - Expiration time

2. **Calendar Channels**: `calendar-channel:{userId}`
   - Channel ID
   - Resource ID
   - Calendar ID
   - Expiration

3. **Event Mappings**: `calendar-event-mapping:{eventId}`
   - Event ID
   - Parent Item ID
   - Subitem ID
   - Board ID
   - Assignee
   - Created timestamp

## Security Considerations

1. **OAuth Tokens**: Stored in Monday.com's secure storage
2. **Webhook Verification**: Validates channel ID and resource ID
3. **User Context**: Each user has their own calendar connection
4. **HTTPS Only**: All communication over HTTPS

## Troubleshooting

### Calendar events not creating subitems

1. Check that the event description contains `monday-item-id` and `monday-board-id`
2. Verify webhook URL is accessible from internet
3. Check logs for any errors during webhook processing
4. Ensure user has authorized calendar access

### OAuth connection fails

1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
2. Check redirect URI matches in Google Cloud Console
3. Ensure user grants all required permissions

### Webhook expires

Google Calendar webhooks expire after a certain period. The system should automatically renew them, but if issues persist:

1. User can reconnect their calendar
2. Check `calendar-channel:{userId}` storage for expiration time

## Column Mapping

The subitem is created with these column values:

| Column Type | Monday Column | Source |
|------------|---------------|---------|
| Person | `person` | Event creator/organizer email |
| Numbers | `numbers` | Calculated duration in hours |
| Date | `date` | Event start date and time |
| Text | `text` | Event description |

**Note**: Adjust column IDs in [calendar-subitem.service.ts](calendar-subitem.service.ts#L100-L110) to match your board structure.

## Architecture

```
┌─────────────────┐
│  Google Calendar│
│                 │
└────────┬────────┘
         │ Webhook
         │
         ▼
┌─────────────────────────────────┐
│  CalendarWebhookController      │
│  - Receives webhook notifications│
│  - Verifies authenticity         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  GoogleCalendarService           │
│  - Manages OAuth                 │
│  - Fetches events                │
│  - Calculates duration           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  CalendarSubitemService          │
│  - Creates subitems in Monday    │
│  - Stores event mappings         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Monday.com API                  │
└─────────────────────────────────┘
```

## License

MIT
