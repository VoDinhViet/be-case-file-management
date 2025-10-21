# Backend - Case File Management System

Hệ thống backend quản lý hồ sơ vụ án được xây dựng với NestJS, PostgreSQL và Firebase.

## 📋 Tổng quan

Backend API cho ứng dụng quản lý hồ sơ pháp lý với các tính năng:
- ✅ Quản lý vụ án (Cases) và giai đoạn (Phases)
- ✅ Hệ thống xác thực JWT
- ✅ Push notifications (Firebase FCM & Expo)
- ✅ Scheduled jobs tự động kiểm tra deadline
- ✅ Quản lý người dùng và phân quyền
- ✅ Redis caching
- ✅ API Documentation với Swagger

## 🛠️ Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT
- **Push Notifications**: Firebase Admin SDK, Expo Push Notifications
- **Cache**: Redis (via Keyv)
- **Scheduler**: @nestjs/schedule
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, Compression, Argon2

## 📦 Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd be-case-file-management
```

### 2. Cài đặt dependencies

```bash
pnpm install
```

### 3. Cấu hình Environment Variables

Tạo file `.env.development` và `.env.production`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/case_management

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# App
PORT=3000
NODE_ENV=development
```

### 4. Setup Database

```bash
# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Seed database
pnpm db:seed
```

## 🚀 Chạy ứng dụng

### Development Mode
```bash
pnpm start:dev
```

### Production Mode
```bash
pnpm build
pnpm start:prod
```

### Debug Mode
```bash
pnpm start:debug
```

## 📚 API Documentation

Sau khi chạy ứng dụng, truy cập Swagger UI tại:
```
http://localhost:3000/api
```

## 🗄️ Database Commands

```bash
# Generate migration từ schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open Drizzle Studio (Database UI)
pnpm db:studio

# Seed database với test data
pnpm db:seed
```

## 🔐 Authentication

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "phone": "0123456789",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "fullName": "Nguyen Van A",
    "phone": "0123456789",
    "role": "STAFF"
  }
}
```

### Protected Endpoints
Sử dụng Bearer token:
```http
Authorization: Bearer <access_token>
```

## 📱 Push Notifications

### 1. Update FCM Token

```http
PUT /api/v1/users/fcm-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "fcmToken": "your-fcm-token-here"
}
```

### 2. Test Send Notification

```http
POST /api/v1/notifications/send-fcm
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "title": "Test Notification",
  "body": "Đây là tin nhắn test",
  "imageUrl": "https://example.com/image.jpg"
}
```

### 3. Get Notifications

```http
GET /api/v1/notifications?limit=10&offset=0
Authorization: Bearer <token>
```

### 4. Mark as Read

```http
PATCH /api/v1/notifications/:notificationId/read
Authorization: Bearer <token>
```

## 📊 Main Features

### 1. Quản lý Vụ án (Cases)

**Endpoints:**
- `GET /api/v1/cases` - Lấy danh sách vụ án
- `GET /api/v1/cases/:id` - Chi tiết vụ án
- `POST /api/v1/cases` - Tạo vụ án mới
- `PATCH /api/v1/cases/:id` - Cập nhật vụ án
- `DELETE /api/v1/cases/:id` - Xóa vụ án

**Case có các trường quan trọng:**
- `name`: Tên vụ án
- `description`: Mô tả
- `status`: Trạng thái (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- `startDate`, `endDate`: Thời gian thực hiện
- `userId`: Người được giao

### 2. Quản lý Giai đoạn (Phases)

**Endpoints:**
- `GET /api/v1/cases/:caseId/phases` - Lấy phases của case
- `POST /api/v1/cases/:caseId/phases` - Tạo phase mới
- `PATCH /api/v1/cases/phases/:phaseId` - Cập nhật phase
- `DELETE /api/v1/cases/phases/:phaseId` - Xóa phase

**Tính năng đặc biệt:**
- Tự động set `completedAt` khi đánh dấu `isCompleted = true`
- So sánh hoàn thành sớm/trễ so với `endDate`

### 3. Thông báo Tự động

**Scheduled Jobs:**

#### Kiểm tra Cases sắp hết hạn
- Chạy mỗi ngày lúc **9:00 AM**
- Tìm cases có `endDate` trong 3 ngày tới
- Gửi notification cho user

#### Kiểm tra Cases quá hạn
- Chạy mỗi ngày lúc **10:00 AM**
- Tìm cases đã quá `endDate`
- Gửi cảnh báo quá hạn

**Loại thông báo:**
- `CASE_DEADLINE_SOON` - Vụ án sắp hết hạn
- `CASE_OVERDUE` - Vụ án quá hạn
- `CASE_ASSIGNED` - Được giao vụ án mới
- `CASE_STATUS_CHANGED` - Trạng thái thay đổi
- `SYSTEM` - Thông báo hệ thống

## 🔧 Scripts

```bash
# Development
pnpm start:dev          # Chạy dev mode với hot reload

