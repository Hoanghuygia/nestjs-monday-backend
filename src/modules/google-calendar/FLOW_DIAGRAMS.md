# Google Calendar Integration - Flow Diagrams

## 1. Initial Setup Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Initial Setup (One-time)                     │
└─────────────────────────────────────────────────────────────────┘

   Developer                Google Cloud             Backend Server
       │                         │                          │
       │  1. Create Project      │                          │
       ├────────────────────────>│                          │
       │                         │                          │
       │  2. Enable Calendar API │                          │
       ├────────────────────────>│                          │
       │                         │                          │
       │  3. Create OAuth Creds  │                          │
       ├────────────────────────>│                          │
       │<────────────────────────┤                          │
       │   Client ID & Secret    │                          │
       │                         │                          │
       │  4. Configure .env      │                          │
       ├──────────────────────────────────────────────────> │
       │                         │                          │
       │  5. Start Server        │                          │
       ├──────────────────────────────────────────────────> │
       │                         │      Server Running      │
       │                         │                          │
```

## 2. User Calendar Connection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│               User Connects Google Calendar                      │
└─────────────────────────────────────────────────────────────────┘

   User Browser          Backend Server          Google OAuth
       │                       │                       │
       │ 1. Click Connect      │                       │
       ├──────────────────────>│                       │
       │                       │                       │
       │                       │ 2. Generate Auth URL  │
       │                       ├──────────────────────>│
       │                       │<──────────────────────┤
       │                       │   Auth URL            │
       │<──────────────────────┤                       │
       │   Redirect            │                       │
       │                       │                       │
       │ 3. User Authorizes    │                       │
       ├──────────────────────────────────────────────>│
       │                       │                       │
       │                       │  4. Callback w/ code  │
       │<──────────────────────┼───────────────────────┤
       │                       │                       │
       │ 5. Redirect to        │                       │
       │    callback endpoint  │                       │
       ├──────────────────────>│                       │
       │                       │                       │
       │                       │ 6. Exchange code      │
       │                       ├──────────────────────>│
       │                       │<──────────────────────┤
       │                       │  Access + Refresh     │
       │                       │  Tokens               │
       │                       │                       │
       │                       │ 7. Setup webhook      │
       │                       ├──────────────────────>│
       │                       │<──────────────────────┤
       │                       │  Channel ID           │
       │                       │                       │
       │                       │ 8. Store tokens       │
       │                       │    in secure storage  │
       │                       │                       │
       │<──────────────────────┤                       │
       │   Success Page        │                       │
       │   (Window closes)     │                       │
       │                       │                       │
```

## 3. Calendar Event to Subitem Flow

```
┌─────────────────────────────────────────────────────────────────┐
│         Automatic Subitem Creation from Calendar Event          │
└─────────────────────────────────────────────────────────────────┘

 User Calendar     Google Calendar API    Backend Server    Monday.com
      │                   │                      │               │
      │ 1. Create Event   │                      │               │
      │ (with Monday      │                      │               │
      │  metadata)        │                      │               │
      ├──────────────────>│                      │               │
      │                   │                      │               │
      │                   │ 2. Event Created     │               │
      │                   │                      │               │
      │                   │ 3. Push Notification │               │
      │                   │    (Webhook)         │               │
      │                   ├─────────────────────>│               │
      │                   │                      │               │
      │                   │                      │ 4. Validate   │
      │                   │                      │    webhook    │
      │                   │                      │               │
      │                   │ 5. Fetch Event       │               │
      │                   │    Details           │               │
      │                   │<─────────────────────┤               │
      │                   ├─────────────────────>│               │
      │                   │    Event Data        │               │
      │                   │                      │               │
      │                   │                      │ 6. Extract    │
      │                   │                      │    Metadata:  │
      │                   │                      │    - Item ID  │
      │                   │                      │    - Board ID │
      │                   │                      │    - Assignee │
      │                   │                      │               │
      │                   │                      │ 7. Calculate  │
      │                   │                      │    Duration   │
      │                   │                      │               │
      │                   │                      │ 8. Create     │
      │                   │                      │    Subitem    │
      │                   │                      ├──────────────>│
      │                   │                      │<──────────────┤
      │                   │                      │  Subitem ID   │
      │                   │                      │               │
      │                   │                      │ 9. Store      │
      │                   │                      │    Mapping    │
      │                   │                      │               │
      │                   │                      │               │
```

