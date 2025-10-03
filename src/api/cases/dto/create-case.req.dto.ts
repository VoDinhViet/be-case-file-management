// dto/create-case.dto.ts
import {
  ClassFieldOptional,
  DateField,
  StringField,
  StringFieldOptional,
  UUIDField,
} from '../../../decorators/field.decorators';

// Có thể enum các loại field nếu muốn
export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  SELECT = 'select',
  TEXTAREA = 'textarea',
}

// DTO cho field động
export class DynamicFieldDto {
  @StringField()
  fieldName: string;

  @StringFieldOptional()
  value?: string;

  // @StringField()
  // fieldType?: FieldType;
}

// DTO chính tạo case
export class CreateCaseDto {
  @UUIDField()
  templateId: string;

  @StringFieldOptional()
  description: string;

  @DateField()
  startDate: string;

  @DateField()
  endDate: string;

  // Người xử lý
  @UUIDField()
  userId: string;

  // Các field động từ form
  @ClassFieldOptional(() => DynamicFieldDto, {
    isArray: true,
    description: 'Các trường động theo template',
  })
  fields?: DynamicFieldDto[];
}