# Build
pnpm build             # Build production

# Production
pnpm start:prod        # Chạy production

# Database
pnpm db:generate       # Generate migrations
pnpm db:migrate        # Run migrations
pnpm db:studio         # Open Drizzle Studio
pnpm db:seed           # Seed database

# Code Quality
pnpm lint              # Run ESLint
pnpm format            # Format code với Prettier

# Testing
pnpm test              # Run unit tests
pnpm test:watch        # Run tests trong watch mode
pnpm test:cov          # Test coverage
pnpm test:e2e          # Run E2E tests
```

## 📁 Cấu trúc Project

```
src/
├── api/                    # API modules
│   ├── auth/              # Authentication
│   ├── cases/             # Cases management
│   ├── notifications/     # Notifications & Schedulers
│   └── users/             # User management
├── cache/                 # Cache module
├── common/                # Common utilities
├── config/                # Configuration
├── constants/             # Constants & Enums
├── database/              # Database schemas & migrations
│   └── schemas/           # Drizzle schemas
├── decorators/            # Custom decorators
├── exceptions/            # Custom exceptions
├── filters/               # Exception filters
├── firebase/              # Firebase Admin SDK
├── guards/                # Auth guards
├── utils/                 # Utility functions
└── main.ts               # Application entry point
```

## 🔒 Security

- **Authentication**: JWT với expire time
- **Password Hashing**: Argon2
- **Helmet**: Security headers
- **CORS**: Configured
- **Compression**: Enabled
- **Validation**: class-validator & class-transformer

## 🌐 Firebase Setup

### Lấy Firebase Credentials

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Vào **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download JSON file
6. Extract các giá trị:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### Enable Firebase Cloud Messaging

1. Trong Firebase Console
2. Vào **Cloud Messaging**
3. Enable API nếu chưa được bật

## 📖 API Examples

### JavaScript/Fetch Example

```javascript
// Login
const login = async (phone, password) => {
  const response = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  });
  return await response.json();
};

// Get Cases
const getCases = async (accessToken) => {
  const response = await fetch('http://localhost:3000/api/v1/cases', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return await response.json();
};

// Create Case
const createCase = async (accessToken, data) => {
  const response = await fetch('http://localhost:3000/api/v1/cases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(data)
  });
  return await response.json();
};
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"0123456789","password":"password123"}'

# Get Cases
curl -X GET http://localhost:3000/api/v1/cases \
  -H "Authorization: Bearer <token>"

# Create Case
curl -X POST http://localhost:3000/api/v1/cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Vụ án mới",
    "description": "Mô tả",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  }'
```

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Kiểm tra PostgreSQL đang chạy
sudo systemctl status postgresql

# Kiểm tra DATABASE_URL trong .env
```

### Firebase Error
```bash
# Kiểm tra FIREBASE_* variables trong .env
# Đảm bảo private key có format đúng với \n
```

### Redis Connection Error
```bash
# Kiểm tra Redis đang chạy
redis-cli ping

# Hoặc comment Redis config nếu không dùng
```

### Migration Error
```bash
# Xóa migrations cũ và generate lại
rm -rf drizzle/meta
pnpm db:generate
pnpm db:migrate
```

## 📝 Development Guidelines

### Code Style
- Sử dụng **ESLint** và **Prettier**
- Run `pnpm lint` trước khi commit
- Run `pnpm format` để format code

### Commit Convention
```
feat: thêm tính năng mới
fix: sửa bug
docs: cập nhật documentation
refactor: refactor code
test: thêm tests
chore: cập nhật dependencies
```

### Database Changes
1. Sửa schema trong `src/database/schemas/`
2. Run `pnpm db:generate` để tạo migration
3. Review migration file trong `drizzle/`
4. Run `pnpm db:migrate` để apply

## 🚢 Deployment

### Production Build

```bash
# Build
pnpm build

# Run
NODE_ENV=production node dist/main --env-file .env.production
```

### Environment Variables cho Production

Đảm bảo set các biến sau:
- `DATABASE_URL` - Production database
- `JWT_SECRET` - Strong secret key
- `FIREBASE_*` - Production Firebase credentials
- `REDIS_URL` - Production Redis (nếu dùng)
- `PORT` - Application port

## 📄 License
AlvisDev

