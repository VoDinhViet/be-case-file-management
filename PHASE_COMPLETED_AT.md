# Tính năng Ngày hoàn thành Phase

## Tổng quan

Thêm trường `completedAt` vào bảng `case_phases` để lưu ngày giờ thực tế mà phase được hoàn thành.

## Các thay đổi

### 1. Schema Update

**File**: `src/database/schemas/case-phases.schema.ts`

Thêm trường mới:
```typescript
completedAt: timestamp('completed_at'), // ngày hoàn thành thực tế
```

**So sánh với endDate:**
- `endDate`: Ngày kết thúc dự kiến (deadline)
- `completedAt`: Ngày hoàn thành thực tế (tự động set khi isCompleted = true)

### 2. Service Logic Update

**File**: `src/api/cases/cases.service.ts`

**Method `updatePhaseById()` và `updatePhasesByCaseId()`:**

Logic tự động:
- Khi `isCompleted` = `true` (và trước đó là false) → Tự động set `completedAt` = ngày giờ hiện tại
- Khi `isCompleted` = `false` → Xóa `completedAt` (set null)

```typescript
// Tự động set completedAt khi phase được đánh dấu hoàn thành
if (reqDto.isCompleted === true && !phaseFound.isCompleted) {
  updateData.completedAt = new Date();
}
// Xóa completedAt nếu phase được đánh dấu chưa hoàn thành
if (reqDto.isCompleted === false) {
  updateData.completedAt = null;
}
```

### 3. DTO Update

**File**: `src/api/cases/dto/update-phases.req.dto.ts`

Thêm field mới:
```typescript
@DateFieldOptional()
completedAt?: Date;
```

### 4. Migration

**File**: `drizzle/0024_boring_felicia_hardy.sql`

```sql
ALTER TABLE "case_phases" ADD COLUMN "completed_at" timestamp;
```

## API Usage

### Update Phase - Đánh dấu hoàn thành

**Request:**
```http
POST /api/v1/cases/phases/:phaseId
Authorization: Bearer <token>
Content-Type: application/json

{
  "isCompleted": true
}
```

**Response:**
```json
{
  "id": "phase-id",
  "name": "Giai đoạn 1",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-31T00:00:00.000Z",
  "isCompleted": true,
  "completedAt": "2025-01-25T10:30:00.000Z",  // ← Tự động set
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-25T10:30:00.000Z"
}
```

### Update Phase - Đánh dấu chưa hoàn thành

**Request:**
```http
POST /api/v1/cases/phases/:phaseId
Content-Type: application/json

{
  "isCompleted": false
}
```

**Response:**
```json
{
  "id": "phase-id",
  "isCompleted": false,
  "completedAt": null  // ← Tự động xóa
}
```

### Get Phases - Xem thông tin

**Request:**
```http
GET /api/v1/cases/:caseId/phases
```

**Response:**
```json
{
  "data": [
    {
      "id": "phase-1",
      "name": "Giai đoạn 1",
      "order": 1,
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-01-31T00:00:00.000Z",
      "isCompleted": true,
      "completedAt": "2025-01-25T10:30:00.000Z",
      "note": "Hoàn thành sớm 6 ngày"
    },
    {
      "id": "phase-2",
      "name": "Giai đoạn 2",
      "order": 2,
      "startDate": "2025-02-01T00:00:00.000Z",
      "endDate": "2025-02-28T00:00:00.000Z",
      "isCompleted": false,
      "completedAt": null
    }
  ]
}
```

## Use Cases

### 1. Theo dõi tiến độ thực tế

So sánh `completedAt` với `endDate` để biết:
- Hoàn thành sớm: `completedAt < endDate`
- Hoàn thành đúng hạn: `completedAt ≈ endDate`
- Hoàn thành trễ: `completedAt > endDate`

### 2. Báo cáo hiệu suất

```javascript
const daysEarly = differenceInDays(phase.endDate, phase.completedAt);
if (daysEarly > 0) {
  console.log(`Hoàn thành sớm ${daysEarly} ngày`);
} else if (daysEarly < 0) {
  console.log(`Hoàn thành trễ ${Math.abs(daysEarly)} ngày`);
}
```

### 3. Tính toán thời gian thực hiện

```javascript
const actualDuration = differenceInDays(
  phase.completedAt,
  phase.startDate
);
console.log(`Thời gian thực hiện: ${actualDuration} ngày`);
```

## Frontend Integration

### Hiển thị trạng thái

```typescript
interface PhaseStatus {
  label: string;
  color: string;
  icon: string;
}

function getPhaseStatus(phase: Phase): PhaseStatus {
  if (!phase.isCompleted) {
    return {
      label: 'Đang thực hiện',
      color: 'blue',
      icon: 'clock'
    };
  }

  if (!phase.completedAt) {
    return {
      label: 'Hoàn thành',
      color: 'green',
      icon: 'check'
    };
  }

  const daysEarly = differenceInDays(
    new Date(phase.endDate),
    new Date(phase.completedAt)
  );

  if (daysEarly > 0) {
    return {
      label: `Hoàn thành sớm ${daysEarly} ngày`,
      color: 'green',
      icon: 'check-circle'
    };
  } else if (daysEarly < 0) {
    return {
      label: `Hoàn thành trễ ${Math.abs(daysEarly)} ngày`,
      color: 'orange',
      icon: 'alert-circle'
    };
  } else {
    return {
      label: 'Hoàn thành đúng hạn',
      color: 'green',
      icon: 'check-circle'
    };
  }
}
```

### Component hiển thị

```tsx
function PhaseCard({ phase }: { phase: Phase }) {
  const status = getPhaseStatus(phase);
  
  return (
    <Card>
      <h3>{phase.name}</h3>
      <div className="dates">
        <div>
          <label>Ngày bắt đầu:</label>
          <span>{formatDate(phase.startDate)}</span>
        </div>
        <div>
          <label>Ngày kết thúc dự kiến:</label>
          <span>{formatDate(phase.endDate)}</span>
        </div>
        {phase.completedAt && (
          <div>
            <label>Ngày hoàn thành thực tế:</label>
            <span className={status.color}>
              {formatDate(phase.completedAt)}
            </span>
          </div>
        )}
      </div>
      <Badge color={status.color}>
        <Icon name={status.icon} />
        {status.label}
      </Badge>
    </Card>
  );
}
```

## Notes

1. **Tự động set**: `completedAt` được set TỰ ĐỘNG khi đánh dấu `isCompleted = true`
2. **Không thể edit manual**: Nếu muốn thay đổi ngày hoàn thành, phải:
   - Set `isCompleted = false` (xóa completedAt)
   - Sau đó set `isCompleted = true` lại (tạo completedAt mới)
3. **Nullable**: `completedAt` có thể null (phase chưa hoàn thành)
4. **Timezone**: Server sử dụng timezone local, cần cấu hình nếu deploy

## Migration Status

✅ Schema updated: `case_phases` table
✅ Migration generated: `0024_boring_felicia_hardy.sql`
✅ Migration applied successfully
✅ Service logic updated
✅ DTO updated

## Future Improvements

- [ ] Thêm validation: không cho phép completedAt < startDate
- [ ] Thêm history: lưu lịch sử các lần hoàn thành/mở lại
- [ ] Thêm user: lưu ai là người đánh dấu hoàn thành
- [ ] Analytics: Báo cáo thống kê hiệu suất phases
- [ ] Notifications: Gửi thông báo khi phase hoàn thành


