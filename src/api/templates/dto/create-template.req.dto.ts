import {
  BooleanFieldOptional,
  ClassField,
  StringField,
  StringFieldOptional,
} from '../../../decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// -------------------------
// Field DTO
// -------------------------
export class CreateFieldDto {
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

  @BooleanFieldOptional()
  isRequired?: boolean;

  @StringFieldOptional({
    description: 'Placeholder cho trường',
    maxLength: 255,
  })
  placeholder?: string;

  @IsOptional()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: String, isArray: true })
  options?: string[]; // array of string

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
}

// -------------------------
// Group DTO
// -------------------------
export class CreateGroupDto {
  @StringField({
    description: 'Tên nhóm',
    maxLength: 100,
  })
  title: string;

  @StringFieldOptional({
    description: 'Mô tả nhóm',
  })
  description?: string;

  @ClassField(() => CreateFieldDto, {
    isArray: true,
    description: 'Danh sách các trường trong nhóm',
  })
  fields: CreateFieldDto[];
}

export class CreateTemplateReqDto {
  @StringField({
    description: 'Tên mẫu',
  })
  title: string;

  @StringFieldOptional({
    description: 'Mô tả mẫu',
  })
  description?: string;

  @ClassField(() => CreateGroupDto, {
    isArray: true,
    description: 'Danh sách các nhóm trong mẫu',
  })
  groups: CreateGroupDto[];
}
