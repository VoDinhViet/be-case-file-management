import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CaseStatusEnum } from '../../../database/schemas';
import {
  BooleanFieldOptional,
  ClassFieldOptional,
  DateFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
  UUIDFieldOptional,
} from '../../../decorators/field.decorators';

export class UpdateCaseReqDto {
  @EnumFieldOptional(() => CaseStatusEnum, { default: CaseStatusEnum.PENDING })
  status?: CaseStatusEnum; // Trạng thái vụ án

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

  // --- Nested update for case groups and fields ---
  @ClassFieldOptional(() => UpdateCaseGroupDto, { isArray: true })
  groups?: UpdateCaseGroupDto[];
}

export class UpdateCaseGroupDto {
  @UUIDFieldOptional()
  id?: string; // case_groups.id

  @StringFieldOptional()
  title?: string;

  @StringFieldOptional()
  description?: string;

  @NumberFieldOptional({ int: true })
  index?: number;

  @ClassFieldOptional(() => UpdateCaseFieldDto, { isArray: true })
  fields?: UpdateCaseFieldDto[];
}

export class UpdateCaseFieldDto {
  @UUIDFieldOptional()
  id?: string; // case_fields.id

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
