import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: `.env.${process.env.NODE_ENV}` });
export default defineConfig({
  schema: './src/database/schemas/*.schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    schema: 'public', // 👈 đổi schema
  },
});
