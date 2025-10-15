# FCM Test Notification API

API endpoint để test gửi Firebase Cloud Messaging (FCM) push notifications.

## Endpoint

### Gửi Test FCM Push Notification

Gửi FCM push notification cho một user cụ thể để test.

**Endpoint:** `POST /api/v1/notifications/send-fcm`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "userId": "uuid-of-user",
  "title": "Tiêu đề thông báo",
  "body": "Nội dung thông báo",
  "imageUrl": "https://example.com/image.jpg" // Optional
}
```

**Response Success:**
```json
{
  "success": true,
  "messageId": "projects/your-project/messages/0:1234567890",
  "userId": "uuid-of-user",
  "userName": "Tên người dùng"
}
```

**Response Error (Không có FCM Token):**
```json
{
  "statusCode": 500,
  "message": "User không có FCM token"
}
```

## Cách Sử Dụng

### 1. Đảm Bảo User Đã Có FCM Token

Trước khi test, user cần cập nhật FCM token:

```bash
curl -X PATCH http://localhost:3000/api/v1/users/fcm-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \
  -d '{
    "fcmToken": "fcm-token-from-mobile-app"
  }'
```

### 2. Test Gửi Notification

```bash
curl -X POST http://localhost:3000/api/v1/notifications/send-fcm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Test Notification",
    "body": "Đây là tin nhắn test từ API",
    "imageUrl": "https://picsum.photos/200"
  }'
```

### 3. JavaScript/Fetch Example

```javascript
const sendTestNotification = async (accessToken, userId) => {
  const response = await fetch('http://localhost:3000/api/v1/notifications/send-fcm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      userId: userId,
      title: 'Thông báo mới',
      body: 'Bạn có một thông báo mới từ hệ thống',
      imageUrl: 'https://example.com/notification-icon.png'
    })
  });
  
  return await response.json();
};

// Usage
const result = await sendTestNotification(token, '123e4567-e89b-12d3-a456-426614174000');
console.log('Notification sent:', result);
```

## Testing Flow

### Bước 1: Lấy User ID
```bash
# Get profile để lấy userId
curl -X GET http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Bước 2: Cập Nhật FCM Token
```bash
curl -X PATCH http://localhost:3000/api/v1/users/fcm-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "fcmToken": "your-fcm-token-here"
  }'
```

### Bước 3: Gửi Test Notification
```bash
curl -X POST http://localhost:3000/api/v1/notifications/send-fcm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "userId": "your-user-id",
    "title": "Test",
    "body": "Testing FCM notification"
  }'
```

## Notification Features

Notification được gửi với các config sau:

### Android
- Priority: `high`
- Sound: `default`
- Channel ID: `default`

### iOS (APNS)
- Sound: `default`
- Badge: `1`

### Data Payload
```json
{
  "userId": "user-uuid",
  "timestamp": "2025-10-15T10:30:00.000Z"
}
```

## Troubleshooting

### Error: "User không có FCM token"
**Solution:** User cần cập nhật FCM token trước bằng endpoint `PATCH /users/fcm-token`

### Error: "Firebase app not initialized"
**Solution:** Kiểm tra file `.env` có đủ thông tin Firebase config:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@...
```

### Notification không hiển thị trên mobile
**Solutions:**
1. Kiểm tra FCM token có đúng và còn valid
2. Kiểm tra app có quyền nhận notification
3. Kiểm tra Firebase Console có lỗi gì không
4. Test với Firebase Console trước để đảm bảo token hoạt động

## Sử Dụng Trong Production

Trong production, bạn có thể tích hợp vào các service khác:

```typescript
// Example: Gửi notification khi có case mới
@Injectable()
export class CasesService {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  async createCase(data: CreateCaseDto) {
    const newCase = await this.db.insert(casesTable).values(data);
    
    // Gửi notification cho user
    await this.notificationsService.sendFcmPushToUser(
      data.userId,
      'Hồ sơ mới',
      `Hồ sơ ${data.name} đã được tạo thành công`,
    );
    
    return newCase;
  }
}
```

## Files Modified

1. `src/api/notifications/dto/send-fcm-notification.req.dto.ts` - DTO mới
2. `src/api/notifications/notifications.module.ts` - Import FirebaseModule
3. `src/api/notifications/notifications.service.ts` - Thêm method `sendFcmPushToUser()`
4. `src/api/notifications/notifications.controller.ts` - Thêm endpoint `POST /send-fcm`

## Related APIs

- `PATCH /api/v1/users/fcm-token` - Cập nhật FCM token
- `GET /api/v1/users/profile` - Lấy thông tin user (bao gồm fcmToken)

