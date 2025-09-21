import { registerAs } from '@nestjs/config';
import { IsString, ValidateIf } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { DatabaseConfig } from './database-config.type';

class EnvironmentVariablesValidator {
  @ValidateIf((envValues) => envValues.DATABASE_URL)
  @IsString()
  DATABASE_URL: string;
}

export default registerAs<DatabaseConfig>('database', () => {
  console.info(`Register DatabaseConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    url: process.env.DATABASE_URL,
  };
});
