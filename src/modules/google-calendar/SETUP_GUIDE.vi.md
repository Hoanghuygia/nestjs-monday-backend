# Hướng dẫn Cài đặt Google Calendar Integration

## Bước 1: Cấu hình Google Cloud Console

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Bật Google Calendar API:
   - Vào "APIs & Services" > "Library"
   - Tìm "Google Calendar API"
   - Click "Enable"

4. Tạo OAuth 2.0 Credentials:
   - Vào "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Chọn application type: "Web application"
   - Thêm Authorized redirect URIs:
     ```
     https://10692458-c8fb883492d5.apps-tunnel.monday.app/api/v1/google-calendar/auth/callback
     ```
   - Copy **Client ID** và **Client Secret**

## Bước 2: Cập nhật Environment Variables

Mở file `.env` và thay đổi:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=https://10692458-c8fb883492d5.apps-tunnel.monday.app/api/v1/google-calendar/auth/callback
```

## Bước 3: Khởi động Server

```bash
cd nestjs-monday-backend
npm run dev
```

## Workflow Sử dụng

### 1. PM tạo Parent Item trên Monday.com

PM tạo task với các thông tin:
- **Item name**: "Viết phần Introduction"
- **Assignee**: A, B
- **Planned time**: 12 giờ

### 2. Team member kết nối Google Calendar

Mỗi thành viên cần kết nối calendar của họ:

```
https://10692458-c8fb883492d5.apps-tunnel.monday.app/api/v1/google-calendar/auth/connect?userId=<MONDAY_USER_ID>
```

Hoặc tạo button trong Monday app view:

```typescript
const userId = await monday.get('context').then(res => res.data.user.id);
const connectUrl = `${serverUrl}/api/v1/google-calendar/auth/connect?userId=${userId}`;
window.open(connectUrl, '_blank', 'width=600,height=600');
```

### 3. Tạo Calendar Event

Khi team member (ví dụ A) tạo event trong Google Calendar, thêm thông tin sau vào description:

```
Làm việc trên Introduction section

monday-item-id: 123456789
monday-board-id: 987654321
```

**Lưu ý:**
- `monday-item-id`: ID của parent item mà PM vừa tạo
- `monday-board-id`: ID của board

### 4. Subitem tự động được tạo

Hệ thống sẽ tự động:
- Nhận webhook từ Google Calendar
- Tạo subitem mới dưới parent item
- Điền thông tin:
  - **Assignee**: Người tạo calendar event
  - **Duration**: Tính toán từ start time và end time
  - **Date/Time**: Từ event start time
  - **Description**: Từ event description

## Lấy Item ID và Board ID

### Lấy Board ID:
1. Mở board trên Monday.com
2. URL sẽ có dạng: `https://monday.com/boards/123456789`
3. Số `123456789` là Board ID

### Lấy Item ID:
1. Click vào item
2. URL sẽ có dạng: `https://monday.com/boards/123456789/pulses/987654321`
3. Số `987654321` là Item ID

Hoặc sử dụng Monday API:

```javascript
monday.api(`query { items(ids: [123456]) { id name } }`);
```

## Cấu trúc Column

Đảm bảo board của bạn có các columns (cần điều chỉnh trong code nếu khác):
- `person`: Column cho assignee
- `numbers`: Column cho duration (giờ)
- `date`: Column cho ngày/giờ
- `text`: Column cho description

**Lưu ý:** Nếu board của bạn có tên column khác, update trong file `calendar-subitem.service.ts` line 140-148.

## Troubleshooting

### Calendar events không tạo subitems

1. Kiểm tra event description có chứa `monday-item-id` và `monday-board-id`
2. Verify webhook URL accessible từ internet
3. Xem logs để kiểm tra lỗi
4. Đảm bảo user đã authorize calendar

### OAuth connection fails

1. Verify `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` đúng
2. Kiểm tra redirect URI trong Google Cloud Console
3. Đảm bảo user cấp đủ permissions

## Testing

Test webhook manually:

```bash
curl -X POST https://10692458-c8fb883492d5.apps-tunnel.monday.app/api/v1/google-calendar/webhook \
  -H "x-goog-channel-id: test-channel" \
  -H "x-goog-resource-id: test-resource" \
  -H "x-goog-resource-uri: https://www.googleapis.com/calendar/v3/calendars/primary/events" \
  -H "x-goog-resource-state: sync"
```

## API Endpoints

- `GET /api/v1/google-calendar/auth/connect?userId={userId}` - Kết nối calendar
- `GET /api/v1/google-calendar/auth/callback` - OAuth callback
- `POST /api/v1/google-calendar/webhook` - Nhận webhook từ Google

## Security Notes

- OAuth tokens được lưu trong Monday.com secure storage
- Webhook được verify qua channel ID và resource ID
- Mỗi user có calendar connection riêng
- Tất cả communication qua HTTPS
