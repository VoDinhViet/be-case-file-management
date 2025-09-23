import {
  BooleanFieldOptional,
  ClassFieldOptional,
  StringField,
  StringFieldOptional,
} from '../../../decorators/field.decorators';

export class CreateTemplateFieldDto {
  @StringField()
  fieldName: string;

  @StringField({
    example: 'text',
    description: 'Loại field: text | textarea | number | boolean',
  })
  fieldType: string;

  @BooleanFieldOptional()
  isRequired?: boolean;
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

  @ClassFieldOptional(() => CreateTemplateFieldDto, {
    isArray: true,
    description: 'Danh sách các trường trong mẫu',
  })
  fields?: CreateTemplateFieldDto[];
}
