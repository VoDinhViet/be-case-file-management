import {
  BooleanFieldOptional,
  ClassFieldOptional,
  DateFieldOptional,
  StringField,
  StringFieldOptional,
} from '../../../decorators/field.decorators';

export class TaskItemResDto {
  @StringField()
  name: string;
}

export class UpdatePhasesReqDto {
  @StringFieldOptional()
  name: string;

  @StringFieldOptional()
  description?: string;

  @StringFieldOptional()
  order: number;

  @DateFieldOptional()
  startDate: Date;

  @DateFieldOptional()
  endDate: Date;

  @StringFieldOptional()
  note?: string;

  @BooleanFieldOptional()
  isCompleted?: boolean;

  // Danh sách tasks trong giai đoạn
  @ClassFieldOptional(() => TaskItemResDto, { isArray: true })
  tasks: TaskItemResDto[];
}
