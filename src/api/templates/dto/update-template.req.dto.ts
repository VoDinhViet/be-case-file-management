import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import {
  BooleanFieldOptional,
  ClassField,
  NumberField,
  StringField,
  StringFieldOptional,
  UUIDFieldOptional,
} from '../../../decorators/field.decorators'; // -------------------------

// -------------------------
// FIELD DTO
// -------------------------
export class FieldDto {
  @UUIDFieldOptional()
  id?: string;

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
    description: 'Cho phép chỉnh sửa khi tạo case',
  })
  isEdit?: boolean;

  @BooleanFieldOptional({
    description: 'Trường có bắt buộc nhập hay không',
  })
  isRequired?: boolean;

  @StringFieldOptional({
    description: 'Placeholder cho trường',
    maxLength: 255,
  })
  placeholder?: string;

  @NumberField({
    description: 'Thứ tự hiển thị của trường trong nhóm',
  })
  index: number;

  @IsOptional()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: String, isArray: true })
  options?: string[];

  @StringFieldOptional({
    description: 'Giá trị mặc định cho trường',
    maxLength: 255,
  })
  defaultValue?: string;

  @StringFieldOptional({
    description: 'Mô tả cho trường',
    maxLength: 255,
  })
  description?: string;
}

// -------------------------
// GROUP DTO
// -------------------------
export class GroupDto {
  @UUIDFieldOptional()
  id?: string;

  @StringField({
    description: 'Tên nhóm',
    maxLength: 100,
  })
  title: string;

  @StringFieldOptional({
    description: 'Mô tả nhóm',
  })
  description?: string;

  @NumberField({
    description: 'Thứ tự hiển thị của nhóm',
  })
  index: number;

  @BooleanFieldOptional({
    description: 'Cho phép chỉnh sửa khi tạo case',
  })
  isEdit?: boolean;

  @ClassField(() => FieldDto, {
    isArray: true,
    description: 'Danh sách các trường trong nhóm',
  })
  fields: FieldDto[];
}

// -------------------------
// TEMPLATE DTO
// -------------------------
export class UpdateTemplateReqDto {
  @StringField({
    description: 'Tên mẫu',
  })
  title: string;

  @StringFieldOptional({
    description: 'Mô tả mẫu',
  })
  description?: string;

  @ClassField(() => GroupDto, {
    isArray: true,
    description: 'Danh sách các nhóm trong mẫu',
  })
  groups: GroupDto[];
}
