import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheableMemory } from 'cacheable';
import Keyv from 'keyv';
import { AuthModule } from './api/auth/auth.module';
import authConfig from './api/auth/config/auth.config';
import { CasesModule } from './api/cases/cases.module';
import { NotificationsModule } from './api/notifications/notifications.module';
import { ReportsModule } from './api/reports/reports.module';
import { SharedModule } from './api/shared/shared.module';
import { TemplatesModule } from './api/templates/templates.module';
import { UsersController } from './api/users/users.controller';
import { UsersModule } from './api/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import redisConfig from './cache/config/redis.config';
import appConfig from './config/app.config';
import { AllConfigType } from './config/config.type';
import databaseConfig from './database/config/database.config';
import { DatabaseModule } from './database/database.module';
import firebaseConfig from './firebase/config/firebase.config';
import { FirebaseModule } from './firebase/firebase.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        appConfig,
        authConfig,
        redisConfig,
        firebaseConfig,
      ],
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`],
    }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<AllConfigType>) => {
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            createKeyv(configService.get('redis.url', { infer: true })),
          ],
        };
      },
      isGlobal: true,
      inject: [ConfigService],
    }),
    SharedModule,
    DatabaseModule,
    FirebaseModule,
    AuthModule,
    UsersModule,
    TemplatesModule,
    CasesModule,
    NotificationsModule,
    ReportsModule,
  ],
  controllers: [AppController, UsersController],
  providers: [AppService],
})
export class AppModule {}
