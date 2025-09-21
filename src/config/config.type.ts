import { AuthConfig } from '../api/auth/config/auth-config.type';
import { RedisConfig } from '../cache/config/redis-config.type';
import { AppConfig } from './app-config.type';

export type AllConfigType = {
  app: AppConfig;
  auth: AuthConfig;
  redis: RedisConfig;
};
