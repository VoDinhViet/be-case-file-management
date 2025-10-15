# Firebase Admin Setup

Firebase Admin SDK has been successfully integrated into this NestJS application.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

### Getting Firebase Credentials

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Extract the values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and newline characters)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

## Usage

### Inject FirebaseService in Your Controllers/Services

```typescript
import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class YourService {
  constructor(private readonly firebaseService: FirebaseService) {}

  // Example: Send a push notification
  async sendNotification(token: string, title: string, body: string) {
    const messaging = this.firebaseService.getMessaging();
    
    await messaging.send({
      token,
      notification: {
        title,
        body,
      },
    });
  }

  // Example: Verify ID token
  async verifyToken(idToken: string) {
    const auth = this.firebaseService.getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  }

  // Example: Use Firestore
  async getData(collection: string, docId: string) {
    const firestore = this.firebaseService.getFirestore();
    const doc = await firestore.collection(collection).doc(docId).get();
    return doc.data();
  }

  // Example: Upload to Storage
  async uploadFile(filePath: string, destination: string) {
    const storage = this.firebaseService.getStorage();
    const bucket = storage.bucket();
    await bucket.upload(filePath, { destination });
  }
}
```

## Available Methods

The `FirebaseService` provides the following methods:

- `getApp()` - Returns the Firebase Admin App instance
- `getAuth()` - Returns the Firebase Auth instance
- `getFirestore()` - Returns the Firestore instance
- `getStorage()` - Returns the Storage instance
- `getMessaging()` - Returns the Messaging instance

## Module Integration

The FirebaseModule is globally available and has been added to `app.module.ts`. You can inject `FirebaseService` in any module without importing `FirebaseModule` again.

If you need to use it in a specific module, simply inject it:

```typescript
import { Module } from '@nestjs/common';
import { YourService } from './your.service';

@Module({
  providers: [YourService],
})
export class YourModule {}
```

## Files Created

- `src/firebase/config/firebase-config.type.ts` - Firebase configuration type
- `src/firebase/config/firebase.config.ts` - Firebase configuration loader
- `src/firebase/firebase.service.ts` - Firebase service with all methods
- `src/firebase/firebase.module.ts` - Firebase module
- Updated `src/config/config.type.ts` - Added Firebase to global config
- Updated `src/app.module.ts` - Integrated Firebase module and config