## 4. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      System Architecture                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   User Browser   │
│                  │
│  - Monday App    │
│  - Google Cal    │
└────────┬─────────┘
         │
         │ HTTPS
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Server                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         CalendarWebhookController                          │ │
│  │  - /auth/connect                                           │ │
│  │  - /auth/callback                                          │ │
│  │  - /webhook (POST)                                         │ │
│  └───────────┬────────────────────────────┬───────────────────┘ │
│              │                            │                      │
│              ▼                            ▼                      │
│  ┌─────────────────────┐    ┌──────────────────────────┐       │
│  │ GoogleCalendarService│    │ CalendarSubitemService   │       │
│  │                      │    │                          │       │
│  │ - OAuth management   │    │ - Extract metadata       │       │
│  │ - Event operations   │    │ - Create subitems        │       │
│  │ - Webhook setup      │    │ - Store mappings         │       │
│  │ - Duration calc      │    │                          │       │
│  └──────────┬───────────┘    └──────────┬───────────────┘       │
│             │                           │                        │
└─────────────┼───────────────────────────┼────────────────────────┘
              │                           │
              │                           │
    ┌─────────▼─────────┐       ┌────────▼────────────┐
    │  Google Calendar  │       │    Monday.com API   │
    │      API          │       │                     │
    │                   │       │  - Create subitems  │
    │  - Events         │       │  - Update columns   │
    │  - Webhooks       │       │  - Store data       │
    │  - OAuth          │       │                     │
    └───────────────────┘       └─────────────────────┘
              │
              │
    ┌─────────▼──────────┐
    │ Monday.com Storage │
    │                    │
    │ - OAuth tokens     │
    │ - Channel info     │
    │ - Event mappings   │
    └────────────────────┘
```

## 5. Detailed Event Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              Event Processing Logic Flow                         │
└─────────────────────────────────────────────────────────────────┘

        START: Webhook Received
                │
                ▼
        ┌───────────────┐
        │ Validate      │
        │ Headers       │
        └───────┬───────┘
                │
                ├─── Invalid ──> Return 400
                │
                ▼ Valid
        ┌───────────────┐
        │ Resource      │
        │ State?        │
        └───────┬───────┘
                │
                ├─── sync ──────> Return 200 (verification)
                │
                ▼ exists
        ┌───────────────┐
        │ Get User      │
        │ Tokens        │
        └───────┬───────┘
                │
                ├─── Not Found ──> Log & Return
                │
                ▼ Found
        ┌───────────────┐
        │ List Recent   │
        │ Events        │
        │ (last 5 min)  │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ For Each      │
        │ Event         │
        └───────┬───────┘
                │
                ▼
        ┌───────────────────┐
        │ Has Monday        │      No
        │ Metadata?         ├─────────> Skip Event
        └───────┬───────────┘
                │ Yes
                ▼
        ┌───────────────────┐
        │ Extract:          │
        │ - Item ID         │
        │ - Board ID        │
        │ - Assignee        │
        │ - Times           │
        └───────┬───────────┘
                │
                ▼
        ┌───────────────────┐
        │ Calculate         │
        │ Duration          │
        └───────┬───────────┘
                │
                ▼
        ┌───────────────────┐
        │ Build Column      │
        │ Values JSON       │
        └───────┬───────────┘
                │
                ▼
        ┌───────────────────┐
        │ Monday API:       │
        │ create_subitem    │
        └───────┬───────────┘
                │
                ├─── Error ──────> Log & Continue
                │
                ▼ Success
        ┌───────────────────┐
        │ Store Event       │
        │ Mapping           │
        └───────┬───────────┘
                │
                ▼
            Return 200 OK
```

## 6. Monday.com Board Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     Monday.com Board                             │
└─────────────────────────────────────────────────────────────────┘

