import { CaseStatusEnum } from '../../../database/schemas';
import {
  ClassFieldOptional,
  DateField,
  DateFieldOptional,
  EnumFieldOptional,
  StringField,
  StringFieldOptional,
  UUIDField,
} from '../../../decorators/field.decorators';

// DTO cho field động trong group
export class DynamicFieldDto {
  @UUIDField()
  groupId: string; // ✅ ID của group chứa field này

  @StringField()
  fieldName: string;

  @StringFieldOptional()
  value?: string;
}

// DTO chính để tạo vụ án
export class CreateCaseDto {
  @StringField()
  templateId!: string;

  @StringField()
  applicableLaw: string; // Điều luật áp dụng

  @StringField()
  numberOfDefendants: string; // Số bị cáo

  @StringField()
  crimeType: string; // Loại tội phạm

  @StringField()
  name: string; // Tên vụ án

  @EnumFieldOptional(() => CaseStatusEnum, { default: CaseStatusEnum.PENDING })
  status?: CaseStatusEnum; // Trạng thái vụ án

  @StringFieldOptional()
  description?: string; // Mô tả vụ án

  @DateField()
  startDate: Date; // Ngày bắt đầu vụ án

  @DateFieldOptional()
  endDate?: Date; // Ngày kết thúc vụ án

  @UUIDField()
  userId: string; // Người tạo vụ án

  @ClassFieldOptional(() => DynamicFieldDto, {
    isArray: true,
    description: 'Các trường động theo template, chia theo group',
  })
  fields?: DynamicFieldDto[];
}
