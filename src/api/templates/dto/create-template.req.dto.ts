import {
  BooleanFieldOptional,
  ClassField,
  StringField,
  StringFieldOptional,
} from '../../../decorators/field.decorators';

// -------------------------
// Field DTO
// -------------------------
export class CreateFieldDto {
  @StringField({
    description: 'Tên trường',
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

  @StringFieldOptional()
  options?: string; // JSON hoặc CSV

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
  name: string;

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
