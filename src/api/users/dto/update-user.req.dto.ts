import { StringFieldOptional } from '../../../decorators/field.decorators';

export class UpdateUserReqDto {
  @StringFieldOptional()
  fullName?: string;

  @StringFieldOptional()
  phone?: string;

  @StringFieldOptional()
  password?: string;
}
