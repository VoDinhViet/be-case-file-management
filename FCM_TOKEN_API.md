# FCM Token API

API endpoint for updating Firebase Cloud Messaging (FCM) tokens for push notifications.

## Endpoint

### Update FCM Token

Updates the FCM token for the currently authenticated user.

**Endpoint:** `PUT /api/v1/users/fcm-token`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "fcmToken": "your-fcm-token-here"
}
```

**Response:**
```json
{
  "id": "user-uuid",
  "fullName": "User Name",
  "phone": "0123456789",
  "role": "STAFF",
  "fcmToken": "your-fcm-token-here",
  "createdAt": "2025-10-15T00:00:00.000Z",
  "updatedAt": "2025-10-15T00:00:00.000Z"
}
```

## Example Usage

### cURL
```bash
curl -X PUT http://localhost:3000/api/v1/users/fcm-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "fcmToken": "exampleFCMToken123456789"
  }'
```

### JavaScript/Fetch
```javascript
const updateFcmToken = async (token, fcmToken) => {
  const response = await fetch('http://localhost:3000/api/v1/users/fcm-token', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ fcmToken })
  });
  
  return await response.json();
};

// Usage
await updateFcmToken(accessToken, 'exampleFCMToken123456789');
```

### React Native with Firebase
```javascript
import messaging from '@react-native-firebase/messaging';

const registerDeviceForPushNotifications = async () => {
  // Request permission
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    // Get the FCM token
    const fcmToken = await messaging().getToken();
    
    // Update on your backend
    const response = await fetch('http://localhost:3000/api/v1/users/fcm-token', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yourAccessToken}`
      },
      body: JSON.stringify({ fcmToken })
    });
    
    console.log('FCM token updated:', await response.json());
  }
};
```

## Sending Push Notifications

Once FCM tokens are stored, you can send notifications using the FirebaseService:

```typescript
import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
  ) {}

  async sendNotificationToUser(userId: string, title: string, body: string) {
    // Get user's FCM token from database
    const user = await this.usersService.findById(userId);
    
    if (!user?.fcmToken) {
      throw new Error('User does not have an FCM token');
    }

    // Send notification via Firebase
    const messaging = this.firebaseService.getMessaging();
    
    await messaging.send({
      token: user.fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        // Optional custom data
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

## Database Schema

The `fcmToken` field has been added to the `users` table:

```sql
ALTER TABLE "users" ADD COLUMN "fcm_token" varchar(512);
```

## Files Modified/Created

1. **Database Schema:**
   - `src/database/schemas/users.schema.ts` - Added `fcmToken` field

2. **DTO:**
   - `src/api/users/dto/update-fcm-token.req.dto.ts` - New DTO for FCM token updates

3. **Service:**
   - `src/api/users/users.service.ts` - Added `updateFcmToken` method

4. **Controller:**
   - `src/api/users/users.controller.ts` - Added `PUT /fcm-token` endpoint

5. **Migration:**
   - `drizzle/0030_vengeful_thor.sql` - Database migration file

## Notes

- The FCM token is user-specific and tied to the authenticated user
- Tokens can be up to 512 characters long
- The endpoint requires authentication
- The token is stored in the `fcm_token` column in the `users` table
- This is separate from the `tokenExpo` field (used for Expo push notifications)

