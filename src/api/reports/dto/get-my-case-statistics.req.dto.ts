import { DateFieldOptional } from '../../../decorators/field.decorators';

export class GetMyCaseStatisticsReqDto {
  @DateFieldOptional()
  startDate?: Date;

  @DateFieldOptional()
  endDate: string;
}
