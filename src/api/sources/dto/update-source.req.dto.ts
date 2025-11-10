import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SourceStatusEnum } from '../../../database/schemas';
import {
  BooleanFieldOptional,
  ClassFieldOptional,
  DateFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
  UUIDFieldOptional,
} from '../../../decorators/field.decorators';

export class UpdateSourceReqDto {
  @EnumFieldOptional(() => SourceStatusEnum, {
    default: SourceStatusEnum.PENDING,
  })
  status?: SourceStatusEnum; // Trạng thái nguồn tin

  @StringFieldOptional()
  name?: string;

  @StringFieldOptional()
  description?: string;

  @DateFieldOptional()
  startDate?: Date;

  @DateFieldOptional()
  endDate?: Date;

  @StringFieldOptional()
  applicableLaw?: string;

  @StringFieldOptional()
  numberOfDefendants?: string;

  @StringFieldOptional()
  crimeType?: string;

  @UUIDFieldOptional()
  userId?: string; // Cán bộ thụ lý (assignee)

  // --- Nested update for source groups and fields ---
  @ClassFieldOptional(() => UpdateSourceGroupDto, { isArray: true })
  groups?: UpdateSourceGroupDto[];
}

export class UpdateSourceGroupDto {
  @UUIDFieldOptional()
  id?: string; // source_groups.id

  @StringFieldOptional()
  title?: string;

  @StringFieldOptional()
  description?: string;

  @NumberFieldOptional({ int: true })
  index?: number;

  @ClassFieldOptional(() => UpdateSourceFieldDto, { isArray: true })
  fields?: UpdateSourceFieldDto[];
}

export class UpdateSourceFieldDto {
  @UUIDFieldOptional()
  id?: string; // source_fields.id

  @StringFieldOptional()
  fieldLabel?: string;

  @StringFieldOptional()
  fieldValue?: string;

  @StringFieldOptional()
  placeholder?: string;

  @StringFieldOptional()
  defaultValue?: string;

  @StringFieldOptional()
  description?: string;

  @BooleanFieldOptional()
  isRequired?: boolean;

  @BooleanFieldOptional()
  isEditable?: boolean;

  @NumberFieldOptional({ int: true })
  index?: number;

  @IsOptional()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: String, isArray: true })
  options?: string[];
}

