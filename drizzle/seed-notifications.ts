import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { RoleEnum } from 'src/api/auth/types/role.enum';
import {
  notificationsTable,
  NotificationTypeEnum,
} from '../src/database/schemas/notification.schema';
import { usersTable } from '../src/database/schemas/users.schema';

// Load environment variables
dotenv.config({ path: '.env.development' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function seedNotifications() {
  try {
    console.log('🌱 Starting to seed notifications...');

    // 1. Lấy danh sách users
    const users = await db
      .select()
      .from(usersTable)
      .limit(5)
      .where(eq(usersTable.role, RoleEnum.ADMIN));
    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      return;
    }
    console.log(`✅ Found ${users.length} admins`);

    for (const user of users) {
      // Notification hệ thống
      await db.insert(notificationsTable).values({
        userId: user.id,
        type: NotificationTypeEnum.SYSTEM,
        title: '🎉 Chào mừng đến với hệ thống quản lý hồ sơ',
        body: 'Chúc mừng bạn đã tham gia hệ thống. Hãy bắt đầu quản lý các vụ án của bạn.',
        isRead: false,
      });
    }
  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed
seedNotifications()
  .then(() => {
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
