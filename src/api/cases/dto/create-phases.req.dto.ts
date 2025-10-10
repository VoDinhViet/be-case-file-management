import {
  BooleanField,
  ClassField,
  DateField,
  StringField,
  StringFieldOptional,
} from '../../../decorators/field.decorators';

export class TaskItemResDto {
  @StringField()
  name: string;
}

export class CreatePhasesReqDto {
  @StringField()
  name: string;

  @StringFieldOptional()
  description?: string;

  @StringField()
  order: number;

  @DateField()
  startDate: Date;

  @DateField()
  endDate: Date;

  @StringFieldOptional()
  note?: string;

  @BooleanField()
  isCompleted?: boolean;

  // Danh sách tasks trong giai đoạn
  @ClassField(() => TaskItemResDto, { isArray: true })
  tasks: TaskItemResDto[];
}
