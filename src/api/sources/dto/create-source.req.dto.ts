import { SourceStatusEnum } from '../../../database/schemas';
import {
  BooleanFieldOptional,
  ClassFieldOptional,
  EnumFieldOptional,
  StringField,
  StringFieldOptional,
  UUIDField,
} from '../../../decorators/field.decorators';

// DTO cho field động trong group
export class DynamicFieldDto {
  @UUIDField()
  groupId: string; // ✅ ID của group chứa field này

  @StringField({
    description: 'Nhãn hiển thị cho trường',
    maxLength: 100,
  })
  fieldLabel: string;

  @StringField({
    description: 'Tên kỹ thuật (system name)',
    maxLength: 100,
  })
  fieldName: string;

  @StringField({
    description: 'Loại trường (string, number, boolean, date, etc.)',
    maxLength: 50,
  })
  fieldType: string;

  @BooleanFieldOptional({
    description: 'Trường bị chặn là không được edit khi tạo source',
  })
  isEdit?: boolean;

  @BooleanFieldOptional()
  isRequired?: boolean;

  @StringFieldOptional({
    description: 'Placeholder cho trường',
    maxLength: 255,
  })
  placeholder?: string;

  @StringFieldOptional({
    description: 'Giá trị mặc định cho trường',
    maxLength: 255,
  })
  defaultValue?: string;

  @StringFieldOptional({
    description: 'Mô tả trường',
    maxLength: 100,
  })
  description?: string;

  @StringFieldOptional()
  value?: string;
}

// DTO chính để tạo nguồn tin
export class CreateSourceDto {
  @StringField()
  templateId!: string;

  @StringField()
  applicableLaw: string; // Điều luật áp dụng

  @StringField()
  numberOfDefendants: string; // Số bị cáo

  @StringField()
  crimeType: string; // Loại tội phạm

  @StringField()
  name: string; // Tên nguồn tin

  @EnumFieldOptional(() => SourceStatusEnum, {
    default: SourceStatusEnum.PENDING,
  })
  status?: SourceStatusEnum; // Trạng thái nguồn tin

  @StringFieldOptional()
  description?: string; // Mô tả nguồn tin

  @UUIDField()
  userId: string; // Người tạo nguồn tin

  @ClassFieldOptional(() => DynamicFieldDto, {
    isArray: true,
    description: 'Các trường động theo template, chia theo group',
  })
  fields?: DynamicFieldDto[];
}

