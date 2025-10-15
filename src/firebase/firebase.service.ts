import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App;

  constructor(private configService: ConfigService<AllConfigType>) {}

  onModuleInit() {
    const projectId = this.configService.get('firebase.projectId', {
      infer: true,
    });
    const privateKey = this.configService.get('firebase.privateKey', {
      infer: true,
    });
    const clientEmail = this.configService.get('firebase.clientEmail', {
      infer: true,
    });

    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });

    console.info('Firebase Admin SDK initialized successfully');
  }

  getApp(): admin.app.App {
    return this.app;
  }

  getAuth(): admin.auth.Auth {
    return this.app.auth();
  }

  getFirestore(): admin.firestore.Firestore {
    return this.app.firestore();
  }

  getStorage(): admin.storage.Storage {
    return this.app.storage();
  }

  getMessaging(): admin.messaging.Messaging {
    return this.app.messaging();
  }
}