Board: "Development Tasks"  (ID: 987654321)
├── Group: "Sprint 1"
│   │
│   ├── Item (Parent): "Viết phần Introduction"  (ID: 123456789)
│   │   │
│   │   ├── Column: Name            → "Viết phần Introduction"
│   │   ├── Column: Assignee        → [A, B]
│   │   ├── Column: Planned Time    → 12 hours
│   │   ├── Column: Status          → Working on it
│   │   │
│   │   └── Subitems: ─────────────────────────────────────┐
│   │       │                                               │
│   │       ├── Subitem 1 (Auto-created from calendar)     │
│   │       │   ├── Name: "Working on Introduction"        │
│   │       │   ├── Assignee: A (from calendar creator)    │
│   │       │   ├── Hours: 3 (calculated from event)       │
│   │       │   ├── Date: Jan 26, 9:00 AM                  │
│   │       │   └── Description: "Research and outline"    │
│   │       │                                               │
│   │       ├── Subitem 2 (Auto-created from calendar)     │
│   │       │   ├── Name: "Write first draft"              │
│   │       │   ├── Assignee: B                            │
│   │       │   ├── Hours: 4                               │
│   │       │   ├── Date: Jan 27, 10:00 AM                 │
│   │       │   └── Description: "Complete first section"  │
│   │       │                                               │
│   │       └── Subitem 3 (Manually created)               │
│   │           ├── Name: "Review"                         │
│   │           └── ...                                    │
│   │                                                       │
│   ├── Item: "Viết phần Methodology"                      │
│   │   └── ...                                            │
│   │                                                       │
│   └── Item: "Testing"                                    │
│       └── ...                                            │
│                                                           │
└── Group: "Sprint 2"                                       │
    └── ...                                                 │
```

## 7. Metadata Format in Calendar Events

```
┌─────────────────────────────────────────────────────────────────┐
│              Calendar Event with Metadata                        │
└─────────────────────────────────────────────────────────────────┘

Google Calendar Event
├── Title: "Working on Introduction section"
├── Start: Jan 26, 2026 9:00 AM
├── End: Jan 26, 2026 12:00 PM (3 hours)
├── Attendees: Optional
├── Location: Optional
│
└── Description (Method 1 - Simple):
    ┌─────────────────────────────────────────────┐
    │ Research and outline the introduction       │
    │ section. Focus on background and objectives.│
    │                                             │
    │ monday-item-id: 123456789                   │
    │ monday-board-id: 987654321                  │
    └─────────────────────────────────────────────┘

Alternative: Extended Properties (Method 2 - Preferred):
    extendedProperties: {
      private: {
        mondayItemId: "123456789",
        mondayBoardId: "987654321"
      }
    }

Result in Monday:
    ┌─────────────────────────────────────────────┐
    │ Subitem created under parent item 123456789 │
    │                                             │
    │ Name: "Working on Introduction section"    │
    │ Assignee: creator@email.com                │
    │ Duration: 3 hours                           │
    │ Date: Jan 26, 2026 9:00 AM                 │
    │ Description: "Research and outline..."      │
    └─────────────────────────────────────────────┘
```

## 8. Security & Storage Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  Security & Data Storage                         │
└─────────────────────────────────────────────────────────────────┘

    User Credentials Flow:
    ─────────────────────
    
    Google OAuth
         │
         │ OAuth Flow
         ▼
    Access + Refresh Tokens
         │
         │ Encrypted Storage
         ▼
    ┌─────────────────────────┐
    │ Monday.com              │
    │ Secure Storage          │
    │                         │
    │ Key: google-calendar-   │
    │      tokens:{userId}    │
    │                         │
    │ Value: {                │
    │   access_token: "...",  │
    │   refresh_token: "...", │
    │   expiry_date: ...      │
    │ }                       │
    └─────────────────────────┘
         │
         │ Retrieved when needed
         ▼
    Backend Service
         │
         │ Used for API calls
         ▼
    Google Calendar API

    Data Isolation:
    ──────────────
    
    User A                User B
      │                     │
      ├─ Tokens A          ├─ Tokens B
      ├─ Channel A         ├─ Channel B
      └─ Events A          └─ Events B
           │                     │
           └─────────────────────┘
                    │
              No cross-access
              (User-scoped)
```

---

These diagrams illustrate the complete flow of the Google Calendar integration with Monday.com. Use them as a reference when implementing or troubleshooting the system.
