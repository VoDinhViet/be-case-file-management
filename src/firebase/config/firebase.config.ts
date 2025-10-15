import { registerAs } from '@nestjs/config';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { FirebaseConfig } from './firebase-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  FIREBASE_PROJECT_ID: string;

  @IsString()
  @IsNotEmpty()
  FIREBASE_PRIVATE_KEY: string;

  @IsEmail()
  @IsNotEmpty()
  FIREBASE_CLIENT_EMAIL: string;
}

export default registerAs<FirebaseConfig>('firebase', () => {
  console.info(`Register FirebaseConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  } as FirebaseConfig;
});

