# Tính năng Thông báo Vụ án gần hết hạn

## Tổng quan

Hệ thống tự động kiểm tra và gửi thông báo cho user khi vụ án gần hết hạn hoặc đã quá hạn.

## Các tính năng đã thêm

### 1. Cập nhật Schema Notification

**File**: `src/database/schemas/notification.schema.ts`

Thêm các trường mới:
- `caseId`: Liên kết đến vụ án
- `type`: Loại thông báo (enum)
- `isRead`: Trạng thái đã đọc/chưa đọc
- Foreign keys với cascade delete

**Các loại thông báo** (`NotificationTypeEnum`):
- `CASE_DEADLINE_SOON`: Vụ án sắp hết hạn (còn 3 ngày)
- `CASE_OVERDUE`: Vụ án quá hạn
- `CASE_ASSIGNED`: Được giao vụ án mới
- `CASE_STATUS_CHANGED`: Trạng thái vụ án thay đổi
- `SYSTEM`: Thông báo hệ thống

### 2. Notification Service nâng cấp

**File**: `src/api/notifications/notifications.service.ts`

**Methods mới:**
- `createNotification()`: Tạo notification trong DB và gửi push
- `sendPushToUser()`: Gửi push notification cho user cụ thể
- `getPageNotifications()`: Lấy danh sách notifications với phân trang
- `markAsRead()`: Đánh dấu notification đã đọc
- `markAllAsRead()`: Đánh dấu tất cả đã đọc
- `getUnreadCount()`: Đếm số notification chưa đọc

### 3. Scheduled Tasks (Cron Jobs)

**File**: `src/api/notifications/case-deadline.scheduler.ts`

**2 Cron Jobs tự động:**

#### Job 1: Kiểm tra cases sắp hết hạn
- **Thời gian**: Mỗi ngày lúc 9:00 sáng
- **Cron**: `@Cron(CronExpression.EVERY_DAY_AT_9AM)`
- **Logic**:
  - Tìm cases có `endDate` trong 3 ngày tới
  - Status = `IN_PROGRESS`
  - Có `userId` được assign
  - Gửi thông báo cho user
  - Hiển thị số ngày còn lại

#### Job 2: Kiểm tra cases quá hạn
- **Thời gian**: Mỗi ngày lúc 10:00 sáng  
- **Cron**: `@Cron(CronExpression.EVERY_DAY_AT_10AM)`
- **Logic**:
  - Tìm cases đã quá `endDate`
  - Status = `IN_PROGRESS`
  - Gửi cảnh báo quá hạn
  - Hiển thị số ngày đã quá hạn

### 4. API Endpoints mới

**File**: `src/api/notifications/notifications.controller.ts`

#### GET `/notifications`
- Lấy danh sách thông báo của user hiện tại
- Có phân trang
- Bao gồm thông tin case liên quan
- **Requires**: Auth

#### GET `/notifications/unread-count`
- Đếm số thông báo chưa đọc
- **Requires**: Auth

#### PATCH `/notifications/:notificationId/read`
- Đánh dấu 1 thông báo đã đọc
- **Requires**: Auth

#### PATCH `/notifications/mark-all-read`
- Đánh dấu tất cả thông báo đã đọc
- **Requires**: Auth

## Cấu trúc Database Migration

Cần chạy migration để cập nhật bảng notifications:

```bash
pnpm db:generate
pnpm db:migrate
```

Migration sẽ:
1. Rename `userId` column (hoặc tạo mới)
2. Thêm `caseId` column (nullable)
3. Thêm `type` column
4. Thêm `isRead` column (default false)
5. Tăng độ dài `title` và `body`
6. Thêm foreign key constraints với cascade delete

## Setup & Configuration

### 1. Cài đặt dependencies

```bash
pnpm add @nestjs/schedule
```

### 2. Import ScheduleModule

Đã được thêm vào `app.module.ts`:

```typescript
ScheduleModule.forRoot()
```

### 3. Notification Module

Đã export `NotificationsService` để có thể sử dụng trong modules khác.

## Cách sử dụng

### Tạo notification từ code

```typescript
import { NotificationsService, NotificationTypeEnum } from './notifications';

// Inject service
constructor(private readonly notificationsService: NotificationsService) {}

// Tạo notification
await this.notificationsService.createNotification({
  userId: 'user-id',
  caseId: 'case-id', // optional
  type: NotificationTypeEnum.CASE_ASSIGNED,
  title: 'Bạn được giao vụ án mới',
  body: 'Vụ án "Case ABC" đã được giao cho bạn',
});
```

### Lấy notifications từ client

```http
GET /api/notifications?limit=10&offset=0
Authorization: Bearer <token>
```

Response:
```json
{
  "data": [
    {
      "id": "...",
      "userId": "...",
      "caseId": "...",
      "type": "CASE_DEADLINE_SOON",
      "title": "Vụ án sắp hết hạn",
      "body": "Vụ án \"Case ABC\" sẽ hết hạn trong 2 ngày",
      "isRead": false,
      "createdAt": "2025-10-14T...",
      "case": {
        "id": "...",
        "name": "Case ABC"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
```

### Đếm notifications chưa đọc

```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

Response:
```json
{
  "unreadCount": 5
}
```

## Tùy chỉnh

### Thay đổi thời gian kiểm tra

Sửa file `case-deadline.scheduler.ts`:

```typescript
// Chạy mỗi 6 giờ
@Cron(CronExpression.EVERY_6_HOURS)

// Chạy lúc 8:00 AM
@Cron(CronExpression.EVERY_DAY_AT_8AM)

// Custom cron expression
@Cron('0 */4 * * *') // Mỗi 4 giờ
```

### Thay đổi ngày cảnh báo trước

Sửa biến `threeDaysLater` trong `checkUpcomingDeadlines()`:

```typescript
const fiveDaysLater = new Date();
fiveDaysLater.setDate(now.getDate() + 5); // 5 ngày thay vì 3
```

## Testing

### Test manually cron job

Thêm method test trong scheduler:

```typescript
@Get('/test-deadline-check')
async testDeadlineCheck() {
  await this.caseDeadlineScheduler.checkUpcomingDeadlines();
  return { message: 'Đã chạy kiểm tra' };
}
```

## Notes

1. **Expo Push Token**: User phải đăng ký token để nhận push notification
2. **Timezone**: Server sử dụng timezone local, cần cấu hình nếu deploy
3. **Performance**: Với số lượng cases lớn, có thể cần optimize query hoặc chạy batch
4. **Logging**: Tất cả actions đều được log để debug

## Troubleshooting

### Không nhận được push notification
- Kiểm tra user đã có `tokenExpo` chưa
- Kiểm tra token có hợp lệ không: `Expo.isExpoPushToken()`
- Xem logs trong console

### Cron job không chạy
- Kiểm tra `ScheduleModule.forRoot()` đã được import
- Kiểm tra `CaseDeadlineScheduler` đã được add vào providers
- Kiểm tra logs khi app start

### Migration lỗi
- Backup database trước khi migrate
- Nếu có data conflict, cần update data manually trước

## Future Improvements

- [ ] Thêm settings cho user: tắt/bật notification
- [ ] Cho phép user chọn thời gian nhận thông báo
- [ ] Thêm notification qua email
- [ ] Gộp notifications thành digest daily
- [ ] Thêm priority cho notifications
- [ ] Real-time notification qua WebSocket

